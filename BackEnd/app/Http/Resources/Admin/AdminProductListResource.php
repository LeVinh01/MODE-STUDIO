<?php

namespace App\Http\Resources\Admin;

use App\Enums\ProductGender;
use App\Enums\ProductStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminProductListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $statusValue = $this->status instanceof ProductStatus
            ? $this->status->value
            : (string) $this->status;

        $genderValue = $this->gender instanceof ProductGender
            ? $this->gender->value
            : (string) $this->gender;

        $totalStock = isset($this->total_stock)
            ? (int) $this->total_stock
            : ($this->relationLoaded('variants')
                ? $this->variants->sum('stock_quantity')
                : 0);

        $variantsCount = isset($this->variants_count)
            ? (int) $this->variants_count
            : ($this->relationLoaded('variants')
                ? $this->variants->count()
                : 0);

        $mainImage = $this->mainImage;
        if (!$mainImage && $this->relationLoaded('images')) {
            $mainImage = $this->images->first();
        }

        return [
            'id'               => $this->id,
            'name'             => $this->name,
            'slug'             => $this->slug,
            'gender'           => $genderValue,
            'base_price'       => (int) $this->base_price,
            'compare_at_price' => $this->compare_at_price !== null ? (int) $this->compare_at_price : null,
            'status'           => $statusValue,
            'is_featured'      => (bool) $this->is_featured,
            'variants_count'   => $variantsCount,
            'total_stock'      => $totalStock,
            'published_at'     => $this->published_at?->toISOString(),
            'created_at'       => $this->created_at?->toISOString(),
            'updated_at'       => $this->updated_at?->toISOString(),
            'category'         => $this->whenLoaded('category', function () {
                return $this->category ? [
                    'id'   => $this->category->id,
                    'name' => $this->category->name,
                    'slug' => $this->category->slug,
                ] : null;
            }),
            'brand'            => $this->whenLoaded('brand', function () {
                return $this->brand ? [
                    'id'   => $this->brand->id,
                    'name' => $this->brand->name,
                    'slug' => $this->brand->slug,
                ] : null;
            }),
            'main_image'       => $mainImage ? [
                'id'        => $mainImage->id,
                'image_url' => $mainImage->image_url,
                'alt_text'  => $mainImage->alt_text,
            ] : null,
        ];
    }
}
