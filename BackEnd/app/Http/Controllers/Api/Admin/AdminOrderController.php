<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminOrderIndexRequest;
use App\Http\Requests\Admin\AdminOrderUpdateStatusRequest;
use App\Http\Resources\Admin\AdminOrderDetailResource;
use App\Http\Resources\Admin\AdminOrderListResource;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\ProductVariant;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class AdminOrderController extends Controller
{
    /**
     * Danh sách đơn hàng cho admin/operator với bộ lọc, tìm kiếm và phân trang
     */
    public function index(AdminOrderIndexRequest $request): AnonymousResourceCollection
    {
        $query = Order::query()
            ->with(['user.role'])
            ->withCount('items')
            ->orderBy('id', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->input('payment_status'));
        }

        if ($request->filled('from')) {
            $fromUtc = \Carbon\Carbon::createFromFormat('Y-m-d', $request->input('from'), 'Asia/Ho_Chi_Minh')->startOfDay()->setTimezone('UTC');
            $query->where('created_at', '>=', $fromUtc);
        }

        if ($request->filled('to')) {
            $toUtc = \Carbon\Carbon::createFromFormat('Y-m-d', $request->input('to'), 'Asia/Ho_Chi_Minh')->endOfDay()->setTimezone('UTC');
            $query->where('created_at', '<=', $toUtc);
        }

        if ($request->filled('search')) {
            $keyword = trim((string) $request->input('search'));
            // Escape các ký tự đặc biệt !, % và _ trước khi đưa vào mệnh đề LIKE
            $escaped = str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $keyword);
            $pattern = "%{$escaped}%";

            $query->where(function ($q) use ($pattern) {
                $q->whereRaw("order_code LIKE ? ESCAPE '!'", [$pattern])
                  ->orWhereRaw("recipient_name LIKE ? ESCAPE '!'", [$pattern])
                  ->orWhereRaw("recipient_phone LIKE ? ESCAPE '!'", [$pattern]);
            });
        }

        $perPage = (int) $request->input('per_page', 10);
        $orders = $query->paginate($perPage);

        return AdminOrderListResource::collection($orders);
    }

    /**
     * Chi tiết đơn hàng cho admin/operator kèm items, thông tin khách và lịch sử trạng thái
     */
    public function show(Request $request, string $order_code): JsonResponse
    {
        $order = Order::where('order_code', $order_code)
            ->with([
                'user.role',
                'items',
                'statusHistories.changedBy.role',
                'latestPayment',
            ])
            ->first();

        if (!$order) {
            return response()->json([
                'message' => 'Đơn hàng không tồn tại.',
            ], 404);
        }

        return response()->json([
            'order' => new AdminOrderDetailResource($order),
        ], 200);
    }

    /**
     * Cập nhật trạng thái đơn hàng theo máy trạng thái nghiệp vụ
     */
    public function updateStatus(AdminOrderUpdateStatusRequest $request, string $order_code): JsonResponse
    {
        $targetStatus = OrderStatus::from($request->input('status'));
        $user = $request->user();

        $order = DB::transaction(function () use ($request, $order_code, $targetStatus, $user) {
            // 1. Khóa và đọc dòng đơn hàng trước khi kiểm tra trạng thái
            $order = Order::where('order_code', $order_code)
                ->with('items')
                ->lockForUpdate()
                ->first();

            if (!$order) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Đơn hàng không tồn tại.',
                ], 404));
            }

            $currentStatus = $order->status;

            // 2. Kiểm tra nếu gửi lại cùng trạng thái hiện tại
            if ($currentStatus === $targetStatus) {
                throw new HttpResponseException(response()->json([
                    'message' => "Đơn hàng hiện đã ở trạng thái {$currentStatus->value}. Không thể chuyển sang cùng trạng thái.",
                ], 422));
            }

            // 3. Kiểm tra nếu đơn đã ở trạng thái cuối (terminal state)
            if ($currentStatus === OrderStatus::Delivered || $currentStatus === OrderStatus::Cancelled) {
                throw new HttpResponseException(response()->json([
                    'message' => "Không thể thay đổi trạng thái của đơn hàng đã {$currentStatus->value}.",
                ], 422));
            }

            // Đơn hàng thanh toán VNPay: chỉ được chuyển sang confirmed/shipping/delivered khi đã thanh toán (paid)
            if ($order->payment_method === PaymentMethod::Vnpay
                && $targetStatus !== OrderStatus::Cancelled
                && $order->payment_status !== PaymentStatus::Paid) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Đơn hàng thanh toán qua VNPay chưa hoàn tất thanh toán. Không thể xử lý đơn hàng.',
                ], 422));
            }

            // 4. Kiểm tra tính hợp lệ của máy trạng thái
            switch ($currentStatus) {
                case OrderStatus::Pending:
                    if ($targetStatus !== OrderStatus::Confirmed && $targetStatus !== OrderStatus::Cancelled) {
                        throw new HttpResponseException(response()->json([
                            'message' => "Không thể chuyển trạng thái từ pending sang {$targetStatus->value}.",
                        ], 422));
                    }
                    break;

                case OrderStatus::Confirmed:
                    if ($targetStatus !== OrderStatus::Shipping && $targetStatus !== OrderStatus::Cancelled) {
                        throw new HttpResponseException(response()->json([
                            'message' => "Không thể chuyển trạng thái từ confirmed sang {$targetStatus->value}.",
                        ], 422));
                    }
                    break;

                case OrderStatus::Shipping:
                    if ($targetStatus !== OrderStatus::Delivered) {
                        throw new HttpResponseException(response()->json([
                            'message' => "Không thể chuyển trạng thái từ shipping sang {$targetStatus->value}.",
                        ], 422));
                    }
                    break;
            }

            // 5. Xử lý theo từng loại trạng thái đích
            $historyReason = $request->filled('reason') ? trim((string) $request->input('reason')) : null;

            if ($targetStatus === OrderStatus::Cancelled) {
                $reason = trim((string) $request->input('reason'));
                if ($reason === '') {
                    throw new HttpResponseException(response()->json([
                        'message' => 'Lý do hủy đơn hàng là bắt buộc khi quản trị viên hủy đơn.',
                        'errors'  => [
                            'reason' => ['Lý do hủy đơn hàng là bắt buộc khi quản trị viên hủy đơn.'],
                        ],
                    ], 422));
                }

                // Khóa các biến thể theo thứ tự ID tăng dần để chống deadlock khi hoàn kho
                $items = $order->items;
                $variantIds = $items->pluck('variant_id')->filter()->unique()->sort()->values()->all();

                if (!empty($variantIds)) {
                    $variants = ProductVariant::withTrashed()
                        ->whereIn('id', $variantIds)
                        ->orderBy('id', 'asc')
                        ->lockForUpdate()
                        ->get()
                        ->keyBy('id');

                    foreach ($items as $item) {
                        if ($item->variant_id && $variant = $variants->get($item->variant_id)) {
                            $variant->increment('stock_quantity', (int) $item->quantity);
                        }
                    }
                }

                $cancelData = [
                    'status'        => OrderStatus::Cancelled,
                    'cancelled_at'  => now(),
                    'cancel_reason' => $reason,
                ];

                if ($order->payment_status === PaymentStatus::Paid) {
                    $cancelData['payment_status']      = PaymentStatus::RefundPending;
                    $cancelData['refund_requested_at'] = now();
                }

                $order->update($cancelData);
            } elseif ($targetStatus === OrderStatus::Shipping) {
                $allowedCarriers = config('shop.shipping.carriers', ['GHN', 'GHTK', 'Viettel Post', 'J&T Express', 'Khác']);
                $carrier = trim((string) $request->input('carrier'));
                $trackingCode = trim((string) $request->input('tracking_code'));

                $shippingErrors = [];
                if ($carrier === '') {
                    $shippingErrors['carrier'] = ['Đơn vị vận chuyển là bắt buộc khi chuyển sang trạng thái đang giao hàng.'];
                } elseif (!in_array($carrier, $allowedCarriers, true)) {
                    $shippingErrors['carrier'] = ['Đơn vị vận chuyển không hợp lệ. Vui lòng chọn trong danh sách được hỗ trợ.'];
                }

                if ($trackingCode === '') {
                    $shippingErrors['tracking_code'] = ['Mã vận đơn là bắt buộc khi chuyển sang trạng thái đang giao hàng.'];
                } elseif (mb_strlen($trackingCode) > 100) {
                    $shippingErrors['tracking_code'] = ['Mã vận đơn không được vượt quá 100 ký tự.'];
                }

                if (!empty($shippingErrors)) {
                    throw new HttpResponseException(response()->json([
                        'message' => 'Thông tin đơn vị vận chuyển và mã vận đơn không hợp lệ.',
                        'errors'  => $shippingErrors,
                    ], 422));
                }

                $order->update([
                    'status'        => OrderStatus::Shipping,
                    'carrier'       => $carrier,
                    'tracking_code' => $trackingCode,
                ]);

                $shippingNote = "Đơn vị vận chuyển: {$carrier} | Mã vận đơn: {$trackingCode}";
                $historyReason = $historyReason ? "{$shippingNote} - {$historyReason}" : $shippingNote;
            } elseif ($targetStatus === OrderStatus::Delivered) {
                // Khi chuyển sang delivered: nếu là COD thì tự động cập nhật payment_status = paid
                $updateData = [
                    'status' => OrderStatus::Delivered,
                ];

                if ($order->payment_method === PaymentMethod::Cod) {
                    $updateData['payment_status'] = PaymentStatus::Paid;
                    $updateData['paid_at'] = now();
                }

                $order->update($updateData);
            } else {
                // Các chuyển đổi khác (confirmed)
                $order->update([
                    'status' => $targetStatus,
                ]);
            }

            // 6. Ghi dòng lịch sử trạng thái trong cùng transaction
            OrderStatusHistory::create([
                'order_id'    => $order->id,
                'from_status' => $currentStatus->value,
                'to_status'   => $targetStatus->value,
                'changed_by'  => $user->id,
                'reason'      => $historyReason,
                'created_at'  => now(),
            ]);

            return $order;
        }, attempts: 3);

        return response()->json([
            'message' => 'Cập nhật trạng thái đơn hàng thành công.',
            'order'   => new AdminOrderDetailResource($order->fresh(['user.role', 'items', 'statusHistories.changedBy.role', 'latestPayment'])),
        ], 200);
    }

    /**
     * Xác nhận đã hoàn tiền thủ công cho đơn hàng (Chỉ dành cho Admin).
     * POST /api/admin/orders/{order_code}/refund
     */
    public function confirmRefund(Request $request, string $order_code): JsonResponse
    {
        $user = $request->user();
        if ($user?->role?->name !== 'admin') {
            return response()->json([
                'message' => 'Bạn không có quyền thực hiện thao tác này.',
            ], 403);
        }

        $request->validate([
            'refund_note' => ['nullable', 'string', 'max:255'],
        ], [
            'refund_note.string' => 'Ghi chú hoàn tiền không hợp lệ.',
            'refund_note.max'    => 'Ghi chú hoàn tiền không được vượt quá 255 ký tự.',
        ]);

        $refundNote = $request->filled('refund_note') ? trim((string) $request->input('refund_note')) : null;

        $order = DB::transaction(function () use ($order_code, $refundNote, $user) {
            $order = Order::where('order_code', $order_code)
                ->lockForUpdate()
                ->first();

            if (!$order) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Đơn hàng không tồn tại.',
                ], 404));
            }

            if ($order->payment_status !== PaymentStatus::RefundPending) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Chỉ có thể xác nhận hoàn tiền cho đơn hàng đang ở trạng thái chờ hoàn tiền (refund_pending).',
                ], 422));
            }

            // LƯU Ý: Không gọi API hoàn tiền của VNPay.
            // Việc hoàn tiền cho khách được thực hiện thủ công qua chuyển khoản ngân hàng hoặc cổng quản trị VNPay merchant portal.
            $order->update([
                'payment_status' => PaymentStatus::Refunded,
                'refunded_at'    => now(),
                'refund_note'    => $refundNote,
            ]);

            $historyReason = 'Đã hoàn tiền thủ công cho khách hàng';
            if ($refundNote !== null && $refundNote !== '') {
                $historyReason .= ": {$refundNote}";
            }

            OrderStatusHistory::create([
                'order_id'    => $order->id,
                'from_status' => $order->status->value,
                'to_status'   => $order->status->value,
                'changed_by'  => $user->id,
                'reason'      => $historyReason,
                'created_at'  => now(),
            ]);

            return $order;
        }, attempts: 3);

        $order->load([
            'user.role',
            'items',
            'statusHistories.changedBy.role',
            'latestPayment',
        ]);

        return response()->json([
            'message' => 'Xác nhận hoàn tiền thành công.',
            'order'   => new AdminOrderDetailResource($order),
        ], 200);
    }
}
