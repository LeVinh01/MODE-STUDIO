<?php

namespace App\Http\Resources;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
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
            'created_at'       => $this->created_at?->toISOString(),
            'items'            => OrderItemResource::collection($this->whenLoaded('items')),
        ];
    }
}
