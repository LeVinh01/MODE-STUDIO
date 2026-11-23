<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $token,
        public string $resetUrl
    ) {}

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
