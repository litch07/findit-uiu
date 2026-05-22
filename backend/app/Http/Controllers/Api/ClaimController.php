<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Claim;
use App\Models\Conversation;
use App\Models\Item;
use App\Models\Message;
use App\Models\Notification;
use App\Models\User;
use App\Services\EmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ClaimController extends Controller
{
    public function __construct(private readonly EmailService $emailService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $claims = Claim::query()
            ->with([
                'item.poster',
                'item.category',
                'claimer',
            ])
            ->where('claimer_id', $user->id)
            ->orWhereHas('item', fn ($query) => $query->where('posted_by', $user->id))
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $claims,
        ]);
    }

    public function myClaims(Request $request): JsonResponse
    {
        $user = $request->user();

        $receivedClaims = Claim::query()
            ->with([
                'claimer:id,name,email,student_id',
                'item' => fn ($query) => $query->with(['poster:id,name,email,student_id', 'category:id,name']),
            ])
            ->whereHas('item', fn ($query) => $query->where('posted_by', $user->id))
            ->latest()
            ->get();

        $submittedClaims = Claim::query()
            ->with([
                'claimer:id,name,email,student_id',
                'item' => fn ($query) => $query->with(['poster:id,name,email,student_id', 'category:id,name']),
            ])
            ->where('claimer_id', $user->id)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'received_claims' => $receivedClaims,
                'submitted_claims' => $submittedClaims,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'item_id' => ['required', 'exists:items,id'],
            'relationship_type' => ['required', Rule::in(['owner', 'behalf', 'found_it'])],
            'proof_text' => ['required', 'string', 'min:30'],
            'message' => ['nullable', 'string'],
            'preferred_location' => ['nullable', 'string', 'max:100'],
            'availability' => ['nullable', 'string', 'max:200'],
        ]);

        $user = $request->user();
        $item = Item::query()->with('poster')->findOrFail($data['item_id']);
        $allowedRelationshipTypes = $item->type === 'lost'
            ? ['found_it', 'behalf']
            : ['owner', 'behalf'];

        if (! in_array($data['relationship_type'], $allowedRelationshipTypes, true)) {
            return response()->json([
                'success' => false,
                'message' => $item->type === 'lost'
                    ? 'Lost reports accept found reports or on-behalf recovery details only.'
                    : 'Found reports accept owner claims or on-behalf claims only.',
            ], 422);
        }

        $data['message'] = trim($data['message'] ?? '') ?: 'No additional message provided.';

        if ($item->posted_by === $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot claim your own report.',
            ], 422);
        }

        if ($item->status !== Item::STATUS_ACTIVE) {
            return response()->json([
                'success' => false,
                'message' => 'Claims can only be submitted for active reports.',
            ], 422);
        }

        $hasPendingClaim = Claim::query()
            ->where('item_id', $item->id)
            ->where('claimer_id', $user->id)
            ->where('status', 'pending')
            ->exists();

        if ($hasPendingClaim) {
            return response()->json([
                'success' => false,
                'message' => 'You already have a pending claim for this item.',
            ], 422);
        }

        $claim = DB::transaction(function () use ($data, $user, $item) {
            $claim = Claim::query()->create([
                ...$data,
                'claimer_id' => $user->id,
                'status' => 'pending',
            ]);

            Notification::query()->create([
                'user_id' => $item->posted_by,
                'type' => $claim->relationship_type === 'found_it' ? 'found_report' : 'claim_request',
                'title' => $claim->relationship_type === 'found_it' ? 'Someone May Have Found Your Item!' : 'New Claim on Your Report',
                'message' => $claim->relationship_type === 'found_it'
                    ? $user->name.' says they may have found your "'.$item->title.'"'
                    : $user->name.' submitted a claim for "'.$item->title.'"',
                'is_read' => false,
                'related_item_id' => $item->id,
            ]);

            Notification::query()->create([
                'user_id' => $user->id,
                'type' => 'system',
                'title' => $claim->relationship_type === 'found_it' ? 'Found Report Submitted' : 'Claim Submitted',
                'message' => $claim->relationship_type === 'found_it'
                    ? 'Your found report for "'.$item->title.'" has been submitted and is awaiting review.'
                    : 'Your claim for "'.$item->title.'" has been submitted and is awaiting review.',
                'is_read' => false,
                'related_item_id' => $item->id,
            ]);

            User::query()
                ->where('role', 'admin')
                ->get()
                ->each(function (User $admin) use ($claim, $item, $user) {
                    Notification::query()->create([
                        'user_id' => $admin->id,
                        'type' => 'claim_submitted',
                        'title' => $claim->relationship_type === 'found_it' ? 'Found Report Submitted' : 'Claim Submitted',
                        'message' => $claim->relationship_type === 'found_it'
                            ? $user->name.' submitted a found report for: '.$item->title
                            : $user->name.' submitted a claim for: '.$item->title,
                        'is_read' => false,
                        'related_item_id' => $item->id,
                    ]);
                });

            return $claim;
        });

        $this->emailService->sendClaimSubmitted($item->poster, $user, $item, $claim);

        return response()->json([
            'success' => true,
            'data' => $claim->load(['item.poster', 'item.category', 'claimer']),
            'message' => $claim->relationship_type === 'found_it' ? 'Found report submitted.' : 'Claim submitted.',
        ], 201);
    }

    public function show(Request $request, Claim $claim): JsonResponse
    {
        $claim->load(['item.poster', 'item.category', 'claimer']);
        $user = $request->user();

        if (
            $claim->claimer_id !== $user->id
            && $claim->item?->posted_by !== $user->id
            && $user->role !== 'admin'
        ) {
            abort(403, 'You are not authorized to view this claim.');
        }

        return response()->json([
            'success' => true,
            'data' => $claim,
        ]);
    }

    public function update(Request $request, Claim $claim): JsonResponse
    {
        $claim->load(['item.poster', 'claimer']);
        $user = $request->user();

        if ($claim->item->posted_by !== $user->id && $user->role !== 'admin') {
            abort(403, 'You are not authorized to update this claim.');
        }

        $data = $request->validate([
            'status' => ['required', Rule::in(['accepted', 'rejected'])],
            'reason' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($claim, $data) {
            $claim->update([
                'status' => $data['status'],
                'admin_note' => $data['reason'] ?? $claim->admin_note,
            ]);

            $conversation = null;
            if ($data['status'] === 'accepted') {
                $claim->item->update(['status' => Item::STATUS_CLAIM_IN_PROGRESS]);
                $reporterId = (int) $claim->item->posted_by;
                $claimerId = (int) $claim->claimer_id;

                $conversation = Conversation::query()->firstOrCreate(
                    [
                        'participant_one' => min($reporterId, $claimerId),
                        'participant_two' => max($reporterId, $claimerId),
                        'item_id' => $claim->item_id,
                    ],
                    ['last_activity' => now()]
                );

                $conversation->update(['last_activity' => now()]);

                Message::query()->create([
                    'conversation_id' => $conversation->id,
                    'sender_id' => $reporterId,
                    'body' => 'Your claim has been accepted. You can now coordinate the item return here.',
                    'is_read' => false,
                ]);
            }

            Notification::query()->create([
                'user_id' => $claim->claimer_id,
                'type' => $data['status'] === 'accepted' ? 'claim_accepted' : 'claim_rejected',
                'title' => $data['status'] === 'accepted' ? 'Claim Accepted - Chat Started' : 'Claim Rejected',
                'message' => $data['status'] === 'accepted'
                    ? 'Your claim was accepted. Message the reporter here.'
                    : 'Your claim for "'.$claim->item->title.'" has been rejected.',
                'is_read' => false,
                'related_item_id' => $claim->item_id,
                'related_conversation_id' => $conversation?->id,
            ]);
        });

        if ($data['status'] === 'accepted') {
            $this->emailService->sendClaimAccepted($claim->claimer, $claim->item->poster, $claim->item, $claim);
        } else {
            $this->emailService->sendClaimRejected($claim->claimer, $claim->item, $data['reason'] ?? 'The item did not match your claim details.');
        }

        return response()->json([
            'success' => true,
            'data' => $claim->fresh()->load(['item.poster', 'item.category', 'claimer']),
        ]);
    }

    public function destroy(Request $request, Claim $claim): JsonResponse
    {
        if ((int) $claim->claimer_id !== (int) $request->user()->id) {
            abort(403, 'You are not authorized to cancel this claim.');
        }

        if ($claim->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Only pending claims can be cancelled.',
            ], 422);
        }

        $claim->delete();

        return response()->json([
            'success' => true,
            'message' => 'Claim cancelled.',
        ]);
    }
}
