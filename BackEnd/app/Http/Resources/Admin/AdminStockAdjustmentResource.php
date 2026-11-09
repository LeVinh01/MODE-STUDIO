<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminStockAdjustmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'variant_id'      => $this->variant_id,
            'quantity_before' => (int) $this->quantity_before,
            'delta'           => (int) $this->delta,
            'quantity_after'  => (int) $this->quantity_after,
            'reason'          => $this->reason,
            'changed_by'      => $this->whenLoaded('changedBy', function () {
                return $this->changedBy ? [
                    'id'        => $this->changedBy->id,
                    'full_name' => $this->changedBy->full_name,
                    'email'     => $this->changedBy->email,
                    'role'      => $this->changedBy->role,
                ] : null;
            }),
            'created_at'      => $this->created_at?->toISOString(),
        ];
    }
}
