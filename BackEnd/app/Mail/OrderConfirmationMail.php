<?php

namespace App\Mail;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Order $order
    ) {}

    public function envelope(): Envelope
    {
        $brandName = (string) config('shop.brand_name', 'OMBRE');

        return new Envelope(
            subject: "[{$brandName}] Xác nhận đơn hàng #{$this->order->order_code}",
        );
    }

    public function content(): Content
    {
        $frontendUrl = (string) config('shop.frontend_url', 'http://localhost:5173');
        $orderUrl = rtrim($frontendUrl, '/') . '/orders/' . $this->order->order_code;
        $brandName = (string) config('shop.brand_name', 'OMBRE');

        return new Content(
            view: 'emails.orders.confirmation',
            with: [
                'order'             => $this->order,
                'brandName'         => $brandName,
                'orderUrl'          => $orderUrl,
                'orderStatusText'   => $this->getOrderStatusLabel($this->order->status),
                'paymentMethodText' => $this->getPaymentMethodLabel($this->order->payment_method),
                'paymentStatusText' => $this->getPaymentStatusLabel($this->order->payment_status),
            ],
        );
    }

    private function getOrderStatusLabel(OrderStatus|string $status): string
    {
        $val = $status instanceof OrderStatus ? $status->value : (string) $status;

        return match ($val) {
            'pending'   => 'Chờ xác nhận',
            'confirmed' => 'Đã xác nhận',
            'shipping'  => 'Đang giao hàng',
            'delivered' => 'Đã giao hàng',
            'cancelled' => 'Đã hủy',
            default     => $val,
        };
    }

    private function getPaymentMethodLabel(PaymentMethod|string $method): string
    {
        $val = $method instanceof PaymentMethod ? $method->value : (string) $method;

        return match ($val) {
            'cod'   => 'Thanh toán khi nhận hàng (COD)',
            'vnpay' => 'Thanh toán qua VNPay',
            default => $val,
        };
    }

    private function getPaymentStatusLabel(PaymentStatus|string $status): string
    {
        $val = $status instanceof PaymentStatus ? $status->value : (string) $status;

        return match ($val) {
            'unpaid'         => 'Chưa thanh toán',
            'paid'           => 'Đã thanh toán',
            'failed'         => 'Thất bại',
            'refund_pending' => 'Chờ hoàn tiền',
            'refunded'       => 'Đã hoàn tiền',
            default          => $val,
        };
    }
}
