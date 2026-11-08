<?php

namespace App\Http\Controllers\Api;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\ProductStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\OrderStoreRequest;
use App\Http\Resources\OrderResource;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductVariant;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    /**
     * Tạo đơn hàng mới từ giỏ hàng của người dùng (Checkout COD)
     */
    public function store(OrderStoreRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $order = DB::transaction(function () use ($user, $validated) {
            // 1. Khóa và đọc giỏ hàng của user bên trong transaction để chống double submit
            $cartItems = CartItem::where('user_id', $user->id)
                ->lockForUpdate()
                ->get();

            // Kiểm tra lại giỏ hàng sau khi đã khóa
            if ($cartItems->isEmpty()) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Giỏ hàng của bạn đang trống.',
                    'errors'  => [
                        'cart' => ['Giỏ hàng của bạn đang trống.'],
                    ],
                ], 422));
            }

            // 2. Lấy danh sách variant_id và sắp xếp tăng dần để tránh deadlock giữa các giao dịch
            $variantIds = $cartItems->pluck('variant_id')->unique()->sort()->values()->all();

            // 3. Khóa các biến thể theo thứ tự id tăng dần
            $variants = ProductVariant::whereIn('id', $variantIds)
                ->orderBy('id', 'asc')
                ->with([
                    'product' => fn($q) => $q->withTrashed()->with('mainImage'),
                    'color',
                    'size',
                ])
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            // 4. Kiểm tra điều kiện từng dòng
            $insufficientItems = [];
            $linesToProcess = [];

            foreach ($cartItems as $cartItem) {
                $variant = $variants->get($cartItem->variant_id);
                $product = $variant?->product;

                $productStatus = $product?->status instanceof ProductStatus
                    ? $product->status->value
                    : (string) ($product?->status ?? '');

                $isAvailable = $variant
                    && (bool) $variant->is_active
                    && $product
                    && !$product->trashed()
                    && $productStatus === 'active';

                $stock = $variant ? (int) $variant->stock_quantity : 0;
                $requested = (int) $cartItem->quantity;

                if (!$isAvailable || $requested > $stock) {
                    $insufficientItems[] = [
                        'variant_id'         => $cartItem->variant_id,
                        'product_name'       => $product ? $product->name : ($variant?->sku ?? 'Sản phẩm không khả dụng'),
                        'requested_quantity' => $requested,
                        'available_stock'    => max(0, $stock),
                    ];
                } else {
                    $linesToProcess[] = [
                        'cart_item' => $cartItem,
                        'variant'   => $variant,
                        'product'   => $product,
                        'quantity'  => $requested,
                    ];
                }
            }

            // Nếu có bất kỳ dòng nào thiếu tồn hoặc không khả dụng -> Rollback toàn bộ
            if (!empty($insufficientItems)) {
                throw new HttpResponseException(response()->json([
                    'message'            => 'Một số sản phẩm trong giỏ hàng không đủ số lượng hoặc không còn khả dụng.',
                    'errors'             => [
                        'cart' => ['Một số sản phẩm trong giỏ hàng không đủ số lượng hoặc không còn khả dụng.'],
                    ],
                    'insufficient_items' => $insufficientItems,
                ], 422));
            }

            // 5. Tính toán tiền tệ dựa trên base_price hiện hành từ database
            $subtotal = 0;
            foreach ($linesToProcess as &$line) {
                $unitPrice = (int) $line['product']->base_price;
                $lineTotal = $unitPrice * $line['quantity'];
                $line['unit_price'] = $unitPrice;
                $line['line_total'] = $lineTotal;
                $subtotal += $lineTotal;
            }
            unset($line);

            $freeThreshold = (int) config('shop.shipping.free_threshold', 2000000);
            $standardFee = (int) config('shop.shipping.standard_fee', 30000);
            $shippingFee = $subtotal >= $freeThreshold ? 0 : $standardFee;
            $discountAmount = 0;
            $totalAmount = $subtotal + $shippingFee - $discountAmount;

            // 6. Sinh mã đơn hàng duy nhất với tối đa 5 lần thử chống đụng độ mã
            $order = null;
            $maxAttempts = 5;

            for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
                $orderCode = 'MS' . date('ymd') . strtoupper(Str::random(6));

                if (Order::where('order_code', $orderCode)->exists()) {
                    continue;
                }

                try {
                    $order = Order::create([
                        'order_code'       => $orderCode,
                        'user_id'          => $user->id,
                        'status'           => OrderStatus::Pending,
                        'payment_method'   => PaymentMethod::Cod,
                        'payment_status'   => PaymentStatus::Unpaid,
                        'recipient_name'   => $validated['recipient_name'],
                        'recipient_phone'  => $validated['recipient_phone'],
                        'shipping_address' => $validated['shipping_address'],
                        'note'             => $validated['note'] ?? null,
                        'subtotal'         => $subtotal,
                        'shipping_fee'     => $shippingFee,
                        'discount_amount'  => $discountAmount,
                        'total_amount'     => $totalAmount,
                    ]);
                    break;
                } catch (UniqueConstraintViolationException $e) {
                    if ($attempt === $maxAttempts) {
                        throw new \RuntimeException('Không thể tạo mã đơn hàng duy nhất sau 5 lần thử.', 0, $e);
                    }
                }
            }

            if (!$order) {
                throw new \RuntimeException('Không thể khởi tạo đơn hàng.');
            }

            // 7. Tạo chi tiết đơn hàng (order_items snapshot) và trừ tồn kho
            foreach ($linesToProcess as $line) {
                $variant = $line['variant'];
                $product = $line['product'];

                // Trừ tồn kho nguyên tử
                $variant->decrement('stock_quantity', $line['quantity']);

                // Chụp thông tin tại thời điểm mua
                OrderItem::create([
                    'order_id'     => $order->id,
                    'product_id'   => $product->id,
                    'variant_id'   => $variant->id,
                    'product_name' => $product->name,
                    'sku'          => $variant->sku,
                    'color_name'   => $variant->color ? $variant->color->name : 'Tiêu chuẩn',
                    'size_name'    => $variant->size ? $variant->size->name : 'Tiêu chuẩn',
                    'image_url'    => $product->mainImage ? $product->mainImage->image_url : null,
                    'unit_price'   => $line['unit_price'],
                    'quantity'     => $line['quantity'],
                    'line_total'   => $line['line_total'],
                ]);
            }

            // 8. Xóa toàn bộ giỏ hàng của người dùng
            CartItem::where('user_id', $user->id)->delete();

            return $order;
        }, attempts: 3);

        $order->load('items');

        return response()->json([
            'message' => 'Đặt hàng thành công.',
            'order'   => new OrderResource($order),
        ], 201);
    }
}
