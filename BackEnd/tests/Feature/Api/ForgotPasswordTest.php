<?php

namespace Tests\Feature\Api;

use App\Enums\UserStatus;
use App\Mail\PasswordResetMail;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class ForgotPasswordTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    protected function createCustomer(array $attributes = []): User
    {
        $role = Role::where('name', 'customer')->firstOrFail();

        return User::create(array_merge([
            'full_name' => 'Nguyen Van A',
            'email'     => 'customer@example.com',
            'phone'     => '0901234567',
            'password'  => Hash::make('OldPassword123!'),
            'role_id'   => $role->id,
            'status'    => UserStatus::Active,
        ], $attributes));
    }

    // =========================================================================
    // 1. FORGOT PASSWORD TESTS
    // =========================================================================

    public function test_forgot_password_returns_generic_response_for_existing_email(): void
    {
        Mail::fake();
        $user = $this->createCustomer(['email' => 'valid@example.com']);

        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'valid@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.',
            ]);

        Mail::assertQueued(PasswordResetMail::class, function ($mail) use ($user) {
            return $mail->hasTo('valid@example.com');
        });
        Mail::assertNotSent(PasswordResetMail::class);
    }

    public function test_forgot_password_returns_same_generic_response_for_non_existing_email(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'nonexistent@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.',
            ]);

        Mail::assertNothingQueued();
        Mail::assertNothingSent();
    }

    public function test_forgot_password_mail_content_contains_frontend_url_token_email_and_ombre_subject(): void
    {
        Mail::fake();
        config(['shop.brand_name' => 'OMBRE']);
        config(['shop.frontend_url' => 'http://localhost:5173']);

        $user = $this->createCustomer(['email' => 'testuser@example.com']);

        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'testuser@example.com',
        ]);

        $response->assertStatus(200);

        Mail::assertQueued(PasswordResetMail::class, function ($mail) use ($user) {
            $envelope = $mail->envelope();
            $subject = $envelope->subject;

            // Subject starts with [OMBRE]
            $hasOmbreSubject = str_starts_with($subject, '[OMBRE]');

            // Link contains frontend_url, token, and email
            $hasFrontendUrl = str_contains($mail->resetUrl, 'http://localhost:5173');
            $hasToken = str_contains($mail->resetUrl, 'token=');
            $hasEmail = str_contains($mail->resetUrl, 'email=' . urlencode($user->email));

            return $hasOmbreSubject && $hasFrontendUrl && $hasToken && $hasEmail;
        });
        Mail::assertNotSent(PasswordResetMail::class);
    }

    public function test_forgot_password_does_not_send_mail_to_locked_user(): void
    {
        Mail::fake();
        $this->createCustomer([
            'email'  => 'locked@example.com',
            'status' => UserStatus::Locked,
        ]);

        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'locked@example.com',
        ]);

        // Still returns generic 200 response (no user enumeration)
        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.',
            ]);

        // No mail sent
        Mail::assertNothingQueued();
        Mail::assertNothingSent();
    }

    public function test_forgot_password_mail_failure_does_not_break_response(): void
    {
        $this->createCustomer(['email' => 'failmail@example.com']);

        // Mock mail failure (queue connection fails)
        Mail::shouldReceive('to->queue')->andThrow(new \RuntimeException('Connection to mail queue failed'));

        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'failmail@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.',
            ]);
    }

    public function test_forgot_password_throttles_after_5_requests(): void
    {
        Mail::fake();
        $this->createCustomer(['email' => 'throttle@example.com']);

        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson('/api/auth/forgot-password', [
                'email' => 'throttle@example.com',
            ]);
            $response->assertStatus(200);
        }

        // 6th request is throttled
        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'throttle@example.com',
        ]);
        $response->assertStatus(429);
    }

    // =========================================================================
    // 2. RESET PASSWORD TESTS
    // =========================================================================

    public function test_reset_password_fails_with_invalid_token(): void
    {
        $user = $this->createCustomer(['email' => 'invalidtoken@example.com']);

        $response = $this->postJson('/api/auth/reset-password', [
            'email'                 => 'invalidtoken@example.com',
            'token'                 => 'invalid-token-12345',
            'password'              => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
            ]);
    }

    public function test_reset_password_fails_with_expired_token(): void
    {
        $user = $this->createCustomer(['email' => 'expired@example.com']);
        $token = Password::broker()->createToken($user);

        // Giả lập token được tạo 65 phút trước (quá hạn 60 phút)
        DB::table('password_reset_tokens')
            ->where('email', $user->email)
            ->update(['created_at' => Carbon::now()->subMinutes(65)]);

        $response = $this->postJson('/api/auth/reset-password', [
            'email'                 => 'expired@example.com',
            'token'                 => $token,
            'password'              => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
            ]);
    }

    public function test_reset_password_validates_password_rules(): void
    {
        $user = $this->createCustomer(['email' => 'rules@example.com']);
        $token = Password::broker()->createToken($user);

        // Thiếu password_confirmation
        $response = $this->postJson('/api/auth/reset-password', [
            'email'                 => 'rules@example.com',
            'token'                 => $token,
            'password'              => 'short',
            'password_confirmation' => 'mismatch',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_reset_password_successfully_changes_password_revokes_tokens_and_cannot_reuse_token(): void
    {
        $user = $this->createCustomer([
            'email'    => 'success@example.com',
            'password' => Hash::make('OldPassword123!'),
        ]);

        // Tạo 2 Sanctum token cũ
        $oldToken1 = $user->createToken('device1')->plainTextToken;
        $oldToken2 = $user->createToken('device2')->plainTextToken;
        $this->assertEquals(2, $user->tokens()->count());

        // Tạo reset token
        $resetToken = Password::broker()->createToken($user);

        // Đặt lại mật khẩu thành công
        $response = $this->postJson('/api/auth/reset-password', [
            'email'                 => 'success@example.com',
            'token'                 => $resetToken,
            'password'              => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.',
            ]);

        // Mọi token cũ đều bị thu hồi
        $this->assertEquals(0, $user->fresh()->tokens()->count());

        // Mật khẩu cũ không đăng nhập được nữa
        $oldLoginResponse = $this->postJson('/api/auth/login', [
            'email'    => 'success@example.com',
            'password' => 'OldPassword123!',
        ]);
        $oldLoginResponse->assertStatus(401);

        // Mật khẩu mới đăng nhập thành công
        $newLoginResponse = $this->postJson('/api/auth/login', [
            'email'    => 'success@example.com',
            'password' => 'NewPassword123!',
        ]);
        $newLoginResponse->assertStatus(200);

        // Thử dùng lại token cũ sẽ thất bại (token đã bị xóa khỏi password_reset_tokens)
        $reuseResponse = $this->postJson('/api/auth/reset-password', [
            'email'                 => 'success@example.com',
            'token'                 => $resetToken,
            'password'              => 'AnotherPassword123!',
            'password_confirmation' => 'AnotherPassword123!',
        ]);
        $reuseResponse->assertStatus(422);
    }

    public function test_reset_password_leaves_locked_user_locked(): void
    {
        $user = $this->createCustomer([
            'email'       => 'lockedreset@example.com',
            'password'    => Hash::make('OldPassword123!'),
            'status'      => UserStatus::Locked,
            'locked_at'   => now(),
            'lock_reason' => 'Vi phạm chính sách',
        ]);

        // Tạo token thủ công (giả lập trước khi bị khóa)
        $resetToken = Password::broker()->createToken($user);

        $response = $this->postJson('/api/auth/reset-password', [
            'email'                 => 'lockedreset@example.com',
            'token'                 => $resetToken,
            'password'              => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $response->assertStatus(200);

        // Người dùng vẫn giữ trạng thái Locked
        $freshUser = $user->fresh();
        $this->assertEquals(UserStatus::Locked, $freshUser->status);
        $this->assertNotNull($freshUser->locked_at);
        $this->assertEquals('Vi phạm chính sách', $freshUser->lock_reason);

        // Đăng nhập bằng mật khẩu mới vẫn bị từ chối 403
        $loginResponse = $this->postJson('/api/auth/login', [
            'email'    => 'lockedreset@example.com',
            'password' => 'NewPassword123!',
        ]);
        $loginResponse->assertStatus(403);
    }

    public function test_reset_password_throttles_after_5_requests(): void
    {
        $this->createCustomer(['email' => 'throttlereset@example.com']);

        for ($i = 0; $i < 5; $i++) {
            $response = $this->postJson('/api/auth/reset-password', [
                'email'                 => 'throttlereset@example.com',
                'token'                 => 'some-token',
                'password'              => 'NewPassword123!',
                'password_confirmation' => 'NewPassword123!',
            ]);
            $response->assertStatus(422);
        }

        // 6th request is throttled
        $response = $this->postJson('/api/auth/reset-password', [
            'email'                 => 'throttlereset@example.com',
            'token'                 => 'some-token',
            'password'              => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);
        $response->assertStatus(429);
    }
}
