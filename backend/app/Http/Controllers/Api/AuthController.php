<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use App\Services\EmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function __construct(private readonly EmailService $emailService)
    {
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()
            ->whereRaw('LOWER(email) = ?', [strtolower($credentials['email'])])
            ->first();

        try {
            $passwordMatches = $user && Hash::check($credentials['password'], $user->password);
        } catch (\RuntimeException $exception) {
            Log::warning('Stored password hash could not be verified.', [
                'email' => $credentials['email'],
                'error' => $exception->getMessage(),
            ]);
            $passwordMatches = false;
        }

        if (! $passwordMatches) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password.',
            ], 401);
        }

        if ($user->is_banned) {
            return response()->json([
                'success' => false,
                'message' => 'Your account has been suspended. Contact the UIU administration.',
            ], 403);
        }

        if ($user->role !== 'admin' && ! $user->email_verified_at) {
            return response()->json([
                'success' => false,
                'message' => 'Please verify your email before signing in.',
            ], 403);
        }

        if (! $user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Your account is inactive. Contact the FindIt admin.',
            ], 401);
        }

        $user->tokens()->delete();
        $token = $user->createToken('findit-api')->plainTextToken;

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => $this->authUserPayload($user),
        ]);
    }



    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150', Rule::unique('users', 'email')],
            'password' => [
                'required',
                'string',
                'min:8',
                'regex:/[A-Z]/',
                'regex:/[0-9]/',
                'regex:/[^A-Za-z0-9]/',
                'confirmed'
            ],
            'student_id' => ['required', 'string', 'max:20', Rule::unique('users', 'student_id')],
            'department' => ['nullable', 'string', 'max:100'],
        ], [
            'password.regex' => 'The password must contain at least one uppercase letter, one number, and one special character.',
            'email.unique' => 'This email address is already registered.',
            'student_id.unique' => 'This Student ID is already registered.',
        ]);

        $payload = json_encode([
            'name' => $data['name'],
            'email' => strtolower($data['email']),
            'password' => Hash::make($data['password']),
            'student_id' => $data['student_id'] ?? null,
            'department' => $data['department'] ?? null,
        ]);

        $token = bin2hex(random_bytes(32));
        $this->storeToken('email_verification_tokens', strtolower($data['email']), $token, $payload, now()->addDay());

        $tempUser = new User([
            'name' => $data['name'],
            'email' => strtolower($data['email']),
        ]);
        $this->emailService->sendVerification($tempUser, $token);

        return response()->json([
            'success' => true,
            'message' => 'Registration successful. Please check your email to verify your account.',
            'email' => strtolower($data['email']),
        ], 201);
    }

    public function verifyEmail(Request $request, string $token): \Illuminate\Http\RedirectResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5500/frontend/pages');

        $record = DB::table('email_verification_tokens')
            ->where('email', $data['email'])
            ->where('token', $token)
            ->first();

        if (! $record) {
            return redirect()->away($frontendUrl . '/verification-result.html?status=error&message=' . urlencode('Invalid email verification token.'));
        }

        if ($record->expires_at && now()->greaterThan($record->expires_at)) {
            DB::table('email_verification_tokens')->where('email', $data['email'])->delete();

            return redirect()->away($frontendUrl . '/verification-result.html?status=error&message=' . urlencode('Email verification token has expired.'));
        }

        $payload = json_decode($record->payload, true);

        if (!$payload) {
             return redirect()->away($frontendUrl . '/verification-result.html?status=error&message=' . urlencode('Invalid registration data.'));
        }

        $user = User::query()->create([
            'name' => $payload['name'],
            'email' => $payload['email'],
            'password' => $payload['password'],
            'student_id' => $payload['student_id'] ?? null,
            'department' => $payload['department'] ?? null,
            'role' => 'student',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        DB::table('email_verification_tokens')->where('email', $data['email'])->delete();

        User::query()
            ->where('role', 'admin')
            ->get()
            ->each(function (User $admin) use ($user) {
                Notification::query()->create([
                    'user_id' => $admin->id,
                    'type' => 'new_user',
                    'title' => 'New Student Registered',
                    'message' => $user->name.' registered for FindIt using '.$user->email.'.',
                    'is_read' => false,
                ]);
            });

        $this->emailService->sendWelcome($user);
        $authToken = $user->createToken('findit-api')->plainTextToken;

        return redirect()->away($frontendUrl . '/verification-result.html?status=success');
    }

    public function resendVerification(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        // check if they already verified their email
        $user = User::query()->whereRaw('LOWER(email) = ?', [strtolower($data['email'])])->first();
        if ($user && $user->email_verified_at) {
            return response()->json([
                'success' => false,
                'message' => 'This email is already verified! You can log in.',
            ], 422);
        }

        $record = DB::table('email_verification_tokens')
            ->whereRaw('LOWER(email) = ?', [strtolower($data['email'])])
            ->first();

        if ($record) {
            $token = bin2hex(random_bytes(32));
            $this->storeToken('email_verification_tokens', $record->email, $token, $record->payload, now()->addDay());

            $payload = json_decode($record->payload, true);
            $tempUser = new User([
                'name' => $payload['name'] ?? 'User',
                'email' => $record->email,
            ]);

            $this->emailService->sendVerification($tempUser, $token);
        } else {
            // check if they are registered at all
            return response()->json([
                'success' => false,
                'message' => 'No registration found for this email. Please register first.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'A new verification link has been sent to your email.',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();
        $user?->currentAccessToken()?->delete();

        return response()->json(['success' => true]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => $this->authUserPayload($user),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20'],
            'bio' => ['nullable', 'string'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();
        $user->fill([
            'name' => $data['name'],
            'phone' => $data['phone'] ?? null,
            'bio' => $data['bio'] ?? null,
        ])->save();

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'data' => $this->authUserPayload($user->fresh()),
        ]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        $user->forceFill(['password' => Hash::make($data['new_password'])])->save();
        $user->tokens()->delete();

        $this->emailService->sendPasswordChanged($user, $request->userAgent() ?? 'Unknown device');

        return response()->json([
            'success' => true,
            'message' => 'Password updated. Please sign in again.',
        ]);
    }

    public function uploadPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpeg,png,webp', 'max:51200'],
        ]);

        /** @var \App\Models\User $user */
        $user = $request->user();

        // Delete old avatar if one exists
        if ($user->avatar_url) {
            // avatar_url might be absolute like "http://localhost:8000/storage/avatars/filename.jpg"
            $parsed = parse_url($user->avatar_url, PHP_URL_PATH);
            $oldPath = 'public' . str_replace('/storage', '', $parsed);
            if (Storage::exists($oldPath)) {
                Storage::delete($oldPath);
            }
        }

        $extension = $request->file('photo')->getClientOriginalExtension();
        $filename  = 'user_' . $user->id . '_' . time() . '.' . $extension;
        $request->file('photo')->storeAs('avatars', $filename, 'public');

        $publicUrl = '/storage/avatars/' . $filename;
        $user->forceFill(['avatar_url' => $publicUrl])->save();

        return response()->json([
            'success' => true,
            'data'    => ['avatar_url' => $user->avatar_url],
            'message' => 'Profile photo updated',
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::query()
            ->whereRaw('LOWER(email) = ?', [strtolower($data['email'])])
            ->whereNotNull('email_verified_at')
            ->first();

        if ($user) {
            $token = bin2hex(random_bytes(32));
            $this->storeToken('password_reset_tokens', $user->email, $token, null, now()->addHour());
            $this->emailService->sendPasswordReset($user, $token);
        }

        // Always return success to avoid email enumeration
        return response()->json([
            'success' => true,
            'message' => 'If that email is associated with a verified account, a password reset link has been sent.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $record = DB::table('password_reset_tokens')
            ->whereRaw('LOWER(email) = ?', [strtolower($data['email'])])
            ->where('token', $data['token'])
            ->first();

        if (!$record) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired password reset token.',
            ], 422);
        }

        if ($record->expires_at && now()->greaterThan($record->expires_at)) {
            DB::table('password_reset_tokens')->whereRaw('LOWER(email) = ?', [strtolower($data['email'])])->delete();

            return response()->json([
                'success' => false,
                'message' => 'This password reset link has expired. Please request a new one.',
            ], 422);
        }

        $user = User::query()->whereRaw('LOWER(email) = ?', [strtolower($data['email'])])->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 422);
        }

        $user->forceFill(['password' => Hash::make($data['password'])])->save();
        $user->tokens()->delete();
        DB::table('password_reset_tokens')->whereRaw('LOWER(email) = ?', [strtolower($data['email'])])->delete();

        return response()->json([
            'success' => true,
            'message' => 'Password has been reset successfully. You can now sign in.',
        ]);
    }

    private function authUserPayload(User $user): array
    {
        $payload = $user->only([
            'id',
            'name',
            'email',
            'student_id',
            'department',
            'role',
            'phone',
            'bio',
            'avatar_url',
            'created_at',
            'email_verified_at',
            'items_lost',
            'items_found',
            'items_recovered',
            'items_returned',
        ]);

        $payload['stats'] = [
            'total_posts' => $user->items()->count(),
            'active_posts' => $user->items()->where('status', \App\Models\Item::STATUS_ACTIVE)->count(),
            'resolved_posts' => $user->items()->where('status', \App\Models\Item::STATUS_RESOLVED)->count(),
            'total_claims' => $user->claims()->count(),
            'accepted_claims' => $user->claims()->whereIn('status', ['accepted', 'resolved'])->count(),
        ];

        return $payload;
    }

    private function storeToken(string $table, string $email, string $token, ?string $payload, \DateTimeInterface $expiresAt): void
    {
        $data = [
            'token' => $token,
            'created_at' => now(),
            'expires_at' => $expiresAt,
        ];
        
        if ($payload !== null) {
            $data['payload'] = $payload;
        }

        DB::table($table)->updateOrInsert(
            ['email' => $email],
            $data
        );
    }
}
