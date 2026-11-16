<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductSuggestionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $thumbnail = $this->mainImage?->image_url;
        if (!$thumbnail && $this->relationLoaded('images')) {
            $thumbnail = $this->images->first()?->image_url;
        }

        return [
            'id'        => $this->id,
            'name'      => $this->name,
            'slug'      => $this->slug,
            'thumbnail' => $thumbnail,
            'price'     => (int) $this->base_price,
        ];
    }
}
