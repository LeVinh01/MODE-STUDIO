<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\ProductStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminProductImageUpdateRequest;
use App\Http\Requests\Admin\AdminProductImageUploadRequest;
use App\Http\Resources\Admin\AdminProductImageResource;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdminProductImageController extends Controller
{
    public function upload(AdminProductImageUploadRequest $request, int $productId): JsonResponse
    {
        $product = Product::findOrFail($productId);
        $file = $request->file('image');
        $colorId = $request->filled('color_id') ? (int) $request->input('color_id') : null;

        // Lưu file vào storage/app/public/products/{productId}
        $path = $file->store("products/{$productId}", 'public');
        $imageUrl = Storage::disk('public')->url($path);

        // Kiểm tra phạm vi (product_id, color_id) đã có ảnh nào chưa
        $scopeQuery = ProductImage::where('product_id', $productId);
        if ($colorId === null) {
            $scopeQuery->whereNull('color_id');
        } else {
            $scopeQuery->where('color_id', $colorId);
        }

        $existingInScopeCount = $scopeQuery->count();
        $isMainRequested = $request->boolean('is_main', false);
        // Nếu là ảnh đầu tiên trong scope hoặc request yêu cầu is_main
        $isMain = $isMainRequested || ($existingInScopeCount === 0);

        $image = DB::transaction(function () use ($productId, $colorId, $imageUrl, $request, $isMain) {
            if ($isMain) {
                $scopeUpdate = ProductImage::where('product_id', $productId);
                if ($colorId === null) {
                    $scopeUpdate->whereNull('color_id');
                } else {
                    $scopeUpdate->where('color_id', $colorId);
                }
                $scopeUpdate->update(['is_main' => false]);
            }

            return ProductImage::create([
                'product_id' => $productId,
                'color_id'   => $colorId,
                'image_url'  => $imageUrl,
                'alt_text'   => $request->input('alt_text'),
                'is_main'    => $isMain,
                'sort_order' => (int) $request->input('sort_order', 0),
            ]);
        });

        $image->load('color');

        return (new AdminProductImageResource($image))
            ->response()
            ->setStatusCode(201);
    }

    public function update(AdminProductImageUpdateRequest $request, int $productId, int $imageId): AdminProductImageResource
    {
        $product = Product::findOrFail($productId);
        $image = ProductImage::where('product_id', $productId)->findOrFail($imageId);

        $data = $request->validated();
        $newColorId = array_key_exists('color_id', $data)
            ? ($data['color_id'] !== null ? (int) $data['color_id'] : null)
            : $image->color_id;

        $newIsMain = array_key_exists('is_main', $data)
            ? $request->boolean('is_main')
            : $image->is_main;

        DB::transaction(function () use ($image, $productId, $newColorId, $newIsMain, $data) {
            if ($newIsMain) {
                // Bỏ is_main của các ảnh khác trong cùng scope (product_id, color_id)
                $scopeUpdate = ProductImage::where('product_id', $productId)->where('id', '!=', $image->id);
                if ($newColorId === null) {
                    $scopeUpdate->whereNull('color_id');
                } else {
                    $scopeUpdate->where('color_id', $newColorId);
                }
                $scopeUpdate->update(['is_main' => false]);
            }

            $image->update($data);
        });

        $image->load('color');

        return new AdminProductImageResource($image);
    }

    public function destroy(int $productId, int $imageId): JsonResponse
    {
        $product = Product::findOrFail($productId);
        $image = ProductImage::where('product_id', $productId)->findOrFail($imageId);

        $productStatus = $product->status instanceof ProductStatus
            ? $product->status->value
            : (string) $product->status;

        // Chặn xóa hình ảnh cuối cùng của sản phẩm active
        if ($productStatus === 'active') {
            $totalImagesCount = ProductImage::where('product_id', $productId)->count();
            if ($totalImagesCount <= 1) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Không thể xóa hình ảnh cuối cùng của sản phẩm đang hoạt động. Vui lòng chuyển trạng thái sản phẩm sang bản nháp hoặc lưu trữ trước.',
                ], 422));
            }
        }

        DB::transaction(function () use ($image, $productId) {
            // Nếu ảnh bị xóa là is_main, promote ảnh kế tiếp trong cùng scope lên làm is_main
            if ($image->is_main) {
                $scopeQuery = ProductImage::where('product_id', $productId)
                    ->where('id', '!=', $image->id);

                if ($image->color_id === null) {
                    $scopeQuery->whereNull('color_id');
                } else {
                    $scopeQuery->where('color_id', $image->color_id);
                }

                $nextImage = $scopeQuery->orderBy('sort_order', 'asc')->orderBy('id', 'asc')->first();
                $nextImage?->update(['is_main' => true]);
            }

            // Chỉ xóa file vật lý nếu trỏ vào storage cục bộ của hệ thống
            if (Str::contains($image->image_url, '/storage/')) {
                $relativeStoragePath = Str::after($image->image_url, '/storage/');
                if ($relativeStoragePath && Storage::disk('public')->exists($relativeStoragePath)) {
                    Storage::disk('public')->delete($relativeStoragePath);
                }
            }

            $image->delete();
        });

        return response()->json([
            'message' => 'Xóa hình ảnh sản phẩm thành công.',
        ]);
    }
}
