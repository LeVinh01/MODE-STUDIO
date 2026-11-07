<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductVariantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'sku'            => $this->sku,
            'stock_quantity' => (int) $this->stock_quantity,
            'is_active'      => (bool) $this->is_active,
            'color'          => $this->whenLoaded('color', function () {
                return [
                    'id'       => $this->color->id,
                    'name'     => $this->color->name,
                    'hex_code' => $this->color->hex_code,
                ];
            }),
            'size'           => $this->whenLoaded('size', function () {
                return [
                    'id'         => $this->size->id,
                    'name'       => $this->size->name,
                    'sort_order' => $this->size->sort_order,
                ];
            }),
        ];
    }
}
