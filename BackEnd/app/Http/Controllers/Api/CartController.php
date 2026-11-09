<?php

namespace App\Http\Controllers\Api;

use App\Enums\ProductStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\CartItemStoreRequest;
use App\Http\Requests\CartItemUpdateRequest;
use App\Http\Requests\CartMergeRequest;
use App\Http\Requests\CartQuoteRequest;
use App\Http\Resources\CartItemResource;
use App\Models\CartItem;
use App\Models\ProductVariant;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class CartController extends Controller
{
    /**
     * Lấy danh sách sản phẩm trong giỏ hàng của người dùng hiện tại
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        return response()->json($this->getUserCartSummary($user->id), 200);
    }

    /**
     * Báo giá và kiểm tra trạng thái khả dụng cho giỏ hàng của khách vãng lai (Guest Cart)
     * Public endpoint, không yêu cầu token, có rate limit
     */
    public function quote(CartQuoteRequest $request): JsonResponse
    {
        $maxItemQuantity = (int) config('shop.cart.max_item_quantity', 20);
        $rawItems = $request->input('items', []);

        // Tự động gộp các variant_id trùng lặp trong payload
        $aggregated = [];
        foreach ($rawItems as $item) {
            $vid = (int) $item['variant_id'];
            $qty = (int) $item['quantity'];

            if (!isset($aggregated[$vid])) {
                $aggregated[$vid] = 0;
            }
            $aggregated[$vid] += $qty;
            if ($aggregated[$vid] > $maxItemQuantity) {
                $aggregated[$vid] = $maxItemQuantity;
            }
        }

        $variantIds = array_keys($aggregated);

        // Truy vấn thông tin các biến thể (kể cả biến thể đã xóa mềm để phản hồi chính xác)
        $variants = ProductVariant::withTrashed()
            ->whereIn('id', $variantIds)
            ->with([
                'color',
                'size',
                'product' => fn($q) => $q->withTrashed()->with('mainImage'),
            ])
            ->get()
            ->keyBy('id');

        // Phân loại các variant_id không tồn tại trong DB
        $missingVariantIds = [];
        foreach ($variantIds as $vid) {
            if (!$variants->has($vid)) {
                $missingVariantIds[] = $vid;
            }
        }

        // Tạo danh sách DTO để render qua CartItemResource
        $quoteItems = collect();
        foreach ($aggregated as $vid => $qty) {
            if ($variants->has($vid)) {
                $variant = $variants->get($vid);
                $quoteItems->push((object) [
                    'id'         => null,
                    'variant_id' => $vid,
                    'quantity'   => $qty,
                    'variant'    => $variant,
                    'is_quote'   => true,
                ]);
            }
        }

        $summary = $this->buildCartSummary($quoteItems);
        $summary['missing_variant_ids'] = $missingVariantIds;

        return response()->json($summary, 200);
    }

    /**
     * Gộp giỏ hàng của khách vãng lai vào tài khoản sau khi đăng nhập
     * Yêu cầu auth:sanctum, idempotency qua merge_token
     */
    public function merge(CartMergeRequest $request): JsonResponse
    {
        $user = $request->user();
        $mergeToken = (string) $request->validated('merge_token');
        $cacheKey = "cart_merge:{$user->id}:{$mergeToken}";

        // Chống gộp hai lần: Cache::add trả về true nếu key mới được tạo, false nếu key đã tồn tại
        $isFirstAttempt = Cache::add($cacheKey, true, now()->addDay());

        if (!$isFirstAttempt) {
            return response()->json([
                'message'        => 'Phiên gộp giỏ hàng này đã được thực hiện trước đó.',
                'already_merged' => true,
                'cart'           => $this->getUserCartSummary($user->id),
                'skipped'        => [],
                'adjusted'       => [],
            ], 200);
        }

        $maxItemQuantity = (int) config('shop.cart.max_item_quantity', 20);
        $rawItems = $request->input('items', []);

        // Gộp các phần tử trùng variant_id trong payload trước
        $aggregated = [];
        foreach ($rawItems as $item) {
            $vid = (int) $item['variant_id'];
            $qty = (int) $item['quantity'];

            if (!isset($aggregated[$vid])) {
                $aggregated[$vid] = 0;
            }
            $aggregated[$vid] += $qty;
        }

        // Nếu giỏ khách rỗng, trả về ngay giỏ hiện tại
        if (empty($aggregated)) {
            return response()->json([
                'message'        => 'Đã đồng bộ giỏ hàng thành công.',
                'already_merged' => false,
                'cart'           => $this->getUserCartSummary($user->id),
                'skipped'        => [],
                'adjusted'       => [],
            ], 200);
        }

        $skipped = [];
        $adjusted = [];

        try {
            DB::transaction(function () use ($user, $aggregated, $maxItemQuantity, &$skipped, &$adjusted) {
                // 1. Khóa các dòng giỏ hàng hiện tại của user
                $existingCartItems = CartItem::where('user_id', $user->id)
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('variant_id');

                // 2. Khóa các biến thể sản phẩm theo thứ tự id tăng dần để tránh deadlock
                $sortedVariantIds = array_keys($aggregated);
                sort($sortedVariantIds, SORT_NUMERIC);

                $lockedVariants = ProductVariant::withTrashed()
                    ->whereIn('id', $sortedVariantIds)
                    ->with(['product' => fn($q) => $q->withTrashed()])
                    ->orderBy('id', 'asc')
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

                // 3. Xử lý từng biến thể được gửi lên
                foreach ($aggregated as $vid => $requestedQty) {
                    // Biến thể không tồn tại trong DB
                    if (!$lockedVariants->has($vid)) {
                        $skipped[] = [
                            'variant_id' => $vid,
                            'reason'     => 'Biến thể sản phẩm không tồn tại.',
                        ];
                        continue;
                    }

                    $variant = $lockedVariants->get($vid);

                    // Biến thể đã bị xóa mềm
                    if ($variant->trashed()) {
                        $skipped[] = [
                            'variant_id' => $vid,
                            'reason'     => 'Biến thể sản phẩm đã ngừng kinh doanh.',
                        ];
                        continue;
                    }
                    $product = $variant->product;
                    $productStatus = $product?->status instanceof ProductStatus
                        ? $product->status->value
                        : (string) ($product?->status ?? '');

                    // Sản phẩm bị xóa mềm hoặc chưa kích hoạt / chưa mở bán
                    $isProductActive = $product
                        && !$product->trashed()
                        && $productStatus === 'active'
                        && (!$product->published_at || $product->published_at <= now());

                    if (!$isProductActive) {
                        $skipped[] = [
                            'variant_id' => $vid,
                            'reason'     => 'Sản phẩm đã ngừng kinh doanh.',
                        ];
                        continue;
                    }

                    // Biến thể không kích hoạt
                    if (!$variant->is_active) {
                        $skipped[] = [
                            'variant_id' => $vid,
                            'reason'     => 'Biến thể tạm ngừng bán.',
                        ];
                        continue;
                    }

                    // Sản phẩm đã hết hàng trong kho
                    if ($variant->stock_quantity <= 0) {
                        $skipped[] = [
                            'variant_id' => $vid,
                            'reason'     => 'Sản phẩm đã hết hàng.',
                        ];
                        continue;
                    }

                    $existingItem = $existingCartItems->get($vid);
                    $currentQuantity = $existingItem ? (int) $existingItem->quantity : 0;
                    $targetQuantity = $currentQuantity + $requestedQty;

                    // Giới hạn tối đa theo min(tồn kho, max_item_quantity)
                    $allowedLimit = min((int) $variant->stock_quantity, $maxItemQuantity);

                    if ($targetQuantity > $allowedLimit) {
                        $finalQuantity = max($currentQuantity, $allowedLimit);
                        $adjusted[] = [
                            'variant_id' => $vid,
                            'requested'  => $targetQuantity,
                            'final'      => $finalQuantity,
                            'reason'     => ($allowedLimit === (int) $variant->stock_quantity && $variant->stock_quantity < $maxItemQuantity)
                                ? "Số lượng được điều chỉnh về {$finalQuantity} theo tồn kho thực tế."
                                : "Số lượng tối đa cho mỗi sản phẩm là {$finalQuantity}.",
                        ];
                    } else {
                        $finalQuantity = $targetQuantity;
                    }

                    // Cập nhật hoặc tạo mới nếu số lượng hợp lệ và tăng so với hiện tại
                    if ($finalQuantity > $currentQuantity) {
                        if ($existingItem) {
                            $existingItem->update(['quantity' => $finalQuantity]);
                        } else {
                            CartItem::create([
                                'user_id'    => $user->id,
                                'variant_id' => $vid,
                                'quantity'   => $finalQuantity,
                            ]);
                        }
                    }
                }
            }, attempts: 3);
        } catch (\Throwable $e) {
            Cache::forget($cacheKey);
            throw $e;
        }

        return response()->json([
            'message'        => 'Đã đồng bộ giỏ hàng thành công.',
            'already_merged' => false,
            'cart'           => $this->getUserCartSummary($user->id),
            'skipped'        => $skipped,
            'adjusted'       => $adjusted,
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

    /**
     * Tổng hợp dữ liệu giỏ hàng chuẩn hóa
     */
    protected function buildCartSummary($items): array
    {
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

        return [
            'items'                   => $itemsData,
            'subtotal'                => $subtotal,
            'total_quantity'          => $totalQuantity,
            'items_count'             => count($itemsData),
            'has_unpurchasable_items' => $hasUnpurchasable,
        ];
    }

    /**
     * Lấy dữ liệu giỏ hàng hoàn chỉnh của một người dùng
     */
    protected function getUserCartSummary(int $userId): array
    {
        $items = CartItem::where('user_id', $userId)
            ->with([
                'variant.color',
                'variant.size',
                'variant.product' => fn($q) => $q->withTrashed()->with('mainImage'),
            ])
            ->orderBy('id', 'asc')
            ->get();

        return $this->buildCartSummary($items);
    }
}
