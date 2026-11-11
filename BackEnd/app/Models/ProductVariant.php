<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProductVariant extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'product_id',
        'color_id',
        'size_id',
        'sku',
        'stock_quantity',
        'is_active',
        'note',
    ];

    protected $casts = [
        'stock_quantity' => 'integer',
        'is_active'      => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    public function color(): BelongsTo
    {
        return $this->belongsTo(Color::class);
    }

    public function size(): BelongsTo
    {
        return $this->belongsTo(Size::class);
    }

    public function cartItems(): HasMany
    {
        return $this->hasMany(CartItem::class, 'variant_id');
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'variant_id');
    }

    public function stockAdjustments(): HasMany
    {
        return $this->hasMany(StockAdjustment::class, 'variant_id')->orderBy('created_at', 'desc');
    }

    /**
     * Scope lọc các biến thể tồn kho thấp (dùng chung cho AdminStockController và Dashboard)
     */
    public function scopeLowStock($query, ?int $threshold = null)
    {
        $limit = $threshold ?? (int) config('shop.stock.low_stock_threshold', 10);

        return $query->withoutTrashed()
            ->whereHas('product', fn($q) => $q->withoutTrashed())
            ->where('stock_quantity', '<=', $limit);
    }
}
