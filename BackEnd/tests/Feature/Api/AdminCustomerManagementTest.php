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
}
