<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\ProductStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminVariantStoreRequest;
use App\Http\Requests\Admin\AdminVariantUpdateRequest;
use App\Http\Resources\Admin\AdminVariantResource;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminVariantController extends Controller
{
    public function store(AdminVariantStoreRequest $request, int $productId): JsonResponse
    {
        $product = Product::findOrFail($productId);
        $data = $request->validated();

        $existing = ProductVariant::withTrashed()
            ->where('product_id', $productId)
            ->where('color_id', $data['color_id'])
            ->where('size_id', $data['size_id'])
            ->first();

        if ($existing && !$existing->trashed()) {
            throw new HttpResponseException(response()->json([
                'message' => 'Cặp màu sắc và kích cỡ này đã tồn tại trên sản phẩm.',
                'errors'  => [
                    'color_id' => ['Cặp màu sắc và kích cỡ này đã tồn tại trên sản phẩm.'],
                ],
            ], 422));
        }

        // Khôi phục biến thể đã xóa mềm
        if ($existing && $existing->trashed()) {
            $existing->restore();

            $updatePayload = [
                'stock_quantity' => $data['stock_quantity'],
                'is_active'      => $request->boolean('is_active', true),
                'note'           => $data['note'] ?? $existing->note,
            ];

            if (!empty($data['sku']) && $data['sku'] !== $existing->sku) {
                $skuExists = ProductVariant::withTrashed()
                    ->where('sku', $data['sku'])
                    ->where('id', '!=', $existing->id)
                    ->exists();

                if ($skuExists) {
                    throw new HttpResponseException(response()->json([
                        'message' => 'Mã SKU này đã tồn tại trong hệ thống.',
                        'errors'  => [
                            'sku' => ['Mã SKU này đã tồn tại trong hệ thống.'],
                        ],
                    ], 422));
                }
                $updatePayload['sku'] = $data['sku'];
            }

            $existing->update($updatePayload);
            $existing->load(['color', 'size']);

            return (new AdminVariantResource($existing))
                ->response()
                ->setStatusCode(200);
        }

        // Tạo mới biến thể
        $sku = $data['sku'] ?? null;
        if (empty($sku)) {
            $baseSku = strtoupper(Str::slug($product->slug) . '-' . $data['color_id'] . '-' . $data['size_id']);
            $sku = $baseSku;
            $counter = 1;
            while (ProductVariant::withTrashed()->where('sku', $sku)->exists()) {
                $sku = "{$baseSku}-{$counter}";
                $counter++;
            }
        } else {
            $skuExists = ProductVariant::withTrashed()->where('sku', $sku)->exists();
            if ($skuExists) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Mã SKU này đã tồn tại trong hệ thống.',
                    'errors'  => [
                        'sku' => ['Mã SKU này đã tồn tại trong hệ thống.'],
                    ],
                ], 422));
            }
        }

        $variant = ProductVariant::create([
            'product_id'     => $productId,
            'color_id'       => $data['color_id'],
            'size_id'        => $data['size_id'],
            'sku'            => $sku,
            'stock_quantity' => $data['stock_quantity'],
            'is_active'      => $request->boolean('is_active', true),
            'note'           => $data['note'] ?? null,
        ]);

        $variant->load(['color', 'size']);

        return (new AdminVariantResource($variant))
            ->response()
            ->setStatusCode(201);
    }

    public function update(AdminVariantUpdateRequest $request, int $variantId): AdminVariantResource
    {
        $variant = ProductVariant::with('product')->findOrFail($variantId);
        $data = $request->validated();

        $targetColorId = $data['color_id'] ?? $variant->color_id;
        $targetSizeId = $data['size_id'] ?? $variant->size_id;

        if ($targetColorId !== $variant->color_id || $targetSizeId !== $variant->size_id) {
            $duplicate = ProductVariant::withTrashed()
                ->where('product_id', $variant->product_id)
                ->where('color_id', $targetColorId)
                ->where('size_id', $targetSizeId)
                ->where('id', '!=', $variantId)
                ->exists();

            if ($duplicate) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Cặp màu sắc và kích cỡ này đã tồn tại trên sản phẩm.',
                    'errors'  => [
                        'color_id' => ['Cặp màu sắc và kích cỡ này đã tồn tại trên sản phẩm.'],
                    ],
                ], 422));
            }
        }

        if (isset($data['sku']) && $data['sku'] !== $variant->sku) {
            $skuExists = ProductVariant::withTrashed()
                ->where('sku', $data['sku'])
                ->where('id', '!=', $variantId)
                ->exists();

            if ($skuExists) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Mã SKU này đã tồn tại trong hệ thống.',
                    'errors'  => [
                        'sku' => ['Mã SKU này đã tồn tại trong hệ thống.'],
                    ],
                ], 422));
            }
        }

        $product = $variant->product;
        $productStatus = $product?->status instanceof ProductStatus ? $product->status->value : (string) ($product?->status ?? '');

        // Chặn tắt is_active nếu là biến thể đang bán cuối cùng của sản phẩm active
        if ($productStatus === 'active' && array_key_exists('is_active', $data) && !$data['is_active'] && $variant->is_active) {
            $activeVariantsCount = ProductVariant::withoutTrashed()
                ->where('product_id', $variant->product_id)
                ->where('is_active', true)
                ->count();

            if ($activeVariantsCount <= 1) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Không thể tắt biến thể đang bán cuối cùng của sản phẩm đang hoạt động. Vui lòng chuyển trạng thái sản phẩm sang bản nháp hoặc lưu trữ trước.',
                ], 422));
            }
        }

        // Loại bỏ stock_quantity khỏi payload nếu có (phải cập nhật qua endpoint điều chỉnh tồn kho)
        unset($data['stock_quantity']);

        $variant->update($data);
        $variant->load(['color', 'size']);

        return new AdminVariantResource($variant);
    }

    public function destroy(int $variantId): JsonResponse
    {
        $variant = ProductVariant::with('product')->findOrFail($variantId);
        $product = $variant->product;
        $productStatus = $product?->status instanceof ProductStatus ? $product->status->value : (string) ($product?->status ?? '');

        // Chặn xóa biến thể đang bán cuối cùng của sản phẩm active
        if ($productStatus === 'active' && $variant->is_active) {
            $activeVariantsCount = ProductVariant::withoutTrashed()
                ->where('product_id', $variant->product_id)
                ->where('is_active', true)
                ->count();

            if ($activeVariantsCount <= 1) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Không thể xóa biến thể đang bán cuối cùng của sản phẩm đang hoạt động. Vui lòng chuyển trạng thái sản phẩm sang bản nháp hoặc lưu trữ trước.',
                ], 422));
            }
        }

        $variant->delete();

        return response()->json([
            'message' => 'Xóa biến thể sản phẩm thành công.',
        ]);
    }
}
