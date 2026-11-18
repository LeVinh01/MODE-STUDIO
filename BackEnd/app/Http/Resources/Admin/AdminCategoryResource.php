<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminCategoryResource extends JsonResource
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
            'parent_id'      => $this->parent_id,
            'description'    => $this->description,
            'image_url'      => $fullImageUrl,
            'sort_order'     => (int) $this->sort_order,
            'is_active'      => (bool) $this->is_active,
            'products_count' => (int) ($this->products_count ?? 0),
            'children_count' => (int) ($this->children_count ?? 0),
            'parent'         => $this->whenLoaded('parent', function () {
                return $this->parent ? [
                    'id'   => $this->parent->id,
                    'name' => $this->parent->name,
                    'slug' => $this->parent->slug,
                ] : null;
            }),
            'children'       => AdminCategoryResource::collection($this->whenLoaded('children')),
            'created_at'     => $this->created_at?->toISOString(),
            'updated_at'     => $this->updated_at?->toISOString(),
        ];
    }
}
