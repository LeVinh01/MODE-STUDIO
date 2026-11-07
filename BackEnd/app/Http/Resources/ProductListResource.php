<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // available_colors lọc trùng màu từ variants active đã eager load
        $availableColors = [];
        if ($this->relationLoaded('variants')) {
            $uniqueColors = $this->variants
                ->filter(fn($v) => (bool) $v->is_active && $v->color)
                ->pluck('color')
                ->unique('id')
                ->values();

            $availableColors = $uniqueColors->map(fn($c) => [
                'id'       => $c->id,
                'name'     => $c->name,
                'hex_code' => $c->hex_code,
            ])->all();
        }

        // Tính in_stock từ variants active đã load hoặc total_stock nếu dùng withSum
        $inStock = false;
        if (isset($this->total_stock)) {
            $inStock = ((int) $this->total_stock) > 0;
        } elseif ($this->relationLoaded('variants')) {
            $inStock = $this->variants
                ->filter(fn($v) => (bool) $v->is_active)
                ->sum('stock_quantity') > 0;
        }

        return [
            'id'               => $this->id,
            'name'             => $this->name,
            'slug'             => $this->slug,
            'base_price'       => (int) $this->base_price,
            'compare_at_price' => $this->compare_at_price !== null ? (int) $this->compare_at_price : null,
            'is_featured'      => (bool) $this->is_featured,
            'in_stock'         => $inStock,
            'published_at'     => $this->published_at?->toISOString(),
            'category'         => $this->whenLoaded('category', function () {
                return [
                    'id'   => $this->category->id,
                    'name' => $this->category->name,
                    'slug' => $this->category->slug,
                ];
            }),
            'brand'            => $this->whenLoaded('brand', function () {
                return $this->brand ? [
                    'id'   => $this->brand->id,
                    'name' => $this->brand->name,
                    'slug' => $this->brand->slug,
                ] : null;
            }),
            'main_image'       => $this->whenLoaded('mainImage', function () {
                return $this->mainImage ? [
                    'url'      => $this->mainImage->image_url,
                    'alt_text' => $this->mainImage->alt_text,
                ] : null;
            }),
            'available_colors' => $availableColors,
        ];
    }
}
