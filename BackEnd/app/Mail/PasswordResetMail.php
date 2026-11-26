<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * Số lần thử lại tối đa khi job gửi mail thất bại
     */
    public int $tries = 3;

    /**
     * Thời gian chờ giữa các lần thử lại (10s, 60s, 300s)
     */
    public array $backoff = [10, 60, 300];

    /**
     * Tự động hủy job an toàn nếu bản ghi User không còn tồn tại trong DB khi worker thực thi
     */
    public bool $deleteWhenMissingModels = true;

    public function __construct(
        public User $user,
        public string $token,
        public string $resetUrl
    ) {
        $this->afterCommit();
    }

    public function envelope(): Envelope
    {
        $brandName = (string) config('shop.brand_name', 'OMBRE');

        return new Envelope(
            subject: "[{$brandName}] Hướng dẫn đặt lại mật khẩu",
        );
    }

    public function content(): Content
    {
        $brandName = (string) config('shop.brand_name', 'OMBRE');

        return new Content(
            view: 'emails.auth.password-reset',
            with: [
                'user'      => $this->user,
                'token'     => $this->token,
                'resetUrl'  => $this->resetUrl,
                'brandName' => $brandName,
            ],
        );
    }
}
