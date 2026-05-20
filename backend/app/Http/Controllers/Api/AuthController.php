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

    public function verifyEmail(Request $request, string $token): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $record = DB::table('email_verification_tokens')
            ->where('email', $data['email'])
            ->where('token', $token)
            ->first();

        if (! $record) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email verification token.',
            ], 422);
        }

        if ($record->expires_at && now()->greaterThan($record->expires_at)) {
            DB::table('email_verification_tokens')->where('email', $data['email'])->delete();

            return response()->json([
                'success' => false,
                'message' => 'Email verification token has expired.',
            ], 422);
        }

        $payload = json_decode($record->payload, true);

        if (!$payload) {
             return response()->json([
                 'success' => false,
                 'message' => 'Invalid registration data.',
             ], 422);
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

        return response()->json([
            'success' => true,
            'message' => 'Email verified successfully.',
            'token' => $authToken,
            'user' => $this->authUserPayload($user),
        ]);
    }

    public function resendVerification(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

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
        }

        return response()->json([
            'success' => true,
            'message' => 'If that email needs verification, a new verification link has been sent.',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['success' => true]);
    }

    public function me(Request $request): JsonResponse
    {
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

    private function authUserPayload(User $user): array
    {
        return $user->only([
            'id',
            'name',
            'email',
            'student_id',
            'department',
            'role',
            'phone',
            'bio',
            'created_at',
            'email_verified_at',
            'items_lost',
            'items_found',
            'items_recovered',
            'items_returned',
        ]);
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
