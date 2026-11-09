<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminProductImageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'product_id' => $this->product_id,
            'color_id'   => $this->color_id,
            'image_url'  => $this->image_url,
            'alt_text'   => $this->alt_text,
            'is_main'    => (bool) $this->is_main,
            'sort_order' => (int) $this->sort_order,
            'color'      => $this->whenLoaded('color', function () {
                return $this->color ? [
                    'id'       => $this->color->id,
                    'name'     => $this->color->name,
                    'hex_code' => $this->color->hex_code,
                ] : null;
            }),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
