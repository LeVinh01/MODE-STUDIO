<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $inStock = false;
        if ($this->relationLoaded('variants')) {
            $inStock = $this->variants
                ->filter(fn($v) => (bool) $v->is_active)
                ->sum('stock_quantity') > 0;
        }

        return [
            'id'               => $this->id,
            'name'             => $this->name,
            'slug'             => $this->slug,
            'description'      => $this->description,
            'material'         => $this->material,
            'gender'           => $this->gender?->value ?? $this->gender,
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
            'images'           => ProductImageResource::collection($this->whenLoaded('images')),
            'variants'         => ProductVariantResource::collection($this->whenLoaded('variants')),
        ];
    }
}
