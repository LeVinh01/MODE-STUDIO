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
     * Gửi email xác nhận đơn hàng qua hàng đợi (queue) an toàn và không gây lỗi luồng chính
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

            $mailable = (new OrderConfirmationMail($order))->afterCommit();

            Mail::to($recipientEmail)->queue($mailable);

            return true;
        } catch (Throwable $e) {
            report($e);
            Log::warning('Failed to enqueue order confirmation email', [
                'order_code' => $order->order_code,
                'error'      => $e->getMessage(),
            ]);

            return false;
        }
    }
}
