<?php

namespace App\Models;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    protected $fillable = [
        'order_code',
        'user_id',
        'status',
        'payment_method',
        'payment_status',
        'recipient_name',
        'recipient_phone',
        'shipping_address',
        'note',
        'subtotal',
        'shipping_fee',
        'discount_amount',
        'total_amount',
        'cancel_reason',
        'cancelled_at',
        'paid_at',
    ];

    protected $casts = [
        'status'          => OrderStatus::class,
        'payment_method'  => PaymentMethod::class,
        'payment_status'  => PaymentStatus::class,
        'subtotal'        => 'integer',
        'shipping_fee'    => 'integer',
        'discount_amount' => 'integer',
        'total_amount'    => 'integer',
        'cancelled_at'    => 'datetime',
        'paid_at'         => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class)->orderBy('id', 'asc');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->orderBy('id', 'desc');
    }

    public function latestPayment(): HasOne
    {
        return $this->hasOne(Payment::class)->latestOfMany();
    }
}
