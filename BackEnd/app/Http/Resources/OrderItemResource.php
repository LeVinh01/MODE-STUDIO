<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'product_id'   => $this->product_id,
            'variant_id'   => $this->variant_id,
            'product_name' => $this->product_name,
            'sku'          => $this->sku,
            'color_name'   => $this->color_name,
            'size_name'    => $this->size_name,
            'image_url'    => $this->image_url,
            'unit_price'   => (int) $this->unit_price,
            'quantity'     => (int) $this->quantity,
            'line_total'   => (int) $this->line_total,
        ];
    }
}
