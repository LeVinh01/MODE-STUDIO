<?php

namespace App\Http\Resources;

use App\Enums\ProductStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CartItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $variant = $this->variant;
        $product = $variant?->product;

        $isPurchasable = true;
        $unpurchasableReason = null;

        $productStatus = $product?->status instanceof ProductStatus
            ? $product->status->value
            : (string) ($product?->status ?? '');

        // Kiểm tra sản phẩm có đang mở bán công khai hay không
        $isProductPublished = $product
            && !$product->trashed()
            && $productStatus === 'active'
            && (!$product->published_at || $product->published_at <= now());

        $isQuote = ($this->is_quote ?? false) || $request->is('api/cart/quote');

        if (!$product || $product->trashed() || $productStatus !== 'active' || ($product->published_at && $product->published_at > now())) {
            $isPurchasable = false;
            $unpurchasableReason = 'Sản phẩm đã ngừng kinh doanh';
        } elseif (!$variant || !$variant->is_active) {
            $isPurchasable = false;
            $unpurchasableReason = 'Biến thể tạm ngừng bán';
        } elseif ($variant->stock_quantity <= 0) {
            $isPurchasable = false;
            $unpurchasableReason = 'Sản phẩm đã hết hàng';
        } elseif ($this->quantity > $variant->stock_quantity) {
            $isPurchasable = false;
            $unpurchasableReason = "Số lượng trong giỏ vượt quá tồn kho hiện tại (còn {$variant->stock_quantity})";
        }

        // Khi quote: không để lộ thông tin (tên, ảnh, giá) của sản phẩm nháp / ẩn / đã xóa mềm
        $hideProductDetails = $isQuote && !$isProductPublished;

        $unitPrice = ($hideProductDetails || !$product) ? 0 : (int) $product->base_price;
        $quantity = (int) $this->quantity;
        $lineTotal = $unitPrice * $quantity;

        $productData = null;
        if (!$hideProductDetails && $product) {
            $productData = [
                'id'         => $product->id,
                'name'       => $product->name,
                'slug'       => $product->slug,
                'status'     => $productStatus,
                'main_image' => $product->mainImage ? [
                    'url'      => $product->mainImage->image_url,
                    'alt_text' => $product->mainImage->alt_text,
                ] : null,
            ];
        }

        $variantData = null;
        if ($variant) {
            if ($hideProductDetails) {
                $variantData = [
                    'id'             => $variant->id,
                    'sku'            => null,
                    'color'          => null,
                    'size'           => null,
                    'stock_quantity' => 0,
                    'is_active'      => false,
                ];
            } else {
                $variantData = [
                    'id'             => $variant->id,
                    'sku'            => $variant->sku,
                    'color'          => $variant->color ? [
                        'id'       => $variant->color->id,
                        'name'     => $variant->color->name,
                        'hex_code' => $variant->color->hex_code,
                    ] : null,
                    'size'           => $variant->size ? [
                        'id'   => $variant->size->id,
                        'name' => $variant->size->name,
                    ] : null,
                    'stock_quantity' => (int) $variant->stock_quantity,
                    'is_active'      => (bool) $variant->is_active,
                ];
            }
        }

        return [
            'id'                   => $this->id ?? null,
            'variant'              => $variantData,
            'product'              => $productData,
            'unit_price'           => $unitPrice,
            'quantity'             => $quantity,
            'line_total'           => $lineTotal,
            'is_purchasable'       => $isPurchasable,
            'unpurchasable_reason' => $unpurchasableReason,
        ];
    }
}
