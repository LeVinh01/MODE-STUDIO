<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminOrderStatusHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $changedBy = null;
        if ($this->relationLoaded('changedBy') && $this->changedBy) {
            $changedBy = [
                'id'        => $this->changedBy->id,
                'full_name' => $this->changedBy->full_name,
                'email'     => $this->changedBy->email,
                'role'      => $this->changedBy->role?->name,
            ];
        }

        return [
            'id'          => $this->id,
            'from_status' => $this->from_status,
            'to_status'   => $this->to_status,
            'reason'      => $this->reason,
            'created_at'  => $this->created_at?->toISOString(),
            'changed_by'  => $changedBy,
        ];
    }
}
