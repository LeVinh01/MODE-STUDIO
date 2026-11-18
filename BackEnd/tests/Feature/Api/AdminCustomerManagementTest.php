<?php

namespace Tests\Feature\Api;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\UserStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\BrandSeeder;
use Database\Seeders\CategorySeeder;
use Database\Seeders\ColorSeeder;
use Database\Seeders\ProductSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SizeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminCustomerManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([
            RoleSeeder::class,
            CategorySeeder::class,
            BrandSeeder::class,
            ColorSeeder::class,
            SizeSeeder::class,
            ProductSeeder::class,
        ]);
    }

    private function createCustomer(array $attributes = []): User
    {
        $role = Role::where('name', 'customer')->first();
        return User::create(array_merge([
            'role_id'   => $role->id,
            'full_name' => 'Khách Hàng Mẫu',
            'email'     => 'customer_' . uniqid() . '@example.com',
            'phone'     => '0901234567',
            'password'  => Hash::make('Password@123'),
            'status'    => UserStatus::Active,
        ], $attributes));
    }

    private function createAdmin(array $attributes = []): User
    {
        $role = Role::where('name', 'admin')->first();
        return User::create(array_merge([
            'role_id'   => $role->id,
            'full_name' => 'Quản Trị Viên',
            'email'     => 'admin_' . uniqid() . '@example.com',
            'phone'     => '0908888888',
            'password'  => Hash::make('Password@123'),
            'status'    => UserStatus::Active,
        ], $attributes));
    }

    private function createOperator(array $attributes = []): User
    {
        $role = Role::where('name', 'operator')->first();
        return User::create(array_merge([
            'role_id'   => $role->id,
            'full_name' => 'Nhân Viên Vận Hành',
            'email'     => 'operator_' . uniqid() . '@example.com',
            'phone'     => '0909999999',
            'password'  => Hash::make('Password@123'),
            'status'    => UserStatus::Active,
        ], $attributes));
    }

    private function createOrder(User $customer, array $attributes = []): Order
    {
        return Order::create(array_merge([
            'order_code'       => 'ORD-' . strtoupper(uniqid()),
            'user_id'          => $customer->id,
            'status'           => OrderStatus::Delivered,
            'payment_method'   => PaymentMethod::Cod,
            'payment_status'   => PaymentStatus::Paid,
            'recipient_name'   => $customer->full_name,
            'recipient_phone'  => $customer->phone ?? '0901234567',
            'shipping_address' => '123 Đường Thời Trang, Quận 1, TP.HCM',
            'subtotal'         => 1000000,
            'shipping_fee'     => 30000,
            'discount_amount'  => 0,
            'total_amount'     => 1030000,
            'paid_at'          => now(),
        ], $attributes));
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $this->getJson('/api/admin/customers')->assertStatus(401);
        $this->getJson('/api/admin/customers/1')->assertStatus(401);
    }

    public function test_customer_role_returns_403(): void
    {
        $customer = $this->createCustomer();
        Sanctum::actingAs($customer);

        $this->getJson('/api/admin/customers')->assertStatus(403);
        $this->getJson("/api/admin/customers/{$customer->id}")->assertStatus(403);
    }

    public function test_locked_operator_or_admin_returns_403(): void
    {
        $admin = $this->createAdmin(['status' => UserStatus::Locked]);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/customers')->assertStatus(403);
    }

    public function test_admin_and_operator_can_access_customers_endpoints(): void
    {
        $customer = $this->createCustomer();
        $admin = $this->createAdmin();
        $operator = $this->createOperator();

        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/customers')->assertStatus(200);
        $this->getJson("/api/admin/customers/{$customer->id}")->assertStatus(200);

        Sanctum::actingAs($operator);
        $this->getJson('/api/admin/customers')->assertStatus(200);
        $this->getJson("/api/admin/customers/{$customer->id}")->assertStatus(200);
    }

    public function test_customers_list_only_returns_customer_role_and_no_passwords(): void
    {
        $admin = $this->createAdmin(['full_name' => 'Admin Boss']);
        $operator = $this->createOperator(['full_name' => 'Operator Staff']);
        $customer = $this->createCustomer(['full_name' => 'Nguyễn Thị Khách']);

        Sanctum::actingAs($admin);

        $res = $this->getJson('/api/admin/customers')->assertStatus(200);
        $data = $res->json('data');

        // Phải chứa customer, nhưng KHÔNG được chứa admin hay operator
        $names = collect($data)->pluck('full_name')->all();
        $this->assertContains('Nguyễn Thị Khách', $names);
        $this->assertNotContains('Admin Boss', $names);
        $this->assertNotContains('Operator Staff', $names);

        // Đảm bảo không lộ thông tin nhạy cảm (password, tokens)
        $first = $data[0];
        $this->assertArrayNotHasKey('password', $first);
        $this->assertArrayNotHasKey('remember_token', $first);
        $this->assertArrayHasKey('id', $first);
        $this->assertArrayHasKey('full_name', $first);
        $this->assertArrayHasKey('email', $first);
        $this->assertArrayHasKey('orders_count', $first);
        $this->assertArrayHasKey('total_spent', $first);
    }

    public function test_customers_list_search_by_name_email_phone_and_escapes_wildcards(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $c1 = $this->createCustomer(['full_name' => 'Trần Văn An', 'email' => 'an.tran@example.com', 'phone' => '0911222333']);
        $c2 = $this->createCustomer(['full_name' => 'Lê Thị Bình', 'email' => 'binh.le@example.com', 'phone' => '0944555666']);
        $c3 = $this->createCustomer(['full_name' => 'Special%_Name', 'email' => 'special@example.com', 'phone' => '0977888999']);

        // Tìm theo tên
        $resName = $this->getJson('/api/admin/customers?search=Trần Văn An')->assertStatus(200);
        $this->assertSame(1, $resName->json('meta.total'));
        $this->assertSame($c1->id, $resName->json('data.0.id'));

        // Tìm theo email
        $resEmail = $this->getJson('/api/admin/customers?search=binh.le@')->assertStatus(200);
        $this->assertSame(1, $resEmail->json('meta.total'));
        $this->assertSame($c2->id, $resEmail->json('data.0.id'));

        // Tìm theo số điện thoại
        $resPhone = $this->getJson('/api/admin/customers?search=0944555666')->assertStatus(200);
        $this->assertSame(1, $resPhone->json('meta.total'));
        $this->assertSame($c2->id, $resPhone->json('data.0.id'));

        // Thoát ký tự đại diện % và _
        $resWildcard = $this->getJson('/api/admin/customers?search=' . urlencode('Special%_Name'))->assertStatus(200);
        $this->assertSame(1, $resWildcard->json('meta.total'));
        $this->assertSame($c3->id, $resWildcard->json('data.0.id'));
    }

    public function test_customers_list_calculates_total_spent_only_from_delivered_orders(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        Sanctum::actingAs($admin);

        // Đơn 1: Delivered (1.500.000 đ) -> TÍNH VÀO total_spent
        $this->createOrder($customer, [
            'status'       => OrderStatus::Delivered,
            'total_amount' => 1500000,
        ]);

        // Đơn 2: Shipping (700.000 đ) -> KHÔNG TÍNH VÀO total_spent (vì chưa delivered)
        $this->createOrder($customer, [
            'status'       => OrderStatus::Shipping,
            'total_amount' => 700000,
        ]);

        // Đơn 3: Cancelled (400.000 đ) -> KHÔNG TÍNH VÀO total_spent
        $this->createOrder($customer, [
            'status'       => OrderStatus::Cancelled,
            'total_amount' => 400000,
        ]);

        $res = $this->getJson("/api/admin/customers?search={$customer->email}")->assertStatus(200);
        $data = $res->json('data.0');

        $this->assertSame(3, $data['orders_count']);
        $this->assertSame(1500000, $data['total_spent']);
    }

    public function test_customer_show_returns_profile_stats_and_recent_10_orders(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        Sanctum::actingAs($admin);

        // Tạo 12 đơn hàng
        for ($i = 1; $i <= 12; $i++) {
            $this->createOrder($customer, [
                'order_code'   => "ORD-TEST-{$i}",
                'status'       => $i % 2 === 0 ? OrderStatus::Delivered : OrderStatus::Confirmed,
                'total_amount' => 100000 * $i,
            ]);
        }

        $res = $this->getJson("/api/admin/customers/{$customer->id}")->assertStatus(200);

        $customerData = $res->json('customer');
        $this->assertSame($customer->id, $customerData['id']);
        $this->assertSame($customer->full_name, $customerData['full_name']);
        $this->assertSame($customer->email, $customerData['email']);
        $this->assertArrayNotHasKey('password', $customerData);

        $stats = $res->json('stats');
        $this->assertSame(12, $stats['orders_count']);
        $this->assertSame(6, $stats['delivered_orders_count']);
        $this->assertGreaterThan(0, $stats['total_spent']);
        $this->assertNotNull($stats['last_order_at']);

        // recent_orders chỉ lấy tối đa 10 đơn gần nhất
        $recentOrders = $res->json('recent_orders');
        $this->assertCount(10, $recentOrders);
        $this->assertSame('ORD-TEST-12', $recentOrders[0]['order_code']);
    }

    public function test_customer_show_nonexistent_or_non_customer_returns_404(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        // ID không tồn tại
        $this->getJson('/api/admin/customers/999999')->assertStatus(404);

        // ID là của Admin khác chứ không phải customer
        $otherAdmin = $this->createAdmin();
        $this->getJson("/api/admin/customers/{$otherAdmin->id}")->assertStatus(404);
    }

    public function test_admin_can_lock_and_unlock_customer(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer(['status' => UserStatus::Active]);
        Sanctum::actingAs($admin);

        // Khóa tài khoản
        $lockRes = $this->patchJson("/api/admin/customers/{$customer->id}/status", [
            'status' => 'locked',
            'reason' => 'Vi phạm chính sách đánh giá',
        ]);

        $lockRes->assertStatus(200)
            ->assertJsonPath('customer.status', 'locked')
            ->assertJsonPath('customer.lock_reason', 'Vi phạm chính sách đánh giá');

        $customer->refresh();
        $this->assertSame(UserStatus::Locked, $customer->status);
        $this->assertNotNull($customer->locked_at);
        $this->assertSame('Vi phạm chính sách đánh giá', $customer->lock_reason);

        // Mở khóa tài khoản
        $unlockRes = $this->patchJson("/api/admin/customers/{$customer->id}/status", [
            'status' => 'active',
        ]);

        $unlockRes->assertStatus(200)
            ->assertJsonPath('customer.status', 'active')
            ->assertJsonPath('customer.lock_reason', null);

        $customer->refresh();
        $this->assertSame(UserStatus::Active, $customer->status);
        $this->assertNull($customer->locked_at);
        $this->assertNull($customer->lock_reason);
    }

    public function test_operator_and_customer_cannot_update_customer_status_returns_403(): void
    {
        $customer = $this->createCustomer();
        $otherCustomer = $this->createCustomer();
        $operator = $this->createOperator();

        // Customer gọi -> 403
        Sanctum::actingAs($customer);
        $this->patchJson("/api/admin/customers/{$otherCustomer->id}/status", [
            'status' => 'locked',
        ])->assertStatus(403);

        // Operator gọi -> 403
        Sanctum::actingAs($operator);
        $this->patchJson("/api/admin/customers/{$otherCustomer->id}/status", [
            'status' => 'locked',
        ])->assertStatus(403);
    }

    public function test_locking_admin_or_operator_returns_422(): void
    {
        $admin = $this->createAdmin();
        $otherAdmin = $this->createAdmin();
        $operator = $this->createOperator();

        Sanctum::actingAs($admin);

        // Cố khóa admin khác -> 422
        $this->patchJson("/api/admin/customers/{$otherAdmin->id}/status", [
            'status' => 'locked',
        ])->assertStatus(422)
          ->assertJsonPath('message', 'Chỉ có thể thay đổi trạng thái của tài khoản khách hàng.');

        // Cố khóa operator -> 422
        $this->patchJson("/api/admin/customers/{$operator->id}/status", [
            'status' => 'locked',
        ])->assertStatus(422)
          ->assertJsonPath('message', 'Chỉ có thể thay đổi trạng thái của tài khoản khách hàng.');
    }

    public function test_admin_cannot_lock_self_returns_422(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/customers/{$admin->id}/status", [
            'status' => 'locked',
        ])->assertStatus(422);
    }

    public function test_locking_revokes_tokens_and_locked_user_login_fails(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer(['password' => Hash::make('Secret123!')]);

        // Tạo 2 token cho customer
        $token1 = $customer->createToken('token_1')->plainTextToken;
        $token2 = $customer->createToken('token_2')->plainTextToken;
        $this->assertCount(2, $customer->tokens);

        // Admin khóa customer
        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/customers/{$customer->id}/status", [
            'status' => 'locked',
            'reason' => 'Spam tài khoản',
        ])->assertStatus(200);

        // Tất cả token phải bị thu hồi (xóa khỏi database)
        $this->assertCount(0, $customer->fresh()->tokens);

        // Khách hàng đăng nhập lại phải nhận 403 với thông báo tiếng Việt
        $loginRes = $this->postJson('/api/auth/login', [
            'email'    => $customer->email,
            'password' => 'Secret123!',
        ]);

        $loginRes->assertStatus(403)
            ->assertJsonPath('message', 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
    }

    public function test_unlocking_restores_login(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer([
            'status'   => UserStatus::Locked,
            'password' => Hash::make('Secret123!'),
        ]);

        // Đang bị khóa -> đăng nhập bị chặn
        $this->postJson('/api/auth/login', [
            'email'    => $customer->email,
            'password' => 'Secret123!',
        ])->assertStatus(403);

        // Admin mở khóa
        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/customers/{$customer->id}/status", [
            'status' => 'active',
        ])->assertStatus(200);

        // Đăng nhập lại thành công
        $loginRes = $this->postJson('/api/auth/login', [
            'email'    => $customer->email,
            'password' => 'Secret123!',
        ]);

        $loginRes->assertStatus(200)
            ->assertJsonPath('user.status', 'active');
    }

    public function test_active_middleware_blocks_locked_user_on_checkout_and_cart_merge(): void
    {
        $customer = $this->createCustomer(['status' => UserStatus::Locked]);
        Sanctum::actingAs($customer);

        // Thử checkout (POST /api/orders) -> bị active middleware chặn 403
        $this->postJson('/api/orders', [
            'recipient_name'   => 'Test Name',
            'recipient_phone'  => '0901234567',
            'shipping_address' => 'Test Address',
            'payment_method'   => 'cod',
        ])->assertStatus(403)
          ->assertJsonPath('message', 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');

        // Thử merge cart (POST /api/cart/merge) -> bị active middleware chặn 403
        $this->postJson('/api/cart/merge', [
            'items' => [],
        ])->assertStatus(403)
          ->assertJsonPath('message', 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
    }

    public function test_existing_orders_remain_unchanged_when_customer_is_locked(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();

        $order1 = $this->createOrder($customer, ['status' => OrderStatus::Pending]);
        $order2 = $this->createOrder($customer, ['status' => OrderStatus::Confirmed]);

        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/customers/{$customer->id}/status", [
            'status' => 'locked',
        ])->assertStatus(200);

        // Trạng thái đơn hàng không bị thay đổi
        $this->assertSame(OrderStatus::Pending, $order1->fresh()->status);
        $this->assertSame(OrderStatus::Confirmed, $order2->fresh()->status);

        // Admin vẫn tiếp tục xử lý đơn hàng bình thường
        $this->patchJson("/api/admin/orders/{$order1->order_code}/status", [
            'status' => 'confirmed',
        ])->assertStatus(200);
        $this->assertSame(OrderStatus::Confirmed, $order1->fresh()->status);
    }

    public function test_customer_list_can_filter_by_status(): void
    {
        $admin = $this->createAdmin();
        $cActive = $this->createCustomer(['full_name' => 'Active Customer', 'status' => UserStatus::Active]);
        $cLocked = $this->createCustomer(['full_name' => 'Locked Customer', 'status' => UserStatus::Locked]);

        Sanctum::actingAs($admin);

        // Lọc locked
        $resLocked = $this->getJson('/api/admin/customers?status=locked')->assertStatus(200);
        $lockedNames = collect($resLocked->json('data'))->pluck('full_name')->all();
        $this->assertContains('Locked Customer', $lockedNames);
        $this->assertNotContains('Active Customer', $lockedNames);

        // Lọc active
        $resActive = $this->getJson('/api/admin/customers?status=active')->assertStatus(200);
        $activeNames = collect($resActive->json('data'))->pluck('full_name')->all();
        $this->assertContains('Active Customer', $activeNames);
        $this->assertNotContains('Locked Customer', $activeNames);
    }
}
