<?php

namespace App\Http\Controllers\Api;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Payment;
use App\Services\VnPayService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PaymentController extends Controller
{
    /**
     * Tạo URL thanh toán VNPay cho đơn hàng
     * POST /api/orders/{order_code}/payment/vnpay
     */
    public function createVnPayUrl(Request $request, string $order_code, VnPayService $vnPayService): JsonResponse
    {
        $user = $request->user();

        $order = Order::where('order_code', $order_code)
            ->where('user_id', $user->id)
            ->first();

        if (!$order) {
            return response()->json([
                'message' => 'Đơn hàng không tồn tại.',
            ], 404);
        }

        if ($order->status !== OrderStatus::Pending) {
            return response()->json([
                'message' => 'Chỉ có thể tạo thanh toán cho đơn hàng đang chờ xử lý.',
            ], 422);
        }

        if ($order->payment_status === PaymentStatus::Paid) {
            return response()->json([
                'message' => 'Đơn hàng này đã được thanh toán thành công.',
            ], 422);
        }

        if ($order->payment_method !== PaymentMethod::Vnpay) {
            return response()->json([
                'message' => 'Đơn hàng này không sử dụng phương thức thanh toán VNPay.',
            ], 422);
        }

        // Sinh mã tham chiếu giao dịch độc nhất cho mỗi lần bấm thanh toán
        $txnRef = 'VNP' . $order->id . date('ymdHis') . strtoupper(Str::random(6));

        Payment::create([
            'order_id' => $order->id,
            'provider' => 'vnpay',
            'txn_ref'  => $txnRef,
            'amount'   => (int) $order->total_amount,
            'status'   => 'pending',
        ]);

        $paymentUrl = $vnPayService->createPaymentUrl($order, $txnRef, $request);

        return response()->json([
            'payment_url' => $paymentUrl,
            'txn_ref'     => $txnRef,
        ], 200);
    }

    /**
     * Xác thực kết quả giao dịch từ Return URL của VNPay (Public endpoint)
     * POST /api/payment/vnpay/verify
     */
    public function verifyVnPayReturn(Request $request, VnPayService $vnPayService): JsonResponse
    {
        $params = $request->all();

        // 1. Xác thực chữ ký HMAC SHA512 an toàn (chống timing attack)
        if (!$vnPayService->verifySignature($params)) {
            return response()->json([
                'status'  => 'invalid_signature',
                'message' => 'Chữ ký giao dịch không hợp lệ.',
            ], 400);
        }

        // Kiểm tra mã website merchant (vnp_TmnCode) khớp với cấu hình
        $vnpTmnCode = (string) ($params['vnp_TmnCode'] ?? '');
        $expectedTmnCode = (string) config('services.vnpay.tmn_code', '');
        if ($expectedTmnCode !== '' && $vnpTmnCode !== $expectedTmnCode) {
            return response()->json([
                'status'  => 'invalid_tmn_code',
                'message' => 'Mã website merchant (vnp_TmnCode) không hợp lệ.',
            ], 400);
        }

        $vnpTxnRef = trim((string) ($params['vnp_TxnRef'] ?? ''));
        $vnpAmount = (int) ($params['vnp_Amount'] ?? 0);
        $vnpResponseCode = (string) ($params['vnp_ResponseCode'] ?? '');
        $vnpTransactionStatus = (string) ($params['vnp_TransactionStatus'] ?? '');
        $vnpBankCode = (string) ($params['vnp_BankCode'] ?? '');
        $vnpTransactionNo = (string) ($params['vnp_TransactionNo'] ?? '');
        $vnpPayDate = (string) ($params['vnp_PayDate'] ?? '');

        if ($vnpTxnRef === '') {
            return response()->json([
                'status'  => 'not_found',
                'message' => 'Không tìm thấy thông tin mã giao dịch.',
            ], 404);
        }

        // 2. Chạy toàn bộ quá trình kiểm tra và cập nhật trong DB transaction có lockForUpdate
        return DB::transaction(function () use (
            $vnpTxnRef,
            $vnpAmount,
            $vnpResponseCode,
            $vnpTransactionStatus,
            $vnpBankCode,
            $vnpTransactionNo,
            $vnpPayDate,
            $params
        ) {
            $payment = Payment::where('txn_ref', $vnpTxnRef)->lockForUpdate()->first();

            if (!$payment) {
                return response()->json([
                    'status'  => 'not_found',
                    'message' => 'Giao dịch không tồn tại trên hệ thống.',
                ], 404);
            }

            $order = Order::where('id', $payment->order_id)->lockForUpdate()->first();

            if (!$order) {
                return response()->json([
                    'status'  => 'not_found',
                    'message' => 'Đơn hàng liên kết với giao dịch không tồn tại.',
                ], 404);
            }

            // Kiểm tra số tiền khớp CẢ payments.amount LẪN orders.total_amount (nhân 100 theo quy định VNPay)
            $expectedVnpAmount = ((int) $order->total_amount) * 100;
            $expectedPaymentAmount = ((int) $payment->amount) * 100;

            if ($vnpAmount !== $expectedVnpAmount || $vnpAmount !== $expectedPaymentAmount) {
                $payment->update([
                    'status'       => 'failed',
                    'raw_response' => $params,
                ]);

                return response()->json([
                    'status'  => 'amount_mismatch',
                    'message' => 'Số tiền giao dịch không khớp với đơn hàng.',
                ], 422);
            }

            // IDEMPOTENCY: Kiểm tra lại trạng thái SAU KHI KHÓA (chống double-call do React StrictMode hoặc người dùng F5)
            if ($payment->status === 'success') {
                return response()->json([
                    'status'     => 'success',
                    'order_code' => $order->order_code,
                    'message'    => 'Giao dịch đã được xác nhận thành công trước đó.',
                ], 200);
            }

            if ($payment->status === 'failed' || $payment->status === 'cancelled') {
                if ($vnpResponseCode !== '00' || $vnpTransactionStatus !== '00') {
                    return response()->json([
                        'status'        => 'failed',
                        'order_code'    => $order->order_code,
                        'response_code' => $vnpResponseCode,
                        'message'       => $this->getVnPayErrorMessage($vnpResponseCode),
                    ], 200);
                }
            }

            $isSuccess = ($vnpResponseCode === '00' && $vnpTransactionStatus === '00');

            $paidAt = now();
            if ($vnpPayDate !== '' && preg_match('/^\d{14}$/', $vnpPayDate)) {
                try {
                    $paidAt = Carbon::createFromFormat('YmdHis', $vnpPayDate, 'Asia/Ho_Chi_Minh')->setTimezone('UTC');
                } catch (\Throwable) {
                    $paidAt = now();
                }
            }

            if ($isSuccess) {
                // Ghi nhận payment thành công
                $payment->update([
                    'status'                  => 'success',
                    'bank_code'               => $vnpBankCode ?: null,
                    'provider_transaction_no' => $vnpTransactionNo ?: null,
                    'raw_response'            => $params,
                    'paid_at'                 => $paidAt,
                ]);

                // Xử lý giao dịch bất thường (đơn đã cancelled hoặc đã paid trước đó)
                if ($order->status === OrderStatus::Cancelled) {
                    OrderStatusHistory::create([
                        'order_id'    => $order->id,
                        'from_status' => OrderStatus::Cancelled->value,
                        'to_status'   => OrderStatus::Cancelled->value,
                        'changed_by'  => null,
                        'reason'      => "Giao dịch {$vnpTransactionNo} thành công sau khi đơn đã hủy, cần hoàn tiền thủ công",
                        'created_at'  => now(),
                    ]);

                    return response()->json([
                        'status'                  => 'success_abnormal',
                        'order_code'              => $order->order_code,
                        'provider_transaction_no' => $vnpTransactionNo,
                        'message'                 => 'Giao dịch thành công nhưng đơn hàng đã bị hủy trước đó. Cần hoàn tiền thủ công.',
                    ], 200);
                }

                if ($order->payment_status === PaymentStatus::Paid) {
                    OrderStatusHistory::create([
                        'order_id'    => $order->id,
                        'from_status' => $order->status->value,
                        'to_status'   => $order->status->value,
                        'changed_by'  => null,
                        'reason'      => "Giao dịch {$vnpTransactionNo} thành công nhưng đơn đã được thanh toán trước đó (trùng giao dịch), cần hoàn tiền thủ công",
                        'created_at'  => now(),
                    ]);

                    return response()->json([
                        'status'                  => 'success_abnormal',
                        'order_code'              => $order->order_code,
                        'provider_transaction_no' => $vnpTransactionNo,
                        'message'                 => 'Giao dịch thành công nhưng đơn hàng đã được thanh toán trước đó (trùng giao dịch). Cần hoàn tiền thủ công.',
                    ], 200);
                }

                // Giao dịch thông thường hợp lệ: Cập nhật đơn hàng thành Paid
                $order->update([
                    'payment_status' => PaymentStatus::Paid,
                    'paid_at'        => $paidAt,
                ]);

                OrderStatusHistory::create([
                    'order_id'    => $order->id,
                    'from_status' => $order->status->value,
                    'to_status'   => $order->status->value,
                    'changed_by'  => null,
                    'reason'      => "Thanh toán VNPay thành công (mã GD: {$vnpTransactionNo}, ngân hàng: {$vnpBankCode})",
                    'created_at'  => now(),
                ]);

                return response()->json([
                    'status'                  => 'success',
                    'order_code'              => $order->order_code,
                    'amount'                  => (int) $order->total_amount,
                    'bank_code'               => $vnpBankCode,
                    'provider_transaction_no' => $vnpTransactionNo,
                    'message'                 => 'Thanh toán đơn hàng thành công.',
                ], 200);
            }

            // Giao dịch không thành công hoặc bị khách hủy
            $payment->update([
                'status'                  => 'failed',
                'bank_code'               => $vnpBankCode ?: null,
                'provider_transaction_no' => $vnpTransactionNo ?: null,
                'raw_response'            => $params,
            ]);

            return response()->json([
                'status'        => 'failed',
                'order_code'    => $order->order_code,
                'response_code' => $vnpResponseCode,
                'message'       => $this->getVnPayErrorMessage($vnpResponseCode),
            ], 200);
        });
    }

    private function getVnPayErrorMessage(string $responseCode): string
    {
        return match ($responseCode) {
            '24'    => 'Giao dịch bị hủy bởi khách hàng.',
            '11'    => 'Giao dịch không thành công: Đã hết hạn chờ thanh toán.',
            '51'    => 'Tài khoản không đủ số dư để thực hiện giao dịch.',
            '79'    => 'Giao dịch không thành công: Nhập sai mật khẩu quá số lần quy định.',
            default => 'Giao dịch thanh toán không thành công qua cổng VNPay.',
        };
    }
}
