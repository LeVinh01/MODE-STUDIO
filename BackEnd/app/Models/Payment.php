<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = [
        'order_id',
        'provider',
        'txn_ref',
        'amount',
        'status',
        'bank_code',
        'provider_transaction_no',
        'raw_response',
        'paid_at',
    ];

    protected $casts = [
        'amount'       => 'integer',
        'raw_response' => 'array',
        'paid_at'      => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
