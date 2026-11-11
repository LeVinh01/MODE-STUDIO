<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminStockAdjustmentRequest;
use App\Http\Resources\Admin\AdminLowStockResource;
use App\Http\Resources\Admin\AdminStockAdjustmentResource;
use App\Models\ProductVariant;
use App\Models\StockAdjustment;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class AdminStockController extends Controller
{
    public function adjust(AdminStockAdjustmentRequest $request, int $variantId): JsonResponse
    {
        $adjustment = DB::transaction(function () use ($request, $variantId) {
            $variant = ProductVariant::where('id', $variantId)
                ->lockForUpdate()
                ->firstOrFail();

            $type = $request->input('type');
            $quantity = (int) $request->input('quantity');
            $before = (int) $variant->stock_quantity;

            if ($type === 'set') {
                $after = $quantity;
                $delta = $after - $before;
            } elseif ($type === 'increment') {
                $delta = $quantity;
                $after = $before + $delta;
            } else { // decrement
                $delta = -$quantity;
                $after = $before + $delta;
            }

            if ($after < 0) {
                throw new HttpResponseException(response()->json([
                    'message' => "Số lượng tồn kho sau khi điều chỉnh không thể nhỏ hơn 0. Tồn kho hiện tại là {$before}.",
                    'errors'  => [
                        'quantity' => ["Số lượng điều chỉnh vượt quá tồn kho hiện tại ({$before})."],
                    ],
                ], 422));
            }

            $variant->update(['stock_quantity' => $after]);

            return StockAdjustment::create([
                'variant_id'      => $variant->id,
                'quantity_before' => $before,
                'delta'           => $delta,
                'quantity_after'  => $after,
                'reason'          => $request->input('reason'),
                'changed_by'      => $request->user()->id,
            ]);
        });

        $adjustment->load('changedBy');

        return (new AdminStockAdjustmentResource($adjustment))
            ->response()
            ->setStatusCode(200);
    }

    public function history(Request $request, int $variantId): AnonymousResourceCollection
    {
        // Cho phép xem lịch sử của cả biến thể đã xóa mềm
        $variant = ProductVariant::withTrashed()->findOrFail($variantId);

        $perPage = (int) $request->input('per_page', 15);
        $adjustments = StockAdjustment::where('variant_id', $variant->id)
            ->with('changedBy')
            ->orderBy('id', 'desc')
            ->paginate($perPage);

        return AdminStockAdjustmentResource::collection($adjustments);
    }

    public function lowStock(Request $request): AnonymousResourceCollection
    {
        $defaultThreshold = (int) config('shop.stock.low_stock_threshold', 10);
        $threshold = $request->filled('threshold') ? (int) $request->input('threshold') : $defaultThreshold;
        $perPage = (int) $request->input('per_page', 20);

        $variants = ProductVariant::lowStock($threshold)
            ->with([
                'product' => fn($q) => $q->with('category'),
                'color',
                'size',
            ])
            ->orderBy('stock_quantity', 'asc')
            ->orderBy('id', 'asc')
            ->paginate($perPage);

        return AdminLowStockResource::collection($variants);
    }
}
