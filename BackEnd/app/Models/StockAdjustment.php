<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockAdjustment extends Model
{
    protected $fillable = [
        'variant_id',
        'quantity_before',
        'delta',
        'quantity_after',
        'reason',
        'changed_by',
    ];

    protected $casts = [
        'quantity_before' => 'integer',
        'delta'           => 'integer',
        'quantity_after'  => 'integer',
    ];

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id')->withTrashed();
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
