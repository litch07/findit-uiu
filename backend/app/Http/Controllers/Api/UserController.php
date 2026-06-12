<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Item;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function show(User $user): JsonResponse
    {
        // Get the active items for the user
        $items = Item::query()
            ->with([
                'category:id,name',
                'images'
            ])
            ->where('posted_by', $user->id)
            ->whereIn('status', Item::PUBLIC_STATUSES)
            ->where('is_approved', true)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'student_id' => $user->student_id,
                    'department' => $user->department,
                    'avatar_url' => $user->avatar_url,
                    'created_at' => $user->created_at,
                    'is_banned' => $user->is_banned,
                ],
                'items' => $items,
            ],
        ]);
    }
}
