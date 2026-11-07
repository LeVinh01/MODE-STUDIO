<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductImageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'url'        => $this->image_url,
            'alt_text'   => $this->alt_text,
            'is_main'    => (bool) $this->is_main,
            'sort_order' => $this->sort_order,
            'color_id'   => $this->color_id,
        ];
    }
}
