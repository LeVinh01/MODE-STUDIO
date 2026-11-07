<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Kiểm tra vai trò của người dùng đã xác thực.
     * Nếu không có quyền, trả về HTTP 403 Forbidden dạng JSON bằng tiếng Việt.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string  ...$roles
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Chưa xác thực hoặc phiên đăng nhập đã hết hạn.',
            ], 401);
        }

        $userRole = $user->role?->name;

        if (!$userRole || !in_array($userRole, $roles, true)) {
            return response()->json([
                'message' => 'Bạn không có quyền thực hiện thao tác này.',
            ], 403);
        }

        return $next($request);
    }
}
