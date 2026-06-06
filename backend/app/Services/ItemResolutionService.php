<?php

namespace App\Services;

use App\Models\Claim;
use App\Models\Conversation;
use App\Models\Item;
use App\Models\Message;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ItemResolutionService
{
    public function resolve(Item $item): Item
    {
        if ($item->status !== Item::STATUS_CLAIM_IN_PROGRESS) {
            abort(422, 'Only reports with a claim in progress can be marked resolved.');
        }

        return DB::transaction(function () use ($item) {
            $item = Item::query()
                ->whereKey($item->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($item->status !== Item::STATUS_CLAIM_IN_PROGRESS) {
                abort(422, 'Only reports with a claim in progress can be marked resolved.');
            }

            $claim = Claim::query()
                ->where('item_id', $item->id)
                ->where('status', 'accepted')
                ->latest()
                ->lockForUpdate()
                ->first();

            if (! $claim) {
                abort(422, 'This item does not have an accepted claim to resolve.');
            }

            $item->update(['status' => Item::STATUS_RESOLVED]);
            $claim->update(['status' => 'resolved']);

            $otherClaims = Claim::query()
                ->where('item_id', $item->id)
                ->where('id', '!=', $claim->id)
                ->whereIn('status', ['pending', 'submitted'])
                ->lockForUpdate()
                ->get();

            foreach ($otherClaims as $otherClaim) {
                $otherClaim->update(['status' => 'rejected']);
                
                Notification::query()->create([
                    'user_id' => $otherClaim->claimer_id,
                    'type' => 'system',
                    'title' => 'Claim Rejected',
                    'message' => 'Your claim for this item was rejected because it has been resolved with another user.',
                    'is_read' => false,
                    'related_item_id' => $item->id,
                ]);
            }

            \App\Models\AdminLog::query()->create([
                'admin_id' => null,
                'action' => 'item_resolved',
                'target_type' => 'item',
                'target_id' => $item->id,
                'note' => 'Item marked as resolved by poster',
            ]);

            $this->incrementUserStats($item, $claim);
            $conversation = $this->closeConversation($item, $claim);
            $this->notifyParticipants($item, $claim, $conversation?->id);

            return $item->fresh();
        });
    }

    private function incrementUserStats(Item $item, Claim $claim): void
    {
        $reporter = User::query()->lockForUpdate()->find($item->posted_by);
        $claimer = User::query()->lockForUpdate()->find($claim->claimer_id);

        if (! $reporter || ! $claimer) {
            return;
        }

        if ($item->type === 'lost') {
            $reporter->increment('items_recovered');
            $claimer->increment('items_returned');
            return;
        }

        $reporter->increment('items_returned');
        $claimer->increment('items_recovered');
    }

    private function closeConversation(Item $item, Claim $claim): ?Conversation
    {
        $conversation = Conversation::query()
            ->where('item_id', $item->id)
            ->where('participant_one', min((int) $item->posted_by, (int) $claim->claimer_id))
            ->where('participant_two', max((int) $item->posted_by, (int) $claim->claimer_id))
            ->lockForUpdate()
            ->first();

        if (! $conversation) {
            return null;
        }

        Message::query()->create([
            'conversation_id' => $conversation->id,
            'sender_id' => $item->posted_by,
            'body' => 'This item has been marked as resolved. The return is now closed.',
            'is_read' => false,
        ]);

        $conversation->update([
            'last_activity' => now(),
            'closed_at' => now(),
        ]);

        return $conversation;
    }

    private function notifyParticipants(Item $item, Claim $claim, int|string|null $conversationId): void
    {
        Notification::query()->create([
            'user_id' => $item->posted_by,
            'type' => 'system',
            'title' => 'Item Resolved',
            'message' => 'Item marked as resolved',
            'is_read' => false,
            'related_item_id' => $item->id,
            'related_conversation_id' => $conversationId,
        ]);

        Notification::query()->create([
            'user_id' => $claim->claimer_id,
            'type' => 'system',
            'title' => 'Item Resolved',
            'message' => 'Item marked as resolved',
            'is_read' => false,
            'related_item_id' => $item->id,
            'related_conversation_id' => $conversationId,
        ]);
    }
}
