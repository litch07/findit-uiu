<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $perPage = max(1, min((int) $request->query('per_page', 20), 50));

        $notifications = Notification::query()
            ->where('user_id', $user->id)
            ->when($request->boolean('unread'), fn ($query) => $query->where('is_read', false))
            ->latest()
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $notifications,
            'message' => 'Notifications retrieved.',
            'meta' => [
                'unread_count' => Notification::query()
                    ->where('user_id', $user->id)
                    ->where('is_read', false)
                    ->count(),
            ],
        ]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = Notification::query()->findOrFail($id);

        if ((int) $notification->user_id !== (int) $request->user()->id) {
            abort(403, 'You are not authorized to update this notification.');
        }

        $notification->update(['is_read' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read.',
            'meta' => [
                'unread_count' => $request->user()
                    ->notifications()
                    ->where('is_read', false)
                    ->count(),
            ],
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        Notification::query()
            ->where('user_id', $request->user()->id)
            ->update(['is_read' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Notifications marked as read.',
            'meta' => [
                'unread_count' => 0,
            ],
        ]);
    }
}
