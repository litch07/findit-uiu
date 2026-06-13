<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClaimController;
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ScamReportController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));
Route::get('/stats', [StatsController::class, 'public']);
Route::post('/contact', [ContactController::class, 'submit']);

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::get('/verify-email/{token}', [AuthController::class, 'verifyEmail']);
    Route::post('/resend-verification', [AuthController::class, 'resendVerification']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::patch('/profile', [AuthController::class, 'updateProfile']);
        Route::patch('/password', [AuthController::class, 'updatePassword']);
        Route::post('/profile/photo', [AuthController::class, 'uploadPhoto']);
    });
});

Route::middleware(['auth:sanctum', \App\Http\Middleware\CheckBanned::class])->group(function () {
    Route::get('/my-items', [ItemController::class, 'myItems']);
    Route::apiResource('items', ItemController::class);
    Route::get('/my-claims', [ClaimController::class, 'myClaims']);
    Route::apiResource('claims', ClaimController::class);

    Route::get('/users/{user}', [UserController::class, 'show']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::patch('/notifications/{id}', [NotificationController::class, 'markRead']);

    Route::get('/messages/unread-count', [MessageController::class, 'unreadCount']);

    Route::prefix('conversations')->group(function () {
        Route::get('/', [MessageController::class, 'conversations']);
        Route::post('/', [MessageController::class, 'startConversation']);
        Route::get('/{id}', [MessageController::class, 'messages']);
        Route::post('/{id}', [MessageController::class, 'sendMessage']);
    });

    Route::prefix('admin')->middleware('admin')->group(function () {
        Route::get('/stats', [AdminController::class, 'stats']);
        Route::get('/pending', [AdminController::class, 'pendingItems']);
        Route::get('/items', [AdminController::class, 'items']);
        Route::get('/items/{item}', [AdminController::class, 'itemDetail']);
        Route::patch('/items/{item}', [AdminController::class, 'updateItem']);
        Route::delete('/items/{item}', [AdminController::class, 'deleteItem']);
        Route::get('/users', [AdminController::class, 'users']);
        Route::get('/users/{user}', [AdminController::class, 'userDetail']);
        Route::patch('/users/{user}/ban', [AdminController::class, 'banUser']);
        Route::patch('/users/{user}/unban', [AdminController::class, 'unbanUser']);
        Route::get('/logs', [AdminController::class, 'logs']);
    });
});

// CSV Export routes — outside sanctum middleware; use token query param for browser download auth
Route::prefix('admin')->group(function () {
    Route::get('/export/users', [AdminController::class, 'exportUsers']);
    Route::get('/export/logs', [AdminController::class, 'exportLogs']);
    Route::get('/export/items', [AdminController::class, 'exportItems']);
});

