<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        $user = $request->user();

        $validated = $request->validate([
            'item_id'     => ['required', 'integer', 'exists:items,id'],
            'description' => ['required', 'string', 'min:30', 'max:500'],
        ]);

        $item = Item::query()->findOrFail($validated['item_id']);

        // Only the item poster or the accepted claimer may report.
        $isOwner   = (int) $item->posted_by === (int) $user->id;
        $isClaimer = $this->isAcceptedClaimer($item, $user->id);

        if (! $isOwner && ! $isClaimer) {
            return response()->json([
                'success' => false,
                'message' => 'You are not a party to this item exchange.',
            ], 403);
        }

        // Item must be resolved.
        if ($item->status !== Item::STATUS_RESOLVED) {
            return response()->json([
                'success' => false,
                'message' => 'Scam reports can only be filed on resolved items.',
            ], 422);
        }

        // One report per user per item — check existing system notifications
        // for this user+item combo tagged as scam reports.
        $alreadyReported = Notification::query()
            ->where('user_id', $user->id)
            ->where('related_item_id', $item->id)
            ->where('title', 'like', '[scam_report]%')
            ->exists();

        // Also check if the user filed a report as admin-facing notification
        // (targeted at admins rather than themselves). We use a sentinel
        // notification sent to the reporter themselves to track this.
        if ($alreadyReported) {
            return response()->json([
                'success' => false,
                'message' => 'You have already filed a report for this item.',
            ], 422);
        }

        $displayId   = $item->display_id ?: ('#' . $item->id);
        $description = trim($validated['description']);
        $snippet     = mb_strlen($description) > 100
            ? mb_substr($description, 0, 97) . '...'
            : $description;

        // 1. Sentinel notification stored against the *reporter* so we can
        //    detect duplicates without a migration.
        Notification::query()->create([
            'user_id'         => $user->id,
            'type'            => 'system',
            'title'           => "[scam_report] filed on {$displayId}",
            'message'         => $description,
            'is_read'         => true, // reporter doesn't need to see it
            'related_item_id' => $item->id,
        ]);

        // 2. Visible notification for every admin.
        $admins = User::query()->where('role', 'admin')->get(['id']);
        foreach ($admins as $admin) {
            Notification::query()->create([
                'user_id'         => $admin->id,
                'type'            => 'system',
                'title'           => "[scam_report] Scam report filed on {$displayId}",
                'message'         => "🚨 Scam report filed on {$displayId}. Click to review. — \"{$snippet}\"",
                'is_read'         => false,
                'related_item_id' => $item->id,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Your report has been submitted to the admin.',
        ]);
    }

    private function isAcceptedClaimer(Item $item, int $userId): bool
    {
        return $item->claims()
            ->whereIn('status', ['accepted', 'resolved'])
            ->where('claimer_id', $userId)
            ->exists();
    }
}
