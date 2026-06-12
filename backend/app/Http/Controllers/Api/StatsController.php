<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class StatsController extends Controller
{
    public function public(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'total_posts' => Item::query()
                    ->where('status', '!=', Item::STATUS_RESOLVED)
                    ->count(),
                'active_posts' => Item::query()
                    ->where('status', Item::STATUS_ACTIVE)
                    ->count(),
                'resolved_items' => Item::query()
                    ->where('status', Item::STATUS_RESOLVED)
                    ->count(),
                'total_users' => User::query()
                    ->where('role', '!=', 'admin')
                    ->whereNotNull('email_verified_at')
                    ->count(),
                'items_this_month' => Item::query()
                    ->whereYear('created_at', now()->year)
                    ->whereMonth('created_at', now()->month)
                    ->count(),
            ],
        ]);
    }
}
