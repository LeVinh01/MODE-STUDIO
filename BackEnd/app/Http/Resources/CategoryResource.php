<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $fullImageUrl = null;
        if ($this->image_url) {
            $fullImageUrl = str_starts_with($this->image_url, 'http://') || str_starts_with($this->image_url, 'https://')
                ? $this->image_url
                : url($this->image_url);
        }

        return [
            'id'             => $this->id,
            'name'           => $this->name,
            'slug'           => $this->slug,
            'description'    => $this->description,
            'image_url'      => $fullImageUrl,
            'sort_order'     => $this->sort_order,
            'products_count' => (int) ($this->products_count ?? 0),
            'children'       => CategoryResource::collection($this->whenLoaded('children')),
        ];
    }
}
