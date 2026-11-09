<?php

namespace App\Http\Resources\Admin;

use App\Enums\ProductGender;
use App\Enums\ProductStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminProductDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $statusValue = $this->status instanceof ProductStatus
            ? $this->status->value
            : (string) $this->status;

        $genderValue = $this->gender instanceof ProductGender
            ? $this->gender->value
            : (string) $this->gender;

        $variants = $this->relationLoaded('variants')
            ? AdminVariantResource::collection($this->variants)
            : [];

        $images = $this->relationLoaded('images')
            ? AdminProductImageResource::collection($this->images)
            : [];

        return [
            'id'               => $this->id,
            'name'             => $this->name,
            'slug'             => $this->slug,
            'description'      => $this->description,
            'material'         => $this->material,
            'gender'           => $genderValue,
            'base_price'       => (int) $this->base_price,
            'compare_at_price' => $this->compare_at_price !== null ? (int) $this->compare_at_price : null,
            'status'           => $statusValue,
            'is_featured'      => (bool) $this->is_featured,
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
            'variants'         => $variants,
            'images'           => $images,
        ];
    }
}
