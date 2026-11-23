<?php

namespace Tests\Feature\Api;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\UserStatus;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\BrandSeeder;
use Database\Seeders\CategorySeeder;
use Database\Seeders\ColorSeeder;
use Database\Seeders\ProductSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SizeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminDashboardUnifiedTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            RoleSeeder::class,
            ColorSeeder::class,
            SizeSeeder::class,
            CategorySeeder::class,
            BrandSeeder::class,
            ProductSeeder::class,
        ]);
    }

    protected function createUserWithRole(string $roleName, array $attributes = []): User
    {
        $role = Role::where('name', $roleName)->firstOrFail();

        return User::create(array_merge([
            'full_name' => ucfirst($roleName) . ' User',
            'email'     => $roleName . '_' . uniqid() . '@example.com',
            'phone'     => '0901234567',
            'password'  => Hash::make('Secret123!'),
            'role_id'   => $role->id,
            'status'    => UserStatus::Active,
        ], $attributes));
    }

    protected function createAdmin(): User
    {
        return $this->createUserWithRole('admin');
    }

    protected function createOperator(): User
    {
        return $this->createUserWithRole('operator');
    }

    protected function createCustomer(): User
    {
        return $this->createUserWithRole('customer');
    }

    protected function createOrder(User $user, array $attributes = []): Order
    {
        $orderCode = $attributes['order_code'] ?? ('MS' . date('ymd') . strtoupper(Str::random(6)));
        unset($attributes['order_code']);

        $createdAt = $attributes['created_at'] ?? null;
        unset($attributes['created_at']);

        $order = Order::create(array_merge([
            'order_code'       => $orderCode,
            'user_id'          => $user->id,
            'status'           => OrderStatus::Pending,
            'payment_method'   => PaymentMethod::Cod,
            'payment_status'   => PaymentStatus::Unpaid,
            'recipient_name'   => 'Nguyen Van Nhan',
            'recipient_phone'  => '0912345678',
            'shipping_address' => '123 Le Loi, Q1, HCMC',
            'note'             => null,
            'subtotal'         => 500000,
            'shipping_fee'     => 30000,
            'discount_amount'  => 0,
            'total_amount'     => 530000,
        ], $attributes));

        if ($createdAt) {
            $order->created_at = $createdAt;
            $order->save();
        }

        return $order;
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $response = $this->getJson('/api/admin/dashboard');
        $response->assertStatus(401);
    }

    public function test_customer_role_returns_403(): void
    {
        $customer = $this->createCustomer();
        $response = $this->actingAs($customer, 'sanctum')->getJson('/api/admin/dashboard');
        $response->assertStatus(403);
    }

    public function test_admin_and_operator_can_access_unified_dashboard(): void
    {
        $admin = $this->createAdmin();
        $operator = $this->createOperator();

        $adminRes = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard');
        $adminRes->assertStatus(200)
            ->assertJsonPath('data.range', '30d')
            ->assertJsonStructure([
                'data' => [
                    'range',
                    'current_period',
                    'previous_period',
                    'current',
                    'previous',
                    'delta_percent',
                    'revenue_time_series',
                    'top_products',
                    'revenue_by_category',
                    'order_status_breakdown',
                    'payment_method_split',
                    'alerts',
                ],
            ]);

        $operatorRes = $this->actingAs($operator, 'sanctum')->getJson('/api/admin/dashboard');
        $operatorRes->assertStatus(200);
    }

    public function test_empty_database_does_not_cause_division_by_zero(): void
    {
        $admin = $this->createAdmin();
        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard?range=30d');

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertSame(0, $data['current']['revenue']);
        $this->assertSame(0, $data['current']['orders_count']);
        $this->assertSame(0, $data['current']['total_orders_count']);
        $this->assertSame(0, $data['current']['delivered_orders_count']);
        $this->assertSame(0, $data['current']['average_order_value']);
        $this->assertEquals(0, $data['current']['cancellation_rate']);

        // Delta phải là null khi kỳ trước bằng 0
        $this->assertNull($data['delta_percent']['revenue']);
        $this->assertNull($data['delta_percent']['orders_count']);
        $this->assertNull($data['delta_percent']['average_order_value']);
        $this->assertNull($data['delta_percent']['cancellation_rate']);
    }

    public function test_supported_ranges_and_invalid_range_validation(): void
    {
        $admin = $this->createAdmin();

        foreach (['7d', '30d', '90d', 'this_month', 'this_quarter', 'this_year'] as $range) {
            $res = $this->actingAs($admin, 'sanctum')->getJson("/api/admin/dashboard?range={$range}");
            $res->assertStatus(200)->assertJsonPath('data.range', $range);
        }

        $invalidRes = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard?range=invalid');
        $invalidRes->assertStatus(422)
            ->assertJsonValidationErrors(['range']);
    }

    public function test_cancelled_orders_excluded_from_revenue_and_cancel_rate_calculated_correctly(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();

        $now = Carbon::now('Asia/Ho_Chi_Minh');

        // Tạo 1 đơn giao thành công (delivered)
        $deliveredOrder = $this->createOrder($customer, [
            'status'         => OrderStatus::Delivered,
            'payment_status' => PaymentStatus::Paid,
            'total_amount'   => 1000000,
            'paid_at'        => $now->copy()->setTimezone('UTC'),
            'created_at'     => $now->copy()->setTimezone('UTC'),
        ]);

        // Tạo 1 đơn đang chờ (pending)
        $pendingOrder = $this->createOrder($customer, [
            'status'         => OrderStatus::Pending,
            'total_amount'   => 500000,
            'created_at'     => $now->copy()->setTimezone('UTC'),
        ]);

        // Tạo 1 đơn hủy (cancelled) với số tiền lớn
        $cancelledOrder = $this->createOrder($customer, [
            'status'         => OrderStatus::Cancelled,
            'total_amount'   => 9000000,
            'created_at'     => $now->copy()->setTimezone('UTC'),
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard?range=7d');
        $response->assertStatus(200);

        $current = $response->json('data.current');

        // Doanh thu chỉ tính đơn delivered: 1.000.000 (không tính 9.000.000 của đơn hủy hay 500.000 của đơn pending)
        $this->assertSame(1000000, $current['revenue']);
        $this->assertSame(1, $current['delivered_orders_count']);
        $this->assertSame(1000000, $current['average_order_value']);

        // Tổng đơn tạo = 3 (1 delivered + 1 pending + 1 cancelled)
        $this->assertSame(3, $current['total_orders_count']);
        // Đơn không hủy = 2 (1 delivered + 1 pending)
        $this->assertSame(2, $current['orders_count']);
        // Đơn hủy = 1
        $this->assertSame(1, $current['cancelled_orders_count']);

        // Tỷ lệ hủy = 1 / 3 = 33.3%
        $this->assertSame(33.3, $current['cancellation_rate']);
    }

    public function test_previous_period_comparison_and_delta_percent(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();

        $now = Carbon::now('Asia/Ho_Chi_Minh');

        // Kỳ hiện tại (30 ngày: [now - 29 days, now])
        $this->createOrder($customer, [
            'status'         => OrderStatus::Delivered,
            'total_amount'   => 1200000,
            'paid_at'        => $now->copy()->subDays(5)->setTimezone('UTC'),
            'created_at'     => $now->copy()->subDays(5)->setTimezone('UTC'),
        ]);

        // Kỳ trước tương đương ([now - 59 days, now - 30 days])
        $prevTime = $now->copy()->subDays(40);
        $this->createOrder($customer, [
            'status'         => OrderStatus::Delivered,
            'total_amount'   => 1000000,
            'paid_at'        => $prevTime->copy()->setTimezone('UTC'),
            'created_at'     => $prevTime->copy()->setTimezone('UTC'),
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard?range=30d');
        $response->assertStatus(200);

        $current = $response->json('data.current');
        $previous = $response->json('data.previous');
        $delta = $response->json('data.delta_percent');

        $this->assertSame(1200000, $current['revenue']);
        $this->assertSame(1000000, $previous['revenue']);

        // Delta revenue = ((1200000 - 1000000) / 1000000) * 100 = 20.0%
        $this->assertEquals(20.0, $delta['revenue']);
    }

    public function test_cancellation_rate_delta_in_percentage_points(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();

        $now = Carbon::now('Asia/Ho_Chi_Minh');

        // Kỳ trước: 10 đơn (1 hủy => 10.0%)
        $prevTime = $now->copy()->subDays(35);
        $this->createOrder($customer, [
            'status'     => OrderStatus::Cancelled,
            'created_at' => $prevTime->copy()->setTimezone('UTC'),
        ]);
        for ($i = 0; $i < 9; $i++) {
            $this->createOrder($customer, [
                'status'     => OrderStatus::Delivered,
                'paid_at'    => $prevTime->copy()->setTimezone('UTC'),
                'created_at' => $prevTime->copy()->setTimezone('UTC'),
            ]);
        }

        // Kỳ hiện tại: 10 đơn (2 hủy => 20.0%)
        $this->createOrder($customer, [
            'status'     => OrderStatus::Cancelled,
            'created_at' => $now->copy()->subDays(2)->setTimezone('UTC'),
        ]);
        $this->createOrder($customer, [
            'status'     => OrderStatus::Cancelled,
            'created_at' => $now->copy()->subDays(3)->setTimezone('UTC'),
        ]);
        for ($i = 0; $i < 8; $i++) {
            $this->createOrder($customer, [
                'status'     => OrderStatus::Delivered,
                'paid_at'    => $now->copy()->subDays(4)->setTimezone('UTC'),
                'created_at' => $now->copy()->subDays(4)->setTimezone('UTC'),
            ]);
        }

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard?range=30d');
        $response->assertStatus(200);

        $current = $response->json('data.current');
        $previous = $response->json('data.previous');
        $delta = $response->json('data.delta_percent');

        $this->assertEquals(20.0, $current['cancellation_rate']);
        $this->assertEquals(10.0, $previous['cancellation_rate']);
        // Biến động điểm phần trăm: 20.0 - 10.0 = 10.0 (điểm %)
        $this->assertEquals(10.0, $delta['cancellation_rate']);
    }

    public function test_revenue_by_category_structure_and_sum_equality(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();

        $product = Product::firstOrFail();
        $variant = ProductVariant::where('product_id', $product->id)->firstOrFail();

        $now = Carbon::now('Asia/Ho_Chi_Minh');

        $order = $this->createOrder($customer, [
            'status'       => OrderStatus::Delivered,
            'total_amount' => 1500000,
            'paid_at'      => $now->copy()->setTimezone('UTC'),
            'updated_at'   => $now->copy()->setTimezone('UTC'),
        ]);

        OrderItem::create([
            'order_id'     => $order->id,
            'product_id'   => $product->id,
            'variant_id'   => $variant->id,
            'product_name' => $product->name,
            'sku'          => $variant->sku,
            'color_name'   => 'Đen',
            'size_name'    => 'S',
            'unit_price'   => 1500000,
            'quantity'     => 1,
            'line_total'   => 1500000,
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard?range=7d');
        $response->assertStatus(200);

        $catData = $response->json('data.revenue_by_category');
        $this->assertArrayHasKey('root_groups', $catData);
        $this->assertArrayHasKey('leaf_categories', $catData);
        $this->assertSame(1500000, $catData['total_delivered_revenue']);
        $this->assertSame(1, $catData['total_units_sold']);

        $rootSum = array_sum(array_column($catData['root_groups'], 'revenue'));
        $leafSum = array_sum(array_column($catData['leaf_categories'], 'revenue'));

        $this->assertSame($catData['total_delivered_revenue'], $rootSum);
        $this->assertSame($catData['total_delivered_revenue'], $leafSum);
    }

    public function test_refund_pending_orders_reflected_in_alerts(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();

        // Tạo đơn với payment_status = refund_pending
        $this->createOrder($customer, [
            'status'         => OrderStatus::Cancelled,
            'payment_status' => PaymentStatus::RefundPending,
        ]);

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard');
        $response->assertStatus(200);

        $alerts = collect($response->json('data.alerts'))->keyBy('id');

        $this->assertTrue($alerts->has('refund_pending'));
        $this->assertGreaterThanOrEqual(1, $alerts['refund_pending']['count']);
        $this->assertSame('/admin/orders?payment_status=refund_pending', $alerts['refund_pending']['link']);
    }

    public function test_granularity_switches_between_day_and_week(): void
    {
        $admin = $this->createAdmin();

        $res30 = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard?range=30d');
        $res30->assertStatus(200);
        $this->assertSame('day', $res30->json('data.revenue_time_series.granularity'));

        $res90 = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard?range=90d');
        $res90->assertStatus(200);
        $this->assertSame('week', $res90->json('data.revenue_time_series.granularity'));
    }

    public function test_custom_range_without_dates_fails_validation(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard?range=custom');
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['from', 'to']);
    }

    public function test_dates_without_range_infers_custom_range(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard?from=2026-10-01&to=2026-10-15');
        $response->assertStatus(200);
        $this->assertSame('custom', $response->json('data.range'));
        $this->assertSame('2026-10-01', $response->json('data.current_period.from'));
        $this->assertSame('2026-10-15', $response->json('data.current_period.to'));
    }

    public function test_operational_alerts_order_matches_specification(): void
    {
        $admin = $this->createAdmin();

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard');
        $response->assertStatus(200);

        $alerts = $response->json('data.alerts');
        $this->assertCount(3, $alerts);
        $this->assertSame('low_stock', $alerts[0]['id']);
        $this->assertSame('/admin/inventory', $alerts[0]['link']);
        $this->assertSame('pending_orders', $alerts[1]['id']);
        $this->assertSame('/admin/orders?status=pending', $alerts[1]['link']);
        $this->assertSame('refund_pending', $alerts[2]['id']);
        $this->assertSame('/admin/orders?payment_status=refund_pending', $alerts[2]['link']);
    }
}
