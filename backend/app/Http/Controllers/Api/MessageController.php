<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Item;
use App\Models\Message;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MessageController extends Controller
{
    public function unreadCount(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $count = Message::query()
            ->where('sender_id', '!=', $userId)
            ->where('is_read', false)
            ->whereHas('conversation', function ($query) use ($userId) {
                $query
                    ->where('participant_one', $userId)
                    ->orWhere('participant_two', $userId);
            })
            ->count();

        return response()->json([
            'success' => true,
            'count' => $count,
        ]);
    }

    public function conversations(Request $request): JsonResponse
    {
        $user = $request->user();

        $conversations = Conversation::query()
            ->with([
                'item:id,title,type,status,reference_id',
                'participantOne:id,name',
                'participantTwo:id,name',
                'messages' => fn ($query) => $query->latest()->limit(1),
            ])
            ->where('participant_one', $user->id)
            ->orWhere('participant_two', $user->id)
            ->orderByDesc('last_activity')
            ->latest()
            ->get()
            ->map(function (Conversation $conversation) use ($user) {
                $otherUser = (int) $conversation->participant_one === (int) $user->id
                    ? $conversation->participantTwo
                    : $conversation->participantOne;

                $conversation->setAttribute('other_user', $otherUser);
                $conversation->setAttribute('unread_count', Message::query()
                    ->where('conversation_id', $conversation->id)
                    ->where('sender_id', '!=', $user->id)
                    ->where('is_read', false)
                    ->count());

                return $conversation;
            });

        return response()->json([
            'success' => true,
            'data' => $conversations,
        ]);
    }

    public function startConversation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'with' => ['required', 'exists:users,id'],
            'item_id' => ['nullable', 'exists:items,id'],
        ]);

        $user = $request->user();

        if ((int) $data['with'] === (int) $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot message yourself.',
            ], 422);
        }

        $conversation = Conversation::query()
            ->where(function ($query) use ($user, $data) {
                $query->where(function ($firstOrder) use ($user, $data) {
                    $firstOrder
                        ->where('participant_one', $user->id)
                        ->where('participant_two', $data['with']);
                })->orWhere(function ($secondOrder) use ($user, $data) {
                    $secondOrder
                        ->where('participant_one', $data['with'])
                        ->where('participant_two', $user->id);
                });
            })
            ->when(
                array_key_exists('item_id', $data) && $data['item_id'] !== null,
                fn ($query) => $query->where('item_id', $data['item_id']),
                fn ($query) => $query->whereNull('item_id')
            )
            ->first();

        if (! $conversation) {
            $conversation = Conversation::query()->create([
                'item_id' => $data['item_id'] ?? null,
                'participant_one' => $user->id,
                'participant_two' => $data['with'],
                'last_activity' => now(),
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $conversation->load(['item', 'participantOne:id,name', 'participantTwo:id,name']),
        ]);
    }

    public function messages(Request $request, string $id): JsonResponse
    {
        $conversation = Conversation::query()
            ->with(['item:id,title,type,status,reference_id', 'participantOne:id,name', 'participantTwo:id,name'])
            ->findOrFail($id);

        $this->authorizeParticipant($request, $conversation);

        $otherUser = (int) $conversation->participant_one === (int) $request->user()->id
            ? $conversation->participantTwo
            : $conversation->participantOne;

        $conversation->setAttribute('other_user', $otherUser);

        Message::query()
            ->where('conversation_id', $conversation->id)
            ->where('sender_id', '!=', $request->user()->id)
            ->update(['is_read' => true]);

        return response()->json([
            'success' => true,
            'data' => [
                'conversation' => $conversation,
                'messages' => Message::query()
                    ->where('conversation_id', $conversation->id)
                    ->orderBy('created_at')
                    ->get(),
            ],
        ]);
    }

    public function sendMessage(Request $request, string $id): JsonResponse
    {
        $conversation = Conversation::query()->with('item:id,status')->findOrFail($id);
        $this->authorizeParticipant($request, $conversation);

        if ($conversation->closed_at || $conversation->item?->status === Item::STATUS_RESOLVED) {
            return response()->json([
                'success' => false,
                'message' => 'This conversation is closed because the item has been resolved.',
            ], 422);
        }

        $data = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $message = DB::transaction(function () use ($request, $conversation, $data) {
            $message = Message::query()->create([
                'conversation_id' => $conversation->id,
                'sender_id' => $request->user()->id,
                'body' => trim($data['body']),
                'is_read' => false,
            ]);

            $conversation->update(['last_activity' => now()]);

            Notification::query()->create([
                'user_id' => $this->otherParticipantId($request, $conversation),
                'type' => 'message',
                'title' => 'New Message',
                'message' => $request->user()->name.' sent you a message.',
                'is_read' => false,
                'related_item_id' => $conversation->item_id,
                'related_conversation_id' => $conversation->id,
            ]);

            return $message;
        });

        return response()->json([
            'success' => true,
            'data' => $message,
        ], 201);
    }

    private function authorizeParticipant(Request $request, Conversation $conversation): void
    {
        if (
            (int) $conversation->participant_one !== (int) $request->user()->id
            && (int) $conversation->participant_two !== (int) $request->user()->id
        ) {
            abort(403, 'You are not a participant in this conversation.');
        }
    }

    private function otherParticipantId(Request $request, Conversation $conversation): int|string
    {
        return (int) $conversation->participant_one === (int) $request->user()->id
            ? $conversation->participant_two
            : $conversation->participant_one;
    }
}
