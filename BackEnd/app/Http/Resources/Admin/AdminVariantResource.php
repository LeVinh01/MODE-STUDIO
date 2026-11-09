<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminVariantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'product_id'     => $this->product_id,
            'color_id'       => $this->color_id,
            'size_id'        => $this->size_id,
            'sku'            => $this->sku,
            'stock_quantity' => (int) $this->stock_quantity,
            'is_active'      => (bool) $this->is_active,
            'note'           => $this->note,
            'deleted_at'     => $this->deleted_at?->toISOString(),
            'created_at'     => $this->created_at?->toISOString(),
            'updated_at'     => $this->updated_at?->toISOString(),
            'color'          => $this->whenLoaded('color', function () {
                return $this->color ? [
                    'id'       => $this->color->id,
                    'name'     => $this->color->name,
                    'hex_code' => $this->color->hex_code,
                ] : null;
            }),
            'size'           => $this->whenLoaded('size', function () {
                return $this->size ? [
                    'id'   => $this->size->id,
                    'name' => $this->size->name,
                ] : null;
            }),
        ];
    }
}
