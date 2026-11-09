<?php

namespace App\Http\Resources\Admin;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Http\Resources\OrderItemResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminOrderDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $status = $this->status instanceof OrderStatus
            ? $this->status->value
            : (string) $this->status;

        $paymentMethod = $this->payment_method instanceof PaymentMethod
            ? $this->payment_method->value
            : (string) $this->payment_method;

        $paymentStatus = $this->payment_status instanceof PaymentStatus
            ? $this->payment_status->value
            : (string) $this->payment_status;

        $customer = null;
        if ($this->relationLoaded('user') && $this->user) {
            $customer = [
                'id'        => $this->user->id,
                'full_name' => $this->user->full_name,
                'email'     => $this->user->email,
                'phone'     => $this->user->phone,
            ];
        }

        $itemsCount = $this->items_count ?? ($this->relationLoaded('items') ? $this->items->count() : 0);

        return [
            'order_code'       => $this->order_code,
            'status'           => $status,
            'payment_method'   => $paymentMethod,
            'payment_status'   => $paymentStatus,
            'recipient_name'   => $this->recipient_name,
            'recipient_phone'  => $this->recipient_phone,
            'shipping_address' => $this->shipping_address,
            'note'             => $this->note,
            'subtotal'         => (int) $this->subtotal,
            'shipping_fee'     => (int) $this->shipping_fee,
            'discount_amount'  => (int) $this->discount_amount,
            'total_amount'     => (int) $this->total_amount,
            'cancel_reason'    => $this->cancel_reason,
            'cancelled_at'     => $this->cancelled_at?->toISOString(),
            'paid_at'          => $this->paid_at?->toISOString(),
            'items_count'      => (int) $itemsCount,
            'created_at'       => $this->created_at?->toISOString(),
            'customer'         => $customer,
            'items'            => OrderItemResource::collection($this->whenLoaded('items')),
            'status_histories' => AdminOrderStatusHistoryResource::collection($this->whenLoaded('statusHistories')),
        ];
    }
}
