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
     * Gửi email đặt lại mật khẩu qua hàng đợi (queue) an toàn và không gây lỗi response
     */
    public function sendPasswordResetMail(User $user, string $token, string $resetUrl): bool
    {
        try {
            $mailable = (new PasswordResetMail($user, $token, $resetUrl))->afterCommit();

            Mail::to($user->email)->queue($mailable);

            return true;
        } catch (Throwable $e) {
            report($e);
            Log::warning('Failed to enqueue password reset email', [
                'user_id' => $user->id,
                'email'   => $user->email,
                'error'   => $e->getMessage(),
            ]);

            return false;
        }
    }
}
