<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Rate limiter cho đăng nhập: 5 lần/phút theo cặp email + IP
        RateLimiter::for('login', function (Request $request) {
            $email = strtolower(trim((string) $request->input('email')));
            return Limit::perMinute(5)->by($email . '|' . $request->ip())->response(function (Request $request, array $headers) {
                return response()->json([
                    'message' => 'Bạn đã thực hiện quá nhiều lần đăng nhập. Vui lòng thử lại sau 1 phút.',
                ], 429, $headers);
            });
        });

        // Rate limiter cho đăng ký: 5 lần/phút theo IP
        RateLimiter::for('register', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip())->response(function (Request $request, array $headers) {
                return response()->json([
                    'message' => 'Bạn đã thực hiện quá nhiều lần đăng ký. Vui lòng thử lại sau 1 phút.',
                ], 429, $headers);
            });
        });
    }
}
