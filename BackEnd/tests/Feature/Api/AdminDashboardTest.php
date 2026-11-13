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
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
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

    protected function createAdmin(array $attributes = []): User
    {
        return $this->createUserWithRole('admin', $attributes);
    }

    protected function createOperator(array $attributes = []): User
    {
        return $this->createUserWithRole('operator', $attributes);
    }

    protected function createCustomer(array $attributes = []): User
    {
        return $this->createUserWithRole('customer', $attributes);
    }

    protected function createOrder(User $user, array $attributes = []): Order
    {
        $orderCode = $attributes['order_code'] ?? ('MS' . date('ymd') . strtoupper(Str::random(6)));
        unset($attributes['order_code']);

        return Order::create(array_merge([
            'order_code'       => $orderCode,
            'user_id'          => $user->id,
            'status'           => OrderStatus::Pending,
            'payment_method'   => PaymentMethod::Cod,
            'payment_status'   => PaymentStatus::Unpaid,
            'recipient_name'   => 'Nguyen Van A',
            'recipient_phone'  => '0912345678',
            'shipping_address' => '123 Le Loi, Q1, HCMC',
            'note'             => null,
            'subtotal'         => 500000,
            'shipping_fee'     => 30000,
            'discount_amount'  => 0,
            'total_amount'     => 530000,
        ], $attributes));
    }

    protected function addOrderItem(Order $order, ProductVariant $variant, int $quantity = 1, int $unitPrice = 250000): OrderItem
    {
        $product = $variant->product;

        return OrderItem::create([
            'order_id'     => $order->id,
            'product_id'   => $product->id,
            'variant_id'   => $variant->id,
            'product_name' => $product->name,
            'sku'          => $variant->sku,
            'color_name'   => $variant->color?->name ?? 'Default',
            'size_name'    => $variant->size?->name ?? 'Default',
            'image_url'    => 'https://example.com/test.jpg',
            'unit_price'   => $unitPrice,
            'quantity'     => $quantity,
            'line_total'   => $unitPrice * $quantity,
        ]);
    }

    // ==========================================
    // 1. Phân quyền truy cập (RBAC)
    // ==========================================

    public function test_unauthenticated_request_returns_401(): void
    {
        $this->getJson('/api/admin/dashboard/summary')->assertStatus(401);
        $this->getJson('/api/admin/dashboard/revenue')->assertStatus(401);
        $this->getJson('/api/admin/dashboard/top-products')->assertStatus(401);
    }

    public function test_customer_role_returns_403(): void
    {
        $customer = $this->createCustomer();
        Sanctum::actingAs($customer);

        $this->getJson('/api/admin/dashboard/summary')->assertStatus(403);
        $this->getJson('/api/admin/dashboard/revenue')->assertStatus(403);
        $this->getJson('/api/admin/dashboard/top-products')->assertStatus(403);
    }

    public function test_locked_operator_or_admin_returns_403(): void
    {
        $lockedAdmin = $this->createAdmin(['status' => UserStatus::Locked]);
        Sanctum::actingAs($lockedAdmin);

        $this->getJson('/api/admin/dashboard/summary')->assertStatus(403);
    }

    public function test_operator_and_admin_can_access_dashboard_endpoints(): void
    {
        $operator = $this->createOperator();
        Sanctum::actingAs($operator);

        $this->getJson('/api/admin/dashboard/summary')->assertStatus(200);
        $this->getJson('/api/admin/dashboard/revenue')->assertStatus(200);
        $this->getJson('/api/admin/dashboard/top-products')->assertStatus(200);

        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/dashboard/summary')->assertStatus(200);
        $this->getJson('/api/admin/dashboard/revenue')->assertStatus(200);
        $this->getJson('/api/admin/dashboard/top-products')->assertStatus(200);
    }

    // ==========================================
    // 2. Validate tham số đầu vào
    // ==========================================

    public function test_validation_rejects_from_after_to(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $res = $this->getJson('/api/admin/dashboard/summary?from=2026-11-10&to=2026-11-05')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['to']);

        $this->assertSame(
            'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.',
            $res->json('errors.to.0')
        );
    }

    public function test_validation_rejects_range_greater_than_366_days(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $res = $this->getJson('/api/admin/dashboard/summary?from=2025-01-01&to=2026-01-10')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['to']);

        $this->assertSame(
            'Khoảng thời gian tra cứu không được vượt quá 366 ngày.',
            $res->json('errors.to.0')
        );
    }

    public function test_validation_rejects_invalid_group_by(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $res = $this->getJson('/api/admin/dashboard/revenue?group_by=year')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['group_by']);

        $this->assertSame(
            'Tham số group_by chỉ chấp nhận day hoặc month.',
            $res->json('errors.group_by.0')
        );
    }

    public function test_validation_rejects_invalid_limit(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/dashboard/top-products?limit=0')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['limit']);

        $this->getJson('/api/admin/dashboard/top-products?limit=100')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['limit']);
    }

    // ==========================================
    // 3. Doanh thu & Chỉ số Tổng quan (Summary)
    // ==========================================

    public function test_summary_revenue_only_counts_delivered_orders(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        Sanctum::actingAs($admin);

        $testDateVn = '2026-11-10';
        $deliveredTimeUtc = Carbon::createFromFormat('Y-m-d H:i:s', '2026-11-10 10:00:00', 'Asia/Ho_Chi_Minh')->setTimezone('UTC');

        // Đơn 1: Đã giao (1.000.000) -> TÍNH DOANH THU
        $orderDelivered = $this->createOrder($customer, [
            'status'       => OrderStatus::Delivered,
            'total_amount' => 1000000,
            'paid_at'      => $deliveredTimeUtc,
        ]);
        $orderDelivered->created_at = $deliveredTimeUtc;
        $orderDelivered->updated_at = $deliveredTimeUtc;
        $orderDelivered->save();

        // Đơn 2: Đang giao (500.000) -> KHÔNG TÍNH DOANH THU, CÓ TÍNH VÀO orders_count
        $orderShipping = $this->createOrder($customer, [
            'status'       => OrderStatus::Shipping,
            'total_amount' => 500000,
        ]);
        $orderShipping->created_at = $deliveredTimeUtc;
        $orderShipping->save();

        // Đơn 3: Đã hủy (300.000) -> KHÔNG TÍNH DOANH THU, KHÔNG VÀO orders_count
        $orderCancelled = $this->createOrder($customer, [
            'status'       => OrderStatus::Cancelled,
            'total_amount' => 300000,
        ]);
        $orderCancelled->created_at = $deliveredTimeUtc;
        $orderCancelled->save();

        // Đơn 4: Đã giao nhưng ở ngày khác ngoài khoảng
        $otherTimeUtc = Carbon::createFromFormat('Y-m-d H:i:s', '2026-11-01 10:00:00', 'Asia/Ho_Chi_Minh')->setTimezone('UTC');
        $orderOther = $this->createOrder($customer, [
            'status'       => OrderStatus::Delivered,
            'total_amount' => 700000,
            'paid_at'      => $otherTimeUtc,
        ]);
        $orderOther->created_at = $otherTimeUtc;
        $orderOther->updated_at = $otherTimeUtc;
        $orderOther->save();

        $res = $this->getJson("/api/admin/dashboard/summary?from={$testDateVn}&to={$testDateVn}")
            ->assertStatus(200);

        $data = $res->json('data');

        // Doanh thu chỉ gồm đơn đã giao trong ngày: 1.000.000 đ
        $this->assertSame(1000000, $data['revenue']);
        $this->assertSame(1, $data['delivered_orders_count']);
        $this->assertSame(1000000, $data['average_order_value']);

        // Tổng đơn hợp lệ trong ngày (không tính hủy): Đơn 1 + Đơn 2 = 2 đơn
        $this->assertSame(2, $data['orders_count']);

        // Phân bổ trạng thái
        $this->assertSame(1, $data['orders_by_status']['delivered']);
        $this->assertSame(1, $data['orders_by_status']['shipping']);
        $this->assertSame(1, $data['orders_by_status']['cancelled']);
        $this->assertSame(0, $data['orders_by_status']['pending']);
        $this->assertSame(0, $data['orders_by_status']['confirmed']);
    }

    public function test_summary_low_stock_matches_admin_stock_controller(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        // Gọi API low stock hiện có
        $stockRes = $this->getJson('/api/admin/stock/low?threshold=10')
            ->assertStatus(200);
        $expectedTotal = (int) $stockRes->json('meta.total');

        // Gọi API dashboard summary
        $summaryRes = $this->getJson('/api/admin/dashboard/summary')
            ->assertStatus(200);

        $this->assertSame($expectedTotal, $summaryRes->json('data.low_stock_variants_count'));
    }

    // ==========================================
    // 4. Doanh thu theo Ngày/Tháng & Điền ngày trống
    // ==========================================

    public function test_revenue_timeline_fills_empty_days_with_zeros(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        Sanctum::actingAs($admin);

        $fromStr = '2026-11-05';
        $toStr = '2026-11-07'; // 3 ngày: 05, 06, 07

        // Tạo đơn đã giao vào ngày 05/11
        $deliveredTimeUtc = Carbon::createFromFormat('Y-m-d H:i:s', '2026-11-05 14:00:00', 'Asia/Ho_Chi_Minh')->setTimezone('UTC');
        $order = $this->createOrder($customer, [
            'status'       => OrderStatus::Delivered,
            'total_amount' => 800000,
            'paid_at'      => $deliveredTimeUtc,
        ]);
        $order->created_at = $deliveredTimeUtc;
        $order->updated_at = $deliveredTimeUtc;
        $order->save();

        $res = $this->getJson("/api/admin/dashboard/revenue?from={$fromStr}&to={$toStr}&group_by=day")
            ->assertStatus(200);

        $timeline = $res->json('data.timeline');

        $this->assertCount(3, $timeline);

        // Ngày 05/11: có doanh thu 800.000, 1 đơn
        $this->assertSame('2026-11-05', $timeline[0]['date']);
        $this->assertSame(800000, $timeline[0]['revenue']);
        $this->assertSame(1, $timeline[0]['orders_count']);

        // Ngày 06/11: trống -> điền 0
        $this->assertSame('2026-11-06', $timeline[1]['date']);
        $this->assertSame(0, $timeline[1]['revenue']);
        $this->assertSame(0, $timeline[1]['orders_count']);

        // Ngày 07/11: trống -> điền 0
        $this->assertSame('2026-11-07', $timeline[2]['date']);
        $this->assertSame(0, $timeline[2]['revenue']);
        $this->assertSame(0, $timeline[2]['orders_count']);
    }

    public function test_order_at_00_30_vn_time_falls_into_correct_date(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        Sanctum::actingAs($admin);

        $targetDateVn = '2026-11-10';

        // Đơn giao lúc 00:30 ngày 10/11/2026 giờ VN (tương ứng 17:30 ngày 09/11/2026 giờ UTC)
        $time0030Vn = Carbon::createFromFormat('Y-m-d H:i:s', '2026-11-10 00:30:00', 'Asia/Ho_Chi_Minh')->setTimezone('UTC');

        $order = $this->createOrder($customer, [
            'status'       => OrderStatus::Delivered,
            'total_amount' => 450000,
            'paid_at'      => $time0030Vn,
        ]);
        $order->created_at = $time0030Vn;
        $order->updated_at = $time0030Vn;
        $order->save();

        $res = $this->getJson("/api/admin/dashboard/revenue?from={$targetDateVn}&to={$targetDateVn}&group_by=day")
            ->assertStatus(200);

        $timeline = $res->json('data.timeline');
        $this->assertCount(1, $timeline);
        $this->assertSame('2026-11-10', $timeline[0]['date']);
        $this->assertSame(450000, $timeline[0]['revenue']);
        $this->assertSame(1, $timeline[0]['orders_count']);
    }

    // ==========================================
    // 5. Top sản phẩm bán chạy
    // ==========================================

    public function test_top_products_aggregates_delivered_orders_and_sorts_correctly(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        Sanctum::actingAs($admin);

        $dateVn = '2026-11-10';
        $timeUtc = Carbon::createFromFormat('Y-m-d H:i:s', '2026-11-10 12:00:00', 'Asia/Ho_Chi_Minh')->setTimezone('UTC');

        $products = Product::where('status', 'active')->has('variants')->limit(2)->get();
        $variantA = $products[0]->variants()->first();
        $variantB = $products[1]->variants()->first();

        // Đơn 1: Đã giao, mua 5 SP A và 2 SP B
        $order1 = $this->createOrder($customer, [
            'status'  => OrderStatus::Delivered,
            'paid_at' => $timeUtc,
        ]);
        $order1->created_at = $timeUtc;
        $order1->updated_at = $timeUtc;
        $order1->save();
        $this->addOrderItem($order1, $variantA, 5, 100000); // 500.000
        $this->addOrderItem($order1, $variantB, 2, 200000); // 400.000

        // Đơn 2: Đã giao, mua thêm 3 SP B
        $order2 = $this->createOrder($customer, [
            'status'  => OrderStatus::Delivered,
            'paid_at' => $timeUtc,
        ]);
        $order2->created_at = $timeUtc;
        $order2->updated_at = $timeUtc;
        $order2->save();
        $this->addOrderItem($order2, $variantB, 3, 200000); // 600.000 -> Tổng SP B: 5 cái, 1.000.000 đ

        // Đơn 3: Chưa giao (Shipping) mua 10 SP A -> KHÔNG ĐƯỢC TÍNH VÀO TOP PRODUCTS
        $order3 = $this->createOrder($customer, ['status' => OrderStatus::Shipping]);
        $order3->created_at = $timeUtc;
        $order3->save();
        $this->addOrderItem($order3, $variantA, 10, 100000);

        $res = $this->getJson("/api/admin/dashboard/top-products?from={$dateVn}&to={$dateVn}&limit=5")
            ->assertStatus(200);

        $data = $res->json('data');

        $this->assertCount(2, $data);

        // SP B và SP A đều bán được 5 cái, nhưng SP B có doanh thu cao hơn (1.000.000 > 500.000) nên xếp trước
        $this->assertSame($products[1]->id, $data[0]['product_id']);
        $this->assertSame(5, $data[0]['total_quantity']);
        $this->assertSame(1000000, $data[0]['total_revenue']);

        $this->assertSame($products[0]->id, $data[1]['product_id']);
        $this->assertSame(5, $data[1]['total_quantity']);
        $this->assertSame(500000, $data[1]['total_revenue']);
    }

    public function test_summary_cancellation_rate_zero_when_no_orders(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $res = $this->getJson('/api/admin/dashboard/summary?from=2026-11-10&to=2026-11-10')
            ->assertStatus(200);

        $this->assertSame(0.0, (float) $res->json('data.cancellation_rate'));
    }

    public function test_summary_cancellation_rate_calculated_correctly_with_cancelled_orders(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        Sanctum::actingAs($admin);

        $dateVn = '2026-11-10';
        $timeUtc = Carbon::createFromFormat('Y-m-d H:i:s', '2026-11-10 14:00:00', 'Asia/Ho_Chi_Minh')->setTimezone('UTC');

        // Tạo 3 đơn Confirmed và 1 đơn Cancelled -> 1 / 4 * 100 = 25.0%
        for ($i = 0; $i < 3; $i++) {
            $o = $this->createOrder($customer, ['status' => OrderStatus::Confirmed]);
            $o->created_at = $timeUtc;
            $o->save();
        }

        $oCancelled = $this->createOrder($customer, ['status' => OrderStatus::Cancelled]);
        $oCancelled->created_at = $timeUtc;
        $oCancelled->save();

        $res = $this->getJson("/api/admin/dashboard/summary?from={$dateVn}&to={$dateVn}")
            ->assertStatus(200);

        $this->assertEquals(25.0, (float) $res->json('data.cancellation_rate'));
        $this->assertSame(3, $res->json('data.orders_count')); // đơn hợp lệ không tính đơn hủy
    }

    public function test_summary_cancellation_rate_respects_vietnam_timezone_date_boundaries(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        Sanctum::actingAs($admin);

        // 2026-11-10 00:30:00 VN = 2026-11-09 17:30:00 UTC (nằm trong ngày 10/11 VN)
        $insideVnTime = Carbon::createFromFormat('Y-m-d H:i:s', '2026-11-10 00:30:00', 'Asia/Ho_Chi_Minh')->setTimezone('UTC');
        $oCancelledInside = $this->createOrder($customer, ['status' => OrderStatus::Cancelled]);
        $oCancelledInside->created_at = $insideVnTime;
        $oCancelledInside->save();

        // 2026-11-09 23:59:00 VN = 2026-11-09 16:59:00 UTC (nằm ngoài ngày 10/11 VN)
        $outsideVnTime = Carbon::createFromFormat('Y-m-d H:i:s', '2026-11-09 23:59:00', 'Asia/Ho_Chi_Minh')->setTimezone('UTC');
        $oCancelledOutside = $this->createOrder($customer, ['status' => OrderStatus::Cancelled]);
        $oCancelledOutside->created_at = $outsideVnTime;
        $oCancelledOutside->save();

        // 1 đơn confirmed trong ngày 10/11 VN
        $oConfirmed = $this->createOrder($customer, ['status' => OrderStatus::Confirmed]);
        $oConfirmed->created_at = $insideVnTime;
        $oConfirmed->save();

        // Ngày 2026-11-10 VN có 2 đơn tạo (1 hủy, 1 confirmed) -> tỷ lệ 50.0%
        $res = $this->getJson('/api/admin/dashboard/summary?from=2026-11-10&to=2026-11-10')
            ->assertStatus(200);

        $this->assertEquals(50.0, (float) $res->json('data.cancellation_rate'));
        $this->assertSame(2, $res->json('data.orders_by_status.cancelled') + $res->json('data.orders_by_status.confirmed'));
    }
}
