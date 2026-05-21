<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\ItemImage;
use App\Models\ItemTag;
use App\Models\Notification;
use App\Models\User;
use App\Services\ItemResolutionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ItemController extends Controller
{
    public function __construct(private readonly ItemResolutionService $itemResolutionService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $type = $request->query('type');
        $status = $request->query('status');
        $category = $request->query('category');
        $location = $request->query('location');
        $search = $request->query('q');
        $perPage = max(1, min((int) $request->query('per_page', 12), 100));

        $query = Item::query()
            ->with([
                'poster:id,name,student_id',
                'category:id,name',
                'images',
                'tags',
            ]);

        if ($request->user()->role !== 'admin') {
            $query
                ->where('is_approved', true)
                ->whereIn('status', Item::PUBLIC_STATUSES);
        }

        if ($type && in_array($type, ['lost', 'found'], true)) {
            $query->where('type', $type);
        }

        if ($status && in_array($status, Item::STATUSES, true)) {
            $query->where('status', $status);
        }

        if ($category) {
            $query->whereHas('category', function ($categoryQuery) use ($category) {
                $categoryQuery->where('name', 'like', "%{$category}%");
            });
        }

        if ($location) {
            $query->where('location', 'like', "%{$location}%");
        }

        if ($search) {
            $query->where(function ($searchQuery) use ($search) {
                $searchQuery
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%");
            });
        }

        $items = $query->latest()->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }

    public function myItems(Request $request): JsonResponse
    {
        $type = $request->query('type');
        $perPage = max(1, min((int) $request->query('per_page', 12), 100));

        $query = Item::query()
            ->with([
                'poster:id,name,student_id',
                'category:id,name',
                'images',
                'tags',
            ])
            ->where('posted_by', $request->user()->id);

        if ($type && in_array($type, ['lost', 'found'], true)) {
            $query->where('type', $type);
        }

        $items = $query->latest()->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }

    public function show(Request $request, Item $item): JsonResponse
    {
        if (
            (! $item->is_approved || ! in_array($item->status, Item::PUBLIC_STATUSES, true))
            && $request->user()->role !== 'admin'
            && $item->posted_by !== $request->user()->id
        ) {
            abort(404);
        }

        $item->increment('view_count');

        return response()->json([
            'success' => true,
            'data' => $item->fresh()->load([
                'poster',
                'category',
                'images',
                'tags',
                'claims.claimer',
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['lost', 'found'])],
            'title' => ['required', 'string', 'max:150'],
            'description' => ['required', 'string', 'min:20'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'color' => ['nullable', 'string', 'max:50'],
            'brand_model' => ['nullable', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:255'],
            'specific_spot' => ['nullable', 'string', 'max:200'],
            'lost_found_date' => ['required', 'date', 'before_or_equal:today'],
            'lost_found_time' => ['nullable', 'date_format:H:i'],
            'current_location' => ['nullable', 'string', 'max:200'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['required', 'string', 'max:50'],
            'images' => ['nullable', 'array'],
            'images.*' => ['nullable', 'image', 'max:5120'],
        ]);

        $user = $request->user();

        $item = DB::transaction(function () use ($data, $user) {
            $tags = $data['tags'] ?? [];
            $images = $data['images'] ?? [];
            unset($data['tags']);
            unset($data['images']);

            $item = Item::query()->create([
                ...$data,
                'posted_by' => $user->id,
                'is_approved' => false,
                'view_count' => 0,
                'status' => Item::STATUS_AWAITING_APPROVAL,
                'reference_id' => Item::generateReferenceId($data['type']),
            ]);

            $user->increment($item->type === 'lost' ? 'items_lost' : 'items_found');

            foreach (array_unique($tags) as $tag) {
                ItemTag::query()->create([
                    'item_id' => $item->id,
                    'tag' => $tag,
                ]);
            }

            foreach ($images as $index => $file) {
                if (! $file) {
                    continue;
                }

                $path = $file->store('items', 'public');
                ItemImage::query()->create([
                    'item_id' => $item->id,
                    'image_url' => 'storage/'.$path,
                    'is_primary' => $index === 0,
                ]);
            }

            $admin = User::query()->where('role', 'admin')->first();
            if ($admin) {
                Notification::query()->create([
                    'user_id' => $admin->id,
                    'type' => 'new_report',
                    'title' => 'New Report Needs Approval',
                    'message' => $user->name.' submitted a new '.$item->type.' report: "'.$item->title.'"',
                    'is_read' => false,
                    'related_item_id' => $item->id,
                ]);
            }

            return $item;
        });

        return response()->json([
            'success' => true,
            'data' => $item->load(['poster', 'category', 'images', 'tags']),
            'message' => 'Your report has been submitted and is pending admin approval. You will be notified once it is approved and visible to others.',
        ], 201);
    }

    public function update(Request $request, Item $item): JsonResponse
    {
        $this->authorizeItemMutation($request, $item);

        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:150'],
            'description' => ['sometimes', 'required', 'string'],
            'status' => ['sometimes', 'required', Rule::in(Item::STATUSES)],
            'category_id' => ['sometimes', 'nullable', 'exists:categories,id'],
            'color' => ['sometimes', 'nullable', 'string', 'max:50'],
            'brand_model' => ['sometimes', 'nullable', 'string', 'max:100'],
            'location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'specific_spot' => ['sometimes', 'nullable', 'string', 'max:200'],
            'lost_found_date' => ['sometimes', 'required', 'date', 'before_or_equal:today'],
            'lost_found_time' => ['sometimes', 'nullable', 'date_format:H:i'],
            'current_location' => ['sometimes', 'nullable', 'string', 'max:200'],
            'tags' => ['sometimes', 'nullable', 'array'],
            'tags.*' => ['required', 'string', 'max:50'],
        ]);

        if (array_key_exists('status', $data) && $request->user()->role !== 'admin') {
            if ($data['status'] !== Item::STATUS_RESOLVED) {
                abort(403, 'Only admins can set this report status.');
            }

            if ($item->status !== Item::STATUS_CLAIM_IN_PROGRESS) {
                abort(422, 'Only reports with a claim in progress can be marked resolved.');
            }
        }

        if (($data['status'] ?? null) === Item::STATUS_RESOLVED) {
            if ((int) $item->posted_by !== (int) $request->user()->id) {
                abort(403, 'Only the reporter can mark this item as resolved.');
            }

            $resolvedItem = $this->itemResolutionService->resolve($item);

            return response()->json([
                'success' => true,
                'data' => $resolvedItem->load(['poster', 'category', 'images', 'tags', 'claims.claimer']),
                'message' => 'Report marked resolved.',
            ]);
        }

        $tags = $data['tags'] ?? null;
        unset($data['tags']);

        $item->update($data);

        if (is_array($tags)) {
            $item->tags()->delete();
            foreach (array_unique($tags) as $tag) {
                ItemTag::query()->create([
                    'item_id' => $item->id,
                    'tag' => $tag,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $item->fresh()->load(['poster', 'category', 'images', 'tags']),
        ]);
    }

    public function destroy(Request $request, Item $item): JsonResponse
    {
        $this->authorizeItemMutation($request, $item);

        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Report deleted.',
        ]);
    }

    private function authorizeItemMutation(Request $request, Item $item): void
    {
        if ((int) $item->posted_by !== (int) $request->user()->id && $request->user()->role !== 'admin') {
            abort(403, 'You are not authorized to modify this report.');
        }
    }

}
