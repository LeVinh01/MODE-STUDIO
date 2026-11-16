<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\UpdatePasswordRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Đăng ký tài khoản khách hàng mới
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $customerRole = Role::where('name', 'customer')->firstOrFail();

        $user = User::create([
            'full_name' => $validated['full_name'],
            'email'     => $validated['email'],
            'phone'     => $validated['phone'] ?? null,
            'password'  => $validated['password'],
            'role_id'   => $customerRole->id,
            'status'    => UserStatus::Active,
        ]);

        $user->setRelation('role', $customerRole);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'  => new UserResource($user),
            'token' => $token,
        ], 201);
    }

    /**
     * Đăng nhập người dùng và cấp token cá nhân
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();

        // Hash giả lập để chạy Hash::check khi không tìm thấy email, chống timing attack
        $dummyHash = '$2y$12$e80yqZ6V6zI9yqZ6V6zI9u.wY0X8y0X8y0X8y0X8y0X8y0X8y0X8y';

        $user = User::with('role')->where('email', $credentials['email'])->first();

        if (!$user) {
            Hash::check($credentials['password'], $dummyHash);

            return response()->json([
                'message' => 'Thông tin đăng nhập không chính xác.',
            ], 401);
        }

        if (!Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'Thông tin đăng nhập không chính xác.',
            ], 401);
        }

        // Kiểm tra tài khoản bị khóa
        $userStatus = $user->status instanceof UserStatus ? $user->status->value : (string) $user->status;
        if ($userStatus === 'locked') {
            return response()->json([
                'message' => 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
            ], 403);
        }

        // Cập nhật thời điểm đăng nhập gần nhất
        $user->update(['last_login_at' => now()]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'  => new UserResource($user),
            'token' => $token,
        ], 200);
    }

    /**
     * Đăng xuất và thu hồi đúng token hiện tại
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Đăng xuất thành công.',
        ], 200);
    }

    /**
     * Lấy thông tin tài khoản đang đăng nhập
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('role');

        return response()->json([
            'user' => new UserResource($user),
        ], 200);
    }

    /**
     * Cập nhật thông tin hồ sơ tài khoản (chỉ full_name và phone)
     */
    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $user->update([
            'full_name' => $validated['full_name'],
            'phone'     => $validated['phone'] ?? null,
        ]);

        return response()->json([
            'message' => 'Cập nhật thông tin tài khoản thành công.',
            'user'    => new UserResource($user->fresh()->loadMissing('role')),
        ], 200);
    }

    /**
     * Đổi mật khẩu tài khoản
     */
    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ.',
                'errors'  => [
                    'current_password' => ['Mật khẩu hiện tại không chính xác.'],
                ],
            ], 422);
        }

        $user->update([
            'password' => $validated['password'],
        ]);

        // Thu hồi tất cả các token khác, giữ lại token hiện tại đang thao tác
        $currentTokenId = $user->currentAccessToken()?->id;
        if ($currentTokenId) {
            $user->tokens()->where('id', '!=', $currentTokenId)->delete();
        }

        return response()->json([
            'message' => 'Đổi mật khẩu thành công.',
        ], 200);
    }
}
