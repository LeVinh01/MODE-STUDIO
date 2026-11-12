<?php

namespace App\Services;

use App\Models\Order;
use Carbon\Carbon;
use Illuminate\Http\Request;

class VnPayService
{
    /**
     * Tạo URL thanh toán VNPay kèm chữ ký HMAC SHA512
     */
    public function createPaymentUrl(Order $order, string $txnRef, Request $request): string
    {
        $vnpUrl = (string) config('services.vnpay.url', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
        $tmnCode = (string) config('services.vnpay.tmn_code', '');
        $hashSecret = (string) config('services.vnpay.hash_secret', '');
        $returnUrl = (string) config('services.vnpay.return_url', 'http://localhost:5173/payment/vnpay/callback');

        $clientIp = $request->ip() ?: '127.0.0.1';
        // Chuẩn hóa nếu là IPv6 loopback hoặc subnet nội bộ Docker
        if ($clientIp === '::1' || str_starts_with($clientIp, '172.') || str_starts_with($clientIp, '10.')) {
            $clientIp = '127.0.0.1';
        }

        $nowVn = Carbon::now('Asia/Ho_Chi_Minh');

        $vnp_Params = [
            'vnp_Version'    => '2.1.0',
            'vnp_Command'    => 'pay',
            'vnp_TmnCode'    => $tmnCode,
            'vnp_Amount'     => $order->total_amount * 100,
            'vnp_CreateDate' => $nowVn->format('YmdHis'),
            'vnp_CurrCode'   => 'VND',
            'vnp_IpAddr'     => $clientIp,
            'vnp_Locale'     => 'vn',
            'vnp_OrderInfo'  => 'Thanh toan don hang ' . $order->order_code,
            'vnp_OrderType'  => 'other',
            'vnp_ReturnUrl'  => $returnUrl,
            'vnp_TxnRef'     => $txnRef,
            'vnp_ExpireDate' => $nowVn->copy()->addMinutes(15)->format('YmdHis'),
        ];

        ksort($vnp_Params);
        $query = '';
        $i = 0;
        $hashdata = '';

        foreach ($vnp_Params as $key => $value) {
            if ($i === 1) {
                $hashdata .= '&' . urlencode($key) . '=' . urlencode((string) $value);
            } else {
                $hashdata .= urlencode($key) . '=' . urlencode((string) $value);
                $i = 1;
            }
            $query .= urlencode($key) . '=' . urlencode((string) $value) . '&';
        }

        $vnpSecureHash = hash_hmac('sha512', $hashdata, $hashSecret);

        return $vnpUrl . '?' . $query . 'vnp_SecureHash=' . $vnpSecureHash;
    }

    /**
     * Xác thực chữ ký HMAC SHA512 từ tham số VNPay trả về
     */
    public function verifySignature(array $inputParams): bool
    {
        $hashSecret = (string) config('services.vnpay.hash_secret', '');
        $vnp_SecureHash = (string) ($inputParams['vnp_SecureHash'] ?? '');

        if ($hashSecret === '' || $vnp_SecureHash === '') {
            return false;
        }

        $vnp_Params = [];
        foreach ($inputParams as $key => $value) {
            if (str_starts_with((string) $key, 'vnp_') && $key !== 'vnp_SecureHash' && $key !== 'vnp_SecureHashType') {
                $vnp_Params[$key] = $value;
            }
        }

        ksort($vnp_Params);
        $i = 0;
        $hashdata = '';

        foreach ($vnp_Params as $key => $value) {
            if ($i === 1) {
                $hashdata .= '&' . urlencode($key) . '=' . urlencode((string) $value);
            } else {
                $hashdata .= urlencode($key) . '=' . urlencode((string) $value);
                $i = 1;
            }
        }

        $calculatedHash = hash_hmac('sha512', $hashdata, $hashSecret);

        return hash_equals($calculatedHash, $vnp_SecureHash);
    }

    /**
     * Helper tạo chữ ký giả lập (phục vụ test)
     */
    public function generateSignature(array $params, string $hashSecret): string
    {
        $vnp_Params = [];
        foreach ($params as $key => $value) {
            if (str_starts_with((string) $key, 'vnp_') && $key !== 'vnp_SecureHash' && $key !== 'vnp_SecureHashType') {
                $vnp_Params[$key] = $value;
            }
        }

        ksort($vnp_Params);
        $i = 0;
        $hashdata = '';

        foreach ($vnp_Params as $key => $value) {
            if ($i === 1) {
                $hashdata .= '&' . urlencode($key) . '=' . urlencode((string) $value);
            } else {
                $hashdata .= urlencode($key) . '=' . urlencode((string) $value);
                $i = 1;
            }
        }

        return hash_hmac('sha512', $hashdata, $hashSecret);
    }
}
