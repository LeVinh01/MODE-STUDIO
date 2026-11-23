<?php

namespace App\Services;

use App\Mail\PasswordResetMail;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class PasswordResetMailService
{
    /**
     * Gửi email đặt lại mật khẩu đồng bộ (synchronously) và an toàn
     * (bắt toàn bộ ngoại lệ trong try/catch để lỗi gửi mail không bao giờ làm gián đoạn response)
     */
    public function sendPasswordResetMail(User $user, string $token, string $resetUrl): bool
    {
        try {
            Mail::to($user->email)->send(new PasswordResetMail($user, $token, $resetUrl));

            return true;
        } catch (Throwable $e) {
            Log::warning('Failed to send password reset email', [
                'user_id' => $user->id,
                'email'   => $user->email,
                'error'   => $e->getMessage(),
            ]);

            return false;
        }
    }
}
