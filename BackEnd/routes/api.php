<?php

use App\Http\Controllers\Api\Admin\AdminLookupController;
use App\Http\Controllers\Api\Admin\AdminOrderController;
use App\Http\Controllers\Api\Admin\AdminProductController;
use App\Http\Controllers\Api\Admin\AdminProductImageController;
use App\Http\Controllers\Api\Admin\AdminStockController;
use App\Http\Controllers\Api\Admin\AdminVariantController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Endpoint kiểm tra sức khỏe hệ thống
Route::get('/health', function (): JsonResponse {
    return response()->json([
        'status' => 'ok',
    ]);
});

// Authentication API (Personal Access Token, Bearer header)
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

// Cart API
// Báo giá giỏ hàng khách vãng lai (công khai, có rate limit)
Route::post('/cart/quote', [CartController::class, 'quote'])
    ->middleware('throttle:cart-quote')
    ->name('cart.quote');

// Giỏ hàng người dùng (yêu cầu đăng nhập, mỗi người một giỏ)
Route::middleware(['auth:sanctum', 'active'])->prefix('cart')->group(function () {
    Route::get('/', [CartController::class, 'index']);
    Route::post('/items', [CartController::class, 'store']);
    Route::patch('/items/{id}', [CartController::class, 'update'])->where('id', '[0-9]+');
    Route::delete('/items/{id}', [CartController::class, 'destroy'])->where('id', '[0-9]+');
    Route::delete('/', [CartController::class, 'clear']);
    Route::post('/merge', [CartController::class, 'merge'])->name('cart.merge');
});

// Orders API (yêu cầu đăng nhập)
Route::middleware(['auth:sanctum', 'active'])->prefix('orders')->group(function () {
    Route::get('/', [OrderController::class, 'index']);
    Route::post('/', [OrderController::class, 'store']);
    Route::get('/{order_code}', [OrderController::class, 'show']);
    Route::post('/{order_code}/cancel', [OrderController::class, 'cancel']);
});

// Admin & Operator Orders Management API
Route::middleware(['auth:sanctum', 'active', 'role:admin,operator'])->prefix('admin/orders')->group(function () {
    Route::get('/', [AdminOrderController::class, 'index']);
    Route::get('/{order_code}', [AdminOrderController::class, 'show']);
    Route::patch('/{order_code}/status', [AdminOrderController::class, 'updateStatus']);
});

// Admin & Operator Read-only Catalog & Stock API
Route::middleware(['auth:sanctum', 'active', 'role:admin,operator'])->prefix('admin')->group(function () {
    Route::get('/lookups', [AdminLookupController::class, 'index']);
    Route::get('/products', [AdminProductController::class, 'index']);
    Route::get('/products/{id}', [AdminProductController::class, 'show']);
    Route::get('/variants/{variant_id}/stock-adjustments', [AdminStockController::class, 'history']);
    Route::get('/stock/low', [AdminStockController::class, 'lowStock']);
});

// Admin Only Catalog, Image & Stock Write API
Route::middleware(['auth:sanctum', 'active', 'role:admin'])->prefix('admin')->group(function () {
    Route::post('/products', [AdminProductController::class, 'store']);
    Route::match(['put', 'patch'], '/products/{id}', [AdminProductController::class, 'update']);
    Route::delete('/products/{id}', [AdminProductController::class, 'destroy']);

    Route::post('/products/{id}/variants', [AdminVariantController::class, 'store']);
    Route::match(['put', 'patch'], '/variants/{variant_id}', [AdminVariantController::class, 'update']);
    Route::delete('/variants/{variant_id}', [AdminVariantController::class, 'destroy']);

    Route::post('/variants/{variant_id}/stock', [AdminStockController::class, 'adjust']);

    Route::post('/products/{id}/images', [AdminProductImageController::class, 'upload']);
    Route::match(['put', 'patch'], '/products/{id}/images/{image_id}', [AdminProductImageController::class, 'update']);
    Route::delete('/products/{id}/images/{image_id}', [AdminProductImageController::class, 'destroy']);
});

// Public read-only API (không có prefix /v1)
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{slug}', [ProductController::class, 'show'])->where('slug', '[a-z0-9\-]+');
