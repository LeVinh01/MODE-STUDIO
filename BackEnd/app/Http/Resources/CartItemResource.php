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

        if (!$product || $product->trashed() || $productStatus !== 'active') {
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

        $unitPrice = $product ? (int) $product->base_price : 0;
        $quantity = (int) $this->quantity;
        $lineTotal = $unitPrice * $quantity;

        return [
            'id'                   => $this->id,
            'variant'              => $variant ? [
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
            ] : null,
            'product'              => $product ? [
                'id'         => $product->id,
                'name'       => $product->name,
                'slug'       => $product->slug,
                'status'     => $productStatus,
                'main_image' => $product->mainImage ? [
                    'url'      => $product->mainImage->image_url,
                    'alt_text' => $product->mainImage->alt_text,
                ] : null,
            ] : null,
            'unit_price'           => $unitPrice,
            'quantity'             => $quantity,
            'line_total'           => $lineTotal,
            'is_purchasable'       => $isPurchasable,
            'unpurchasable_reason' => $unpurchasableReason,
        ];
    }
}
