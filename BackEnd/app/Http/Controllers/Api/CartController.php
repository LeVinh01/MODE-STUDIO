<?php

namespace App\Http\Controllers\Api;

use App\Enums\ProductStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\CartItemStoreRequest;
use App\Http\Requests\CartItemUpdateRequest;
use App\Http\Resources\CartItemResource;
use App\Models\CartItem;
use App\Models\ProductVariant;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CartController extends Controller
{
    /**
     * Lấy danh sách sản phẩm trong giỏ hàng của người dùng hiện tại
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $items = CartItem::where('user_id', $user->id)
            ->with([
                'variant.color',
                'variant.size',
                'variant.product' => fn($q) => $q->withTrashed()->with('mainImage'),
            ])
            ->orderBy('id', 'asc')
            ->get();

        $itemsData = CartItemResource::collection($items)->resolve();

        $subtotal = 0;
        $totalQuantity = 0;
        $hasUnpurchasable = false;

        foreach ($itemsData as $item) {
            $totalQuantity += (int) $item['quantity'];

            if ($item['is_purchasable']) {
                $subtotal += (int) $item['line_total'];
            } else {
                $hasUnpurchasable = true;
            }
        }

        return response()->json([
            'items'                   => $itemsData,
            'subtotal'                => $subtotal,
            'total_quantity'          => $totalQuantity,
            'items_count'             => count($itemsData),
            'has_unpurchasable_items' => $hasUnpurchasable,
        ], 200);
    }

    /**
     * Thêm sản phẩm (biến thể) vào giỏ hàng
     * Bọc trong transaction và khóa dòng để chống đua đồng thời (race condition)
     */
    public function store(CartItemStoreRequest $request): JsonResponse
    {
        $user = $request->user();
        $variantId = (int) $request->validated('variant_id');
        $quantity = (int) $request->validated('quantity');
        $maxItemQuantity = config('shop.cart.max_item_quantity', 20);

        $cartItem = DB::transaction(function () use ($user, $variantId, $quantity, $maxItemQuantity) {
            // Khóa dòng variant để kiểm tra tồn kho và trạng thái
            $variant = ProductVariant::where('id', $variantId)
                ->with(['product' => fn($q) => $q->withTrashed()])
                ->lockForUpdate()
                ->firstOrFail();

            $product = $variant->product;
            $productStatus = $product?->status instanceof ProductStatus
                ? $product->status->value
                : (string) ($product?->status ?? '');

            if (!$variant->is_active || !$product || $product->trashed() || $productStatus !== 'active') {
                throw new HttpResponseException(response()->json([
                    'message' => 'Sản phẩm hoặc biến thể này hiện không khả dụng.',
                ], 422));
            }

            // Khóa dòng giỏ hàng hiện tại (nếu có)
            $cartItem = CartItem::where('user_id', $user->id)
                ->where('variant_id', $variantId)
                ->lockForUpdate()
                ->first();

            $currentQuantity = $cartItem ? (int) $cartItem->quantity : 0;
            $targetQuantity = $currentQuantity + $quantity;

            if ($targetQuantity > $maxItemQuantity) {
                throw new HttpResponseException(response()->json([
                    'message'         => "Số lượng tối đa cho mỗi sản phẩm trong giỏ hàng là {$maxItemQuantity}.",
                    'errors'          => [
                        'quantity' => ["Số lượng tối đa cho mỗi sản phẩm trong giỏ hàng là {$maxItemQuantity}."],
                    ],
                    'available_stock' => (int) $variant->stock_quantity,
                ], 422));
            }

            if ($targetQuantity > $variant->stock_quantity) {
                throw new HttpResponseException(response()->json([
                    'message'         => "Số lượng yêu cầu vượt quá số lượng còn lại trong kho. Hiện chỉ còn {$variant->stock_quantity} sản phẩm.",
                    'errors'          => [
                        'quantity' => ["Số lượng yêu cầu vượt quá số lượng còn lại trong kho. Hiện chỉ còn {$variant->stock_quantity} sản phẩm."],
                    ],
                    'available_stock' => (int) $variant->stock_quantity,
                ], 422));
            }

            if ($cartItem) {
                $cartItem->update(['quantity' => $targetQuantity]);
            } else {
                try {
                    $cartItem = CartItem::create([
                        'user_id'    => $user->id,
                        'variant_id' => $variantId,
                        'quantity'   => $targetQuantity,
                    ]);
                } catch (UniqueConstraintViolationException) {
                    // Nếu hai request cùng tạo đồng thời thì cộng dồn vào dòng đã tạo trước
                    $cartItem = CartItem::where('user_id', $user->id)
                        ->where('variant_id', $variantId)
                        ->lockForUpdate()
                        ->firstOrFail();
                    $cartItem->update(['quantity' => $cartItem->quantity + $quantity]);
                }
            }

            return $cartItem;
        });

        $cartItem->load([
            'variant.color',
            'variant.size',
            'variant.product' => fn($q) => $q->withTrashed()->with('mainImage'),
        ]);

        return response()->json([
            'message' => 'Đã thêm sản phẩm vào giỏ hàng thành công.',
            'item'    => new CartItemResource($cartItem),
        ], 201);
    }

    /**
     * Thay đổi số lượng của một dòng giỏ hàng
     */
    public function update(CartItemUpdateRequest $request, int $id): JsonResponse
    {
        $user = $request->user();
        $quantity = (int) $request->validated('quantity');
        $maxItemQuantity = config('shop.cart.max_item_quantity', 20);

        $cartItem = DB::transaction(function () use ($user, $id, $quantity, $maxItemQuantity) {
            $cartItem = CartItem::where('id', $id)
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if (!$cartItem) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Sản phẩm trong giỏ hàng không tồn tại.',
                ], 404));
            }

            $variant = ProductVariant::where('id', $cartItem->variant_id)
                ->with(['product' => fn($q) => $q->withTrashed()])
                ->lockForUpdate()
                ->firstOrFail();

            $product = $variant->product;
            $productStatus = $product?->status instanceof ProductStatus
                ? $product->status->value
                : (string) ($product?->status ?? '');

            if (!$variant->is_active || !$product || $product->trashed() || $productStatus !== 'active') {
                throw new HttpResponseException(response()->json([
                    'message' => 'Sản phẩm hoặc biến thể này hiện không khả dụng.',
                ], 422));
            }

            if ($quantity > $maxItemQuantity) {
                throw new HttpResponseException(response()->json([
                    'message'         => "Số lượng tối đa cho mỗi sản phẩm trong giỏ hàng là {$maxItemQuantity}.",
                    'errors'          => [
                        'quantity' => ["Số lượng tối đa cho mỗi sản phẩm trong giỏ hàng là {$maxItemQuantity}."],
                    ],
                    'available_stock' => (int) $variant->stock_quantity,
                ], 422));
            }

            if ($quantity > $variant->stock_quantity) {
                throw new HttpResponseException(response()->json([
                    'message'         => "Số lượng yêu cầu vượt quá số lượng còn lại trong kho. Hiện chỉ còn {$variant->stock_quantity} sản phẩm.",
                    'errors'          => [
                        'quantity' => ["Số lượng yêu cầu vượt quá số lượng còn lại trong kho. Hiện chỉ còn {$variant->stock_quantity} sản phẩm."],
                    ],
                    'available_stock' => (int) $variant->stock_quantity,
                ], 422));
            }

            $cartItem->update(['quantity' => $quantity]);

            return $cartItem;
        });

        $cartItem->load([
            'variant.color',
            'variant.size',
            'variant.product' => fn($q) => $q->withTrashed()->with('mainImage'),
        ]);

        return response()->json([
            'message' => 'Đã cập nhật số lượng thành công.',
            'item'    => new CartItemResource($cartItem),
        ], 200);
    }

    /**
     * Xóa một dòng khỏi giỏ hàng
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $cartItem = CartItem::where('id', $id)->where('user_id', $user->id)->first();

        if (!$cartItem) {
            return response()->json([
                'message' => 'Sản phẩm trong giỏ hàng không tồn tại.',
            ], 404);
        }

        $cartItem->delete();

        return response()->json([
            'message' => 'Đã xóa sản phẩm khỏi giỏ hàng.',
        ], 200);
    }

    /**
     * Xóa toàn bộ sản phẩm khỏi giỏ hàng
     */
    public function clear(Request $request): JsonResponse
    {
        $user = $request->user();
        CartItem::where('user_id', $user->id)->delete();

        return response()->json([
            'message' => 'Đã làm trống giỏ hàng.',
        ], 200);
    }
}
