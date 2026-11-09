<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminLowStockResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'sku'            => $this->sku,
            'stock_quantity' => (int) $this->stock_quantity,
            'is_active'      => (bool) $this->is_active,
            'color'          => $this->whenLoaded('color', function () {
                return $this->color ? [
                    'id'       => $this->color->id,
                    'name'     => $this->color->name,
                    'hex_code' => $this->color->hex_code,
                ] : null;
            }),
            'size'           => $this->whenLoaded('size', function () {
                return $this->size ? [
                    'id'   => $this->size->id,
                    'name' => $this->size->name,
                ] : null;
            }),
            'product'        => $this->whenLoaded('product', function () {
                return $this->product ? [
                    'id'         => $this->product->id,
                    'name'       => $this->product->name,
                    'slug'       => $this->product->slug,
                    'base_price' => (int) $this->product->base_price,
                    'category'   => $this->product->category ? [
                        'id'   => $this->product->category->id,
                        'name' => $this->product->category->name,
                    ] : null,
                ] : null;
            }),
        ];
    }
}
