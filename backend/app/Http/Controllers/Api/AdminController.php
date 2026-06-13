<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminLog;
use App\Models\Item;
use App\Models\Notification;
use App\Models\User;
use App\Services\EmailService;
use App\Services\ItemResolutionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function __construct(
        private readonly EmailService $emailService,
        private readonly ItemResolutionService $itemResolutionService
    )
    {
    }

    public function stats(): JsonResponse
    {
        $weekly = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $weekly[] = [
                'date' => $date->format('D'),
                'count' => Item::query()->whereDate('created_at', $date)->count(),
            ];
        }

        $statusBreakdown = [
            Item::STATUS_AWAITING_APPROVAL => Item::query()->where('status', Item::STATUS_AWAITING_APPROVAL)->count(),
            Item::STATUS_ACTIVE => Item::query()->where('status', Item::STATUS_ACTIVE)->count(),
            Item::STATUS_CLAIM_IN_PROGRESS => Item::query()->where('status', Item::STATUS_CLAIM_IN_PROGRESS)->count(),
            Item::STATUS_RESOLVED => Item::query()->where('status', Item::STATUS_RESOLVED)->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'total_items' => Item::query()->count(),
                'pending_items' => $statusBreakdown[Item::STATUS_AWAITING_APPROVAL],
                'unresolved_items' => Item::query()->whereNotIn('status', [Item::STATUS_RESOLVED])->count(),
                'returned_items' => $statusBreakdown[Item::STATUS_RESOLVED],
                'resolved_items' => $statusBreakdown[Item::STATUS_RESOLVED],
                'claimed_items' => $statusBreakdown[Item::STATUS_CLAIM_IN_PROGRESS],
                'active_items' => $statusBreakdown[Item::STATUS_ACTIVE],
                'total_users' => User::query()->where('role', 'student')->count(),
                'items_this_month' => Item::query()
                    ->whereYear('created_at', now()->year)
                    ->whereMonth('created_at', now()->month)
                    ->count(),
                'reports_this_week' => $weekly,
                'status_breakdown' => $statusBreakdown,
                'recent_activity' => AdminLog::query()
                    ->with('admin:id,name')
                    ->latest()
                    ->limit(5)
                    ->get(),
                'admin_activity' => [
                    'items_approved' => AdminLog::query()
                        ->where('admin_id', auth()->id())
                        ->where('action', 'approved')
                        ->count(),
                    'items_rejected' => AdminLog::query()
                        ->where('admin_id', auth()->id())
                        ->where('action', 'rejected')
                        ->count(),
                    'users_reviewed' => AdminLog::query()
                        ->where('admin_id', auth()->id())
                        ->where('target_type', 'user')
                        ->count(),
                ],
            ],
        ]);
    }

    public function items(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'type' => ['nullable', Rule::in(['lost', 'found'])],
            'status' => ['nullable', Rule::in(Item::STATUSES)],
            'category' => ['nullable', 'string'],
            'location' => ['nullable', 'string'],
            'q' => ['nullable', 'string'],
            'search' => ['nullable', 'string'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'approved' => ['nullable', Rule::in(['true', 'false', '1', '0', 1, 0, true, false])],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = Item::withTrashed()
            ->with([
                'poster:id,name,email,student_id',
                'category:id,name',
                'images',
                'tags',
            ])
            ->latest();

        $query
            ->when($filters['type'] ?? null, fn ($query, $type) => $query->where('type', $type))
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($filters['user_id'] ?? null, fn ($query, $userId) => $query->where('posted_by', $userId))
            ->when($request->has('approved'), fn ($query) => $query->where('is_approved', filter_var($request->query('approved'), FILTER_VALIDATE_BOOLEAN)))
            ->when($filters['category'] ?? null, fn ($query, $category) => $query->whereHas('category', fn ($categoryQuery) => $categoryQuery->where('name', $category)))
            ->when($filters['location'] ?? null, fn ($query, $location) => $query->where('location', 'like', "%{$location}%"))
            ->when($filters['start_date'] ?? null, fn ($query, $startDate) => $query->whereDate('created_at', '>=', $startDate))
            ->when($filters['end_date'] ?? null, fn ($query, $endDate) => $query->whereDate('created_at', '<=', $endDate))
            ->when($filters['search'] ?? $filters['q'] ?? null, function ($query, $search) {
                $search = trim($search);
                $legacyReferencePattern = null;

                if (preg_match('/^(LF|FF)-0*(\d+)$/i', $search, $matches)) {
                    $legacyReferencePattern = strtoupper($matches[1]).'-%-'.str_pad($matches[2], 4, '0', STR_PAD_LEFT);
                }

                $query->where(function ($searchQuery) use ($search, $legacyReferencePattern) {
                    $searchQuery
                        ->where('title', 'like', "%{$search}%")
                        ->orWhere('display_id', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhereHas('poster', function ($posterQuery) use ($search) {
                            $posterQuery
                                ->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%")
                                ->orWhere('student_id', 'like', "%{$search}%");
                        });

                    if ($legacyReferencePattern) {
                        $searchQuery->orWhere('display_id', 'like', $legacyReferencePattern);
                    }
                });
            });

        $items = $query->paginate($filters['per_page'] ?? 12);

        return response()->json([
            'success' => true,
            'data' => [
                'data' => $items->items(),
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'total' => $items->total(),
                'per_page' => $items->perPage(),
            ],
        ]);
    }

    public function pendingItems(): JsonResponse
    {
        $items = Item::query()
            ->with([
                'poster:id,name,student_id',
                'category:id,name',
            ])
            ->where('status', Item::STATUS_AWAITING_APPROVAL)
            ->latest()
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }

    public function updateItem(Request $request, Item $item): JsonResponse
    {
        // Removed from admin controls — owner-only action
        if ($request->has('status') && in_array($request->input('status'), [Item::STATUS_RESOLVED, Item::STATUS_CLAIM_IN_PROGRESS], true)) {
            return response()->json([
                'success' => false,
                'message' => 'This action is reserved for the item owner'
            ], 403);
        }

        $data = $request->validate([
            'status' => ['nullable', Rule::in(Item::STATUSES)],
            'is_approved' => ['nullable', 'boolean'],
            'admin_note' => ['nullable', 'string'],
        ]);

        $wasApproved = $item->is_approved;
        $previousStatus = $item->status;

        if (array_key_exists('is_approved', $data)) {
            $data['is_approved'] = filter_var($data['is_approved'], FILTER_VALIDATE_BOOLEAN);

            if ($data['is_approved']) {
                $data['status'] = Item::STATUS_ACTIVE;
            } elseif (! array_key_exists('status', $data)) {
                $data['status'] = Item::STATUS_AWAITING_APPROVAL;
            }
        }

        if (array_key_exists('status', $data)) {
            if ($data['status'] === Item::STATUS_AWAITING_APPROVAL) {
                $data['is_approved'] = false;
            } elseif (in_array($data['status'], Item::PUBLIC_STATUSES, true)) {
                $data['is_approved'] = true;
            }
        }

        if (($data['status'] ?? null) === Item::STATUS_RESOLVED && $previousStatus === Item::STATUS_CLAIM_IN_PROGRESS) {
            $item = $this->itemResolutionService->resolve($item);
            if (array_key_exists('admin_note', $data)) {
                $item->update(['admin_note' => $data['admin_note']]);
            }
        } else {
            $item->fill($data)->save();
        }

        if (! $wasApproved && $item->is_approved) {
            Notification::query()->create([
                'user_id' => $item->posted_by,
                'type' => 'approved',
                'title' => 'Report Approved',
                'message' => 'Your report "'.$item->title.'" has been approved and is now visible to others.',
                'is_read' => false,
                'related_item_id' => $item->id,
            ]);

            $this->emailService->sendItemApproved($item->poster, $item);
        }

        $this->logAdminAction(
            $request,
            $this->adminActionForItemUpdate($data),
            'item',
            $item->id,
            $data['admin_note'] ?? null
        );

        return response()->json([
            'success' => true,
            'data' => $item->fresh()->load(['poster', 'category', 'images', 'tags']),
        ]);
    }

    public function itemDetail(Item $item): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $item->load([
                'poster:id,name,email,student_id,department,phone,bio,avatar_url,created_at',
                'category:id,name',
                'images',
                'tags',
            ]),
        ]);
    }

    public function deleteItem(Request $request, Item $item): JsonResponse
    {
        $itemId = $item->id;
        $item->delete();

        $this->logAdminAction($request, 'deleted', 'item', $itemId);

        return response()->json(['success' => true]);
    }

    private function logAdminAction(Request $request, string $action, string $targetType, int|string $targetId, ?string $note = null): void
    {
        AdminLog::query()->create([
            'admin_id' => $request->user()->id,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'note' => $note,
        ]);
    }

    private function adminActionForItemUpdate(array $data): string
    {
        if (array_key_exists('is_approved', $data)) {
            return filter_var($data['is_approved'], FILTER_VALIDATE_BOOLEAN) ? 'approved' : 'rejected';
        }

        return 'status_changed';
    }

    public function users(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string'],
            'role' => ['nullable', 'string', Rule::in(['admin', 'student'])],
            'status' => ['nullable', 'string', Rule::in(['active', 'banned', 'unverified'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'sort' => ['nullable', 'string', Rule::in(['name', 'student_id', 'email', 'created_at', 'post_count', 'status'])],
            'direction' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
        ]);

        $query = User::query()->withCount('items as post_count');

        if (!empty($filters['q'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'like', "%{$filters['q']}%")
                  ->orWhere('email', 'like', "%{$filters['q']}%")
                  ->orWhere('student_id', 'like', "%{$filters['q']}%");
            });
        }

        if (!empty($filters['role'])) {
            $query->where('role', $filters['role']);
        }

        if (!empty($filters['status'])) {
            if ($filters['status'] === 'banned') {
                $query->where('is_banned', true);
            } elseif ($filters['status'] === 'unverified') {
                $query->whereNull('email_verified_at');
            } else {
                $query->where('is_banned', false)->where('is_active', true);
            }
        }

        $sort = $filters['sort'] ?? 'created_at';
        $direction = $filters['direction'] ?? 'desc';
        
        if ($sort === 'status') {
             $query->orderBy('is_banned', $direction === 'asc' ? 'desc' : 'asc');
        } else {
             $query->orderBy($sort, $direction);
        }

        $users = $query->paginate($filters['per_page'] ?? 15);
        
        $stats = [
            'total' => User::query()->count(),
            'active' => User::query()->where('is_banned', false)->where('is_active', true)->count(),
            'suspended' => User::query()->where('is_banned', true)->count(),
            'unverified' => User::query()->whereNull('email_verified_at')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $users,
            'stats' => $stats
        ]);
    }

    public function userDetail(User $user): JsonResponse
    {
        $activityLogs = AdminLog::query()
            ->where(function ($query) use ($user) {
                $query->where('target_type', 'user')->where('target_id', $user->id);
            })
            ->orWhere(function ($query) use ($user) {
                $query->where('target_type', 'item')->whereIn('target_id', $user->items()->select('id'));
            })
            ->with('admin:id,name')
            ->latest()
            ->get();

        $userArray = $user->load([
            'items' => fn ($query) => $query->latest(),
            'claims' => fn ($query) => $query->latest()->with('item:id,display_id,title,type,status,created_at')
        ])->toArray();
        
        $userArray['activity_logs'] = $activityLogs;

        return response()->json([
            'success' => true,
            'data' => $userArray,
        ]);
    }

    public function exportUsers(Request $request)
    {
        $user = $this->authenticateTokenFromQuery($request);
        if (!$user || $user->role !== 'admin') {
            abort(403, 'Unauthorized');
        }

        $query = User::query()->withCount('items as post_count');

        if ($q = $request->query('q')) {
            $query->where(function ($sq) use ($q) {
                $sq->where('name', 'like', "%{$q}%")
                   ->orWhere('email', 'like', "%{$q}%")
                   ->orWhere('student_id', 'like', "%{$q}%");
            });
        }
        if ($role = $request->query('role')) {
            $query->where('role', $role);
        }
        if ($status = $request->query('status')) {
            if ($status === 'banned') $query->where('is_banned', true);
            elseif ($status === 'unverified') $query->whereNull('email_verified_at');
            else $query->where('is_banned', false)->where('is_active', true);
        }

        $users = $query->get();

        $callback = function () use ($users) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['ID', 'Name', 'Email', 'Student ID', 'Role', 'Status', 'Joined Date', 'Post Count']);
            foreach ($users as $u) {
                $status = $u->is_banned ? 'Suspended' : ($u->email_verified_at !== null ? 'Active' : 'Unverified');
                fputcsv($file, [
                    $u->id, $u->name, $u->email, $u->student_id,
                    $u->role, $status,
                    $u->created_at ? $u->created_at->format('Y-m-d H:i:s') : '',
                    $u->post_count,
                ]);
            }
            fclose($file);
        };

        return response()->streamDownload($callback, 'users_export_' . now()->format('Y_m_d_His') . '.csv', [
            'Content-Type' => 'text/csv',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
        ]);
    }

    public function exportLogs(Request $request)
    {
        $user = $this->authenticateTokenFromQuery($request);
        if (!$user || $user->role !== 'admin') {
            abort(403, 'Unauthorized');
        }

        $query = AdminLog::query()->with('admin:id,name,student_id')->latest();

        if ($action = $request->query('action')) {
            $query->where('action', $action);
        }
        if ($targetType = $request->query('target_type')) {
            $query->where('target_type', $targetType);
        }
        if ($targetId = $request->query('target_id')) {
            $query->where('target_id', $targetId);
        }
        if ($q = $request->query('q')) {
            $query->where(function ($sq) use ($q) {
                $sq->where('action', 'like', "%{$q}%")
                   ->orWhere('note', 'like', "%{$q}%");
            });
        }

        $logs = $query->get();

        $callback = function () use ($logs) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Timestamp', 'Admin Name', 'Admin Student ID', 'Action', 'Target Type', 'Target ID', 'Notes']);
            foreach ($logs as $log) {
                fputcsv($file, [
                    $log->created_at ? $log->created_at->format('Y-m-d H:i:s') : '',
                    $log->admin->name ?? 'Unknown',
                    $log->admin->student_id ?? '',
                    $log->action,
                    $log->target_type,
                    $log->target_id,
                    $log->note ?? '',
                ]);
            }
            fclose($file);
        };

        return response()->streamDownload($callback, 'activity_log_' . now()->format('Y_m_d_His') . '.csv', [
            'Content-Type' => 'text/csv',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
        ]);
    }

    public function exportItems(Request $request)
    {
        $user = $this->authenticateTokenFromQuery($request);
        if (!$user || $user->role !== 'admin') {
            abort(403, 'Unauthorized');
        }

        $query = Item::withTrashed()->with(['poster:id,name,email,student_id', 'category:id,name'])->latest();

        if ($type = $request->query('type')) $query->where('type', $type);
        if ($status = $request->query('status')) $query->where('status', $status);
        if ($category = $request->query('category')) {
            $query->whereHas('category', fn ($q) => $q->where('name', $category));
        }
        if ($start = $request->query('start_date')) $query->whereDate('created_at', '>=', $start);
        if ($end = $request->query('end_date')) $query->whereDate('created_at', '<=', $end);
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('display_id', 'like', "%{$search}%")
                  ->orWhereHas('poster', fn ($sq) => $sq->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%"));
            });
        }

        $items = $query->get();

        $callback = function () use ($items) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Post ID', 'Display ID', 'Type', 'Title', 'Category', 'Status', 'Reporter Name', 'Reporter Email', 'Reporter Student ID', 'Location', 'Date Posted', 'Lost/Found Date']);
            foreach ($items as $item) {
                fputcsv($file, [
                    $item->id,
                    $item->display_id ?? '',
                    $item->type,
                    $item->title,
                    $item->category->name ?? '',
                    $item->status,
                    $item->poster->name ?? '',
                    $item->poster->email ?? '',
                    $item->poster->student_id ?? '',
                    $item->location ?? '',
                    $item->created_at ? $item->created_at->format('Y-m-d H:i:s') : '',
                    $item->lost_found_date ? $item->lost_found_date->format('Y-m-d') : '',
                ]);
            }
            fclose($file);
        };

        return response()->streamDownload($callback, 'posts_export_' . now()->format('Y_m_d_His') . '.csv', [
            'Content-Type' => 'text/csv',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
        ]);
    }

    private function authenticateTokenFromQuery(Request $request): ?User
    {
        $token = $request->query('token');
        if (!$token) return null;

        $model = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
        if (!$model) return null;

        return $model->tokenable instanceof User ? $model->tokenable : null;
    }

    public function banUser(Request $request, User $user): JsonResponse
    {
        if ($user->role === 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Admins cannot be banned.',
            ], 403);
        }

        $user->forceFill(['is_banned' => true])->save();
        $this->logAdminAction($request, 'user_banned', 'user', $user->id);

        return response()->json(['success' => true]);
    }

    public function unbanUser(Request $request, User $user): JsonResponse
    {
        $user->forceFill(['is_banned' => false])->save();
        $this->logAdminAction($request, 'user_unbanned', 'user', $user->id);

        return response()->json(['success' => true]);
    }

    public function logs(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string'],
            'action' => ['nullable', 'string'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = AdminLog::query()->with('admin:id,name,student_id')->latest();

        if (!empty($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        if (!empty($filters['q'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('action', 'like', "%{$filters['q']}%")
                  ->orWhere('note', 'like', "%{$filters['q']}%");
            });
        }

        $logs = $query->paginate($filters['per_page'] ?? 15);

        return response()->json([
            'success' => true,
            'data' => $logs
        ]);
    }
}
