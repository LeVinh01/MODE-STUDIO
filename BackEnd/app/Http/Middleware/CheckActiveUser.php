<?php

namespace App\Http\Middleware;

use App\Enums\UserStatus;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckActiveUser
{
    /**
     * Kiểm tra trạng thái tài khoản người dùng đã xác thực.
     * Nếu bị khóa (locked), từ chối request với mã 403 và thông báo rõ ràng.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            $userStatus = $user->status instanceof UserStatus ? $user->status->value : (string) $user->status;

            if ($userStatus === 'locked') {
                // Xóa token hiện tại để hủy phiên đăng nhập
                $user->currentAccessToken()?->delete();

                return response()->json([
                    'message' => 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
                ], 403);
            }
        }

        return $next($request);
    }
}
