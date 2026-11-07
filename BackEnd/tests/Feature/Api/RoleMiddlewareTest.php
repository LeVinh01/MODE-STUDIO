<?php

namespace Tests\Feature\Api;

use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class RoleMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);

        // Đăng ký các route tạm thời trong nhóm prefix 'api' chỉ dùng cho test
        Route::prefix('api')->group(function () {
            Route::get('/test/admin-only', fn() => response()->json(['message' => 'admin-ok']))
                ->middleware(['auth:sanctum', 'active', 'role:admin']);

            Route::get('/test/staff-only', fn() => response()->json(['message' => 'staff-ok']))
                ->middleware(['auth:sanctum', 'active', 'role:operator,admin']);

            Route::get('/test/customer-only', fn() => response()->json(['message' => 'customer-ok']))
                ->middleware(['auth:sanctum', 'active', 'role:customer']);
        });
    }

    /**
     * Helper tạo user với role cụ thể
     */
    protected function createUserWithRole(string $roleName, array $attributes = []): User
    {
        $role = Role::where('name', $roleName)->firstOrFail();

        return User::create(array_merge([
            'full_name' => "User {$roleName}",
            'email'     => "{$roleName}_" . uniqid() . "@example.com",
            'phone'     => '0901234567',
            'password'  => Hash::make('Secret123!'),
            'role_id'   => $role->id,
            'status'    => UserStatus::Active,
        ], $attributes));
    }

    public function test_unauthenticated_request_to_role_route_returns_401(): void
    {
        $response = $this->getJson('/api/test/admin-only');

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Chưa xác thực hoặc phiên đăng nhập đã hết hạn.',
            ]);
    }

    public function test_customer_accessing_admin_route_returns_403_vietnamese(): void
    {
        $customer = $this->createUserWithRole('customer');
        $token = $customer->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/test/admin-only');

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Bạn không có quyền thực hiện thao tác này.',
            ]);
    }

    public function test_operator_accessing_admin_route_returns_403_vietnamese(): void
    {
        $operator = $this->createUserWithRole('operator');
        $token = $operator->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/test/admin-only');

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Bạn không có quyền thực hiện thao tác này.',
            ]);
    }

    public function test_admin_accessing_admin_route_returns_200(): void
    {
        $admin = $this->createUserWithRole('admin');
        $token = $admin->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/test/admin-only');

        $response->assertStatus(200)
            ->assertJson(['message' => 'admin-ok']);
    }

    public function test_operator_accessing_staff_route_returns_200(): void
    {
        $operator = $this->createUserWithRole('operator');
        $token = $operator->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/test/staff-only');

        $response->assertStatus(200)
            ->assertJson(['message' => 'staff-ok']);
    }

    public function test_admin_accessing_staff_route_returns_200(): void
    {
        $admin = $this->createUserWithRole('admin');
        $token = $admin->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/test/staff-only');

        $response->assertStatus(200)
            ->assertJson(['message' => 'staff-ok']);
    }

    public function test_customer_accessing_staff_route_returns_403(): void
    {
        $customer = $this->createUserWithRole('customer');
        $token = $customer->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/test/staff-only');

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Bạn không có quyền thực hiện thao tác này.',
            ]);
    }

    public function test_customer_accessing_customer_route_returns_200(): void
    {
        $customer = $this->createUserWithRole('customer');
        $token = $customer->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/test/customer-only');

        $response->assertStatus(200)
            ->assertJson(['message' => 'customer-ok']);
    }

    public function test_admin_accessing_customer_only_route_returns_403(): void
    {
        $admin = $this->createUserWithRole('admin');
        $token = $admin->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/test/customer-only');

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Bạn không có quyền thực hiện thao tác này.',
            ]);
    }

    public function test_locked_admin_accessing_admin_route_returns_403_due_to_locked_account(): void
    {
        $lockedAdmin = $this->createUserWithRole('admin', [
            'status' => UserStatus::Locked,
        ]);
        $token = $lockedAdmin->createToken('test_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/test/admin-only');

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
            ]);
    }
}
