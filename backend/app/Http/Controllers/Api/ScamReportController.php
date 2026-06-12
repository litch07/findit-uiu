<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Feature removed — scam reports disabled
class ScamReportController extends Controller
{
    /**
     * POST /api/scam-reports
     *
     * Stores a scam/bad-faith report by inserting a notification for every
     * admin user. No migration required — uses the existing notifications table
     * with type = 'system' and a title prefixed with '[scam_report]' so the
     * admin front-end can detect and style it distinctly.
     */
    public function store(Request $request): JsonResponse
    {
        return response()->json([
            'success' => false, 
            'message' => 'This feature is not available.'
        ], 410);
    }

    private function isAcceptedClaimer(Item $item, int $userId): bool
    {
        return $item->claims()
            ->whereIn('status', ['accepted', 'resolved'])
            ->where('claimer_id', $userId)
            ->exists();
    }
}
