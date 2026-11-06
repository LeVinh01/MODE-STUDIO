<?php

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Nơi đăng ký các API routes cho ứng dụng MODE STUDIO.
|
*/

// Endpoint kiểm tra sức khỏe hệ thống
Route::get('/health', function (): JsonResponse {
    return response()->json([
        'status' => 'ok',
    ]);
});
