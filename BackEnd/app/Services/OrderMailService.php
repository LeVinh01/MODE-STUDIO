<?php

namespace App\Services;

use App\Mail\OrderConfirmationMail;
use App\Models\Order;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class OrderMailService
{
    /**
     * Gửi email xác nhận đơn hàng đồng bộ (synchronously) và an toàn (không ném ngoại lệ làm gián đoạn luồng chính)
     */
    public function sendOrderConfirmation(Order $order): bool
    {
        try {
            $order->loadMissing(['user', 'items']);

            $recipientEmail = $order->user?->email;

            if (empty($recipientEmail)) {
                Log::warning('Order confirmation email skipped: missing user email', [
                    'order_code' => $order->order_code,
                ]);

                return false;
            }

            Mail::to($recipientEmail)->send(new OrderConfirmationMail($order));

            return true;
        } catch (Throwable $e) {
            Log::warning('Failed to send order confirmation email', [
                'order_code' => $order->order_code,
                'error'      => $e->getMessage(),
            ]);

            return false;
        }
    }
}
