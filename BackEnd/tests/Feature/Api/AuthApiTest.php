<?php

namespace Tests\Feature\Api;

use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Chỉ seed RoleSeeder để có các role (customer, operator, admin)
        $this->seed(RoleSeeder::class);
    }

    /**
     * Helper tạo user kiểm thử
     */
    protected function createTestUser(array $attributes = []): User
    {
        $customerRole = Role::where('name', 'customer')->firstOrFail();

        return User::create(array_merge([
            'full_name' => 'Test User',
            'email'     => 'test@example.com',
            'phone'     => '0901234567',
            'password'  => Hash::make('Secret123!'),
            'role_id'   => $customerRole->id,
            'status'    => UserStatus::Active,
        ], $attributes));
    }

    // =========================================================================
    // 1. ĐĂNG KÝ (REGISTER)
    // =========================================================================

    public function test_register_successfully_creates_customer_and_returns_token(): void
    {
        $payload = [
            'full_name'             => 'Nguyen Van A',
            'email'                 => 'VANA@EXAMPLE.COM ', // Viết hoa và có khoảng trắng
            'phone'                 => ' 0912345678 ',
            'password'              => 'Password123!',
            'password_confirmation' => 'Password123!',
        ];

        $response = $this->postJson('/api/auth/register', $payload);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'user' => [
                    'id',
                    'full_name',
                    'email',
                    'phone',
                    'role',
                    'status',
                    'email_verified_at',
                    'last_login_at',
                ],
                'token',
            ])
            ->assertJsonMissing(['password'])
            ->assertJsonMissing(['data']);

        $responseData = $response->json();
        $this->assertEquals('Nguyen Van A', $responseData['user']['full_name']);
        $this->assertEquals('vana@example.com', $responseData['user']['email']); // Đã chuẩn hóa chữ thường
        $this->assertEquals('0912345678', $responseData['user']['phone']); // Đã trim
        $this->assertEquals('customer', $responseData['user']['role']);
        $this->assertEquals('active', $responseData['user']['status']);
        $this->assertNotEmpty($responseData['token']);

        // Xác nhận trong database
        $this->assertDatabaseHas('users', [
            'email'   => 'vana@example.com',
            'status'  => 'active',
        ]);
    }

    public function test_register_ignores_client_provided_role_and_status(): void
    {
        $adminRole = Role::where('name', 'admin')->firstOrFail();

        $payload = [
            'full_name'             => 'Hacker User',
            'email'                 => 'hacker@example.com',
            'password'              => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role_id'               => $adminRole->id, // Cố tình gửi role admin
            'status'                => 'locked',       // Cố tình gửi status locked
        ];

        $response = $this->postJson('/api/auth/register', $payload);

        $response->assertStatus(201);
        $user = $response->json('user');

        // Phải luôn là customer và active
        $this->assertEquals('customer', $user['role']);
        $this->assertEquals('active', $user['status']);

        $this->assertDatabaseHas('users', [
            'email'   => 'hacker@example.com',
            'role_id' => Role::where('name', 'customer')->first()->id,
            'status'  => 'active',
        ]);
    }

    public function test_register_returns_422_when_email_already_exists(): void
    {
        $this->createTestUser(['email' => 'duplicate@example.com']);

        $payload = [
            'full_name'             => 'Another User',
            'email'                 => 'DUPLICATE@example.com', // Cùng email chữ hoa
            'password'              => 'Password123!',
            'password_confirmation' => 'Password123!',
        ];

        $response = $this->postJson('/api/auth/register', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email'])
            ->assertJsonFragment([
                'email' => ['Email này đã được sử dụng.'],
            ]);
    }

    public function test_register_returns_422_for_weak_or_mismatched_password(): void
    {
        // Mật khẩu dưới 8 ký tự
        $responseShort = $this->postJson('/api/auth/register', [
            'full_name'             => 'Short Pass',
            'email'                 => 'short@example.com',
            'password'              => '1234567',
            'password_confirmation' => '1234567',
        ]);

        $responseShort->assertStatus(422)
            ->assertJsonValidationErrors(['password'])
            ->assertJsonFragment([
                'password' => ['Mật khẩu phải có tối thiểu 8 ký tự.'],
            ]);

        // Mật khẩu xác nhận không khớp
        $responseMismatch = $this->postJson('/api/auth/register', [
            'full_name'             => 'Mismatch Pass',
            'email'                 => 'mismatch@example.com',
            'password'              => 'Password123!',
            'password_confirmation' => 'Different123!',
        ]);

        $responseMismatch->assertStatus(422)
            ->assertJsonValidationErrors(['password'])
            ->assertJsonFragment([
                'password' => ['Xác nhận mật khẩu không khớp.'],
            ]);
    }

    // =========================================================================
    // 2. ĐĂNG NHẬP (LOGIN)
    // =========================================================================

    public function test_login_successfully_returns_user_and_token_and_updates_last_login(): void
    {
        $user = $this->createTestUser([
            'email'         => 'loginuser@example.com',
            'password'      => Hash::make('ValidPass123!'),
            'last_login_at' => null,
        ]);

        $payload = [
            'email'    => ' LOGINUSER@example.com ', // Chuẩn hóa hoa thường và khoảng trắng
            'password' => 'ValidPass123!',
        ];

        $response = $this->postJson('/api/auth/login', $payload);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => [
                    'id',
                    'full_name',
                    'email',
                    'phone',
                    'role',
                    'status',
                    'last_login_at',
                ],
                'token',
            ])
            ->assertJsonMissing(['password'])
            ->assertJsonMissing(['data']);

        $this->assertNotEmpty($response->json('token'));

        // Kiểm tra last_login_at đã được cập nhật
        $user->refresh();
        $this->assertNotNull($user->last_login_at);
    }

    public function test_login_returns_401_for_wrong_password(): void
    {
        $this->createTestUser([
            'email'    => 'user@example.com',
            'password' => Hash::make('CorrectPass123!'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => 'user@example.com',
            'password' => 'WrongPass999!',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Thông tin đăng nhập không chính xác.',
            ]);
    }

    public function test_login_returns_401_for_non_existent_email(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email'    => 'notfound@example.com',
            'password' => 'AnyPassword123!',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Thông tin đăng nhập không chính xác.',
            ]);
    }

    public function test_login_returns_403_when_account_is_locked(): void
    {
        $this->createTestUser([
            'email'    => 'locked@example.com',
            'password' => Hash::make('Secret123!'),
            'status'   => UserStatus::Locked,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email'    => 'locked@example.com',
            'password' => 'Secret123!',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
            ]);
    }

    // =========================================================================
    // 3. THÔNG TIN NGƯỜI DÙNG (/ME) VÀ ĐĂNG XUẤT (LOGOUT)
    // =========================================================================

    public function test_me_returns_user_info_with_valid_token(): void
    {
        $user = $this->createTestUser([
            'email' => 'me_test@example.com',
        ]);
        $token = $user->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => [
                    'id',
                    'full_name',
                    'email',
                    'phone',
                    'role',
                    'status',
                    'email_verified_at',
                    'last_login_at',
                ],
            ])
            ->assertJsonMissing(['password'])
            ->assertJsonPath('user.email', 'me_test@example.com')
            ->assertJsonPath('user.role', 'customer');
    }

    public function test_me_without_token_returns_401_json_without_redirect(): void
    {
        // Gọi không có token và không có Accept header đặc biệt
        $response = $this->get('/api/auth/me');

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Chưa xác thực hoặc phiên đăng nhập đã hết hạn.',
            ]);
    }

    public function test_me_with_invalid_token_returns_401_json(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer invalid_token_12345')
            ->getJson('/api/auth/me');

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Chưa xác thực hoặc phiên đăng nhập đã hết hạn.',
            ]);
    }

    public function test_logout_revokes_current_token_and_cannot_be_reused(): void
    {
        $user = $this->createTestUser();
        $token = $user->createToken('auth_token')->plainTextToken;

        // Gọi đăng xuất
        $logoutResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/auth/logout');

        $logoutResponse->assertStatus(200)
            ->assertJson([
                'message' => 'Đăng xuất thành công.',
            ]);

        // Reset auth guards giữa các request trong cùng một test method
        $this->app['auth']->forgetGuards();

        // Dùng lại token vừa đăng xuất phải bị từ chối 401
        $meResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/auth/me');

        $meResponse->assertStatus(401);
    }

    public function test_token_rejected_with_403_if_user_is_locked_after_login(): void
    {
        $user = $this->createTestUser(['status' => UserStatus::Active]);
        $token = $user->createToken('auth_token')->plainTextToken;

        // Xác nhận gọi thành công lúc còn active
        $responseActive = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/auth/me');
        $responseActive->assertStatus(200);

        // Khóa tài khoản
        $user->update(['status' => UserStatus::Locked]);

        // Reset auth guards giữa các request trong cùng một test method
        $this->app['auth']->forgetGuards();

        // Request tiếp theo phải bị từ chối 403
        $responseLocked = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/auth/me');

        $responseLocked->assertStatus(403)
            ->assertJson([
                'message' => 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
            ]);
    }
}
