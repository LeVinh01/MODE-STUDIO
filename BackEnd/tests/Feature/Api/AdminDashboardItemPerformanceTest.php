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

class AdminDashboardItemPerformanceTest extends TestCase
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

    protected function createUserWithRole(string $roleName): User
    {
        $role = Role::where('name', $roleName)->firstOrFail();

        return User::create([
            'full_name' => ucfirst($roleName) . ' User',
            'email'     => $roleName . '_' . uniqid() . '@example.com',
            'phone'     => '0901234567',
            'password'  => Hash::make('Secret123!'),
            'role_id'   => $role->id,
            'status'    => UserStatus::Active,
        ]);
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
            'status'           => OrderStatus::Delivered,
            'payment_method'   => PaymentMethod::Cod,
            'payment_status'   => PaymentStatus::Paid,
            'recipient_name'   => 'Nguyen Van Nhan',
            'recipient_phone'  => '0912345678',
            'shipping_address' => '123 Le Loi, Q1, HCMC',
            'note'             => null,
            'subtotal'         => 1000000,
            'shipping_fee'     => 0,
            'discount_amount'  => 0,
            'total_amount'     => 1000000,
        ], $attributes));

        if ($createdAt) {
            $order->created_at = $createdAt;
            $order->save();
        }

        return $order;
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $response = $this->getJson('/api/admin/dashboard/item-performance?target_type=product&target_id=1');
        $response->assertStatus(401);
    }

    public function test_customer_role_returns_403(): void
    {
        $customer = $this->createUserWithRole('customer');
        $response = $this->actingAs($customer, 'sanctum')
            ->getJson('/api/admin/dashboard/item-performance?target_type=product&target_id=1');
        $response->assertStatus(403);
    }

    public function test_validation_fails_for_invalid_parameters(): void
    {
        $admin = $this->createUserWithRole('admin');

        // Missing target_type & target_id
        $res = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard/item-performance');
        $res->assertStatus(422);
        $res->assertJsonValidationErrors(['target_type', 'target_id']);

        // Invalid target_type
        $res = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/dashboard/item-performance?target_type=invalid&target_id=1');
        $res->assertStatus(422);
        $res->assertJsonValidationErrors(['target_type']);

        // Custom range without from/to
        $res = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/dashboard/item-performance?target_type=product&target_id=1&range=custom');
        $res->assertStatus(422);
        $res->assertJsonValidationErrors(['from', 'to']);

        // Custom range exceeding 366 days
        $res = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/dashboard/item-performance?target_type=product&target_id=1&range=custom&from=2024-01-01&to=2025-02-05');
        $res->assertStatus(422);
        $res->assertJsonValidationErrors(['to']);
    }

    public function test_product_performance_returns_correct_metrics_and_deltas(): void
    {
        $admin = $this->createUserWithRole('admin');
        $customer = $this->createUserWithRole('customer');

        $product = Product::firstOrFail();
        $variant = ProductVariant::where('product_id', $product->id)->firstOrFail();

        $now = Carbon::now('Asia/Ho_Chi_Minh');

        // Current period order (delivered) with this product
        $orderCurrent = $this->createOrder($customer, [
            'status'       => OrderStatus::Delivered,
            'total_amount' => 2000000,
            'paid_at'      => $now->copy()->subDays(2)->setTimezone('UTC'),
            'updated_at'   => $now->copy()->subDays(2)->setTimezone('UTC'),
        ]);

        OrderItem::create([
            'order_id'     => $orderCurrent->id,
            'product_id'   => $product->id,
            'variant_id'   => $variant->id,
            'product_name' => $product->name,
            'sku'          => $variant->sku,
            'color_name'   => 'Đen',
            'size_name'    => 'S',
            'unit_price'   => 1000000,
            'quantity'     => 2,
            'line_total'   => 2000000,
        ]);

        // Previous period order (delivered) with this product
        $prevTime = $now->copy()->subDays(35);
        $orderPrev = $this->createOrder($customer, [
            'status'       => OrderStatus::Delivered,
            'total_amount' => 1000000,
            'paid_at'      => $prevTime->copy()->setTimezone('UTC'),
            'updated_at'   => $prevTime->copy()->setTimezone('UTC'),
            'created_at'   => $prevTime->copy()->setTimezone('UTC'),
        ]);

        OrderItem::create([
            'order_id'     => $orderPrev->id,
            'product_id'   => $product->id,
            'variant_id'   => $variant->id,
            'product_name' => $product->name,
            'sku'          => $variant->sku,
            'color_name'   => 'Đen',
            'size_name'    => 'S',
            'unit_price'   => 1000000,
            'quantity'     => 1,
            'line_total'   => 1000000,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/dashboard/item-performance?target_type=product&target_id={$product->id}&range=30d");

        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertSame('product', $data['target_type']);
        $this->assertSame($product->id, $data['target_id']);
        $this->assertSame($product->name, $data['target_name']);

        // Summary
        $this->assertSame(2, $data['summary']['units_sold']);
        $this->assertSame(2000000, $data['summary']['revenue']);
        $this->assertEquals(100.0, $data['summary']['share_of_total_revenue']);

        // Previous
        $this->assertSame(1, $data['previous_summary']['units_sold']);
        $this->assertSame(1000000, $data['previous_summary']['revenue']);

        // Delta
        $this->assertEquals(100.0, $data['delta']['units_sold']);
        $this->assertEquals(100.0, $data['delta']['revenue']);

        // Timeline
        $this->assertNotEmpty($data['timeline']);
    }

    public function test_category_performance_aggregates_descendants(): void
    {
        $admin = $this->createUserWithRole('admin');
        $customer = $this->createUserWithRole('customer');

        // Select root category 'women'
        $womenCategory = Category::where('slug', 'women')->firstOrFail();
        $dressesCategory = Category::where('slug', 'dresses')->firstOrFail();

        // Ensure dresses is a child of women
        $dressesCategory->update(['parent_id' => $womenCategory->id]);

        $product = Product::where('category_id', $dressesCategory->id)->firstOrFail();
        $variant = ProductVariant::where('product_id', $product->id)->firstOrFail();

        $now = Carbon::now('Asia/Ho_Chi_Minh');

        $order = $this->createOrder($customer, [
            'status'       => OrderStatus::Delivered,
            'total_amount' => 1500000,
            'paid_at'      => $now->copy()->subDays(1)->setTimezone('UTC'),
            'updated_at'   => $now->copy()->subDays(1)->setTimezone('UTC'),
        ]);

        OrderItem::create([
            'order_id'     => $order->id,
            'product_id'   => $product->id,
            'variant_id'   => $variant->id,
            'product_name' => $product->name,
            'sku'          => $variant->sku,
            'color_name'   => 'Xanh',
            'size_name'    => 'M',
            'unit_price'   => 1500000,
            'quantity'     => 1,
            'line_total'   => 1500000,
        ]);

        // Query performance for parent category 'women'
        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/dashboard/item-performance?target_type=category&target_id={$womenCategory->id}&range=7d");

        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertSame('category', $data['target_type']);
        $this->assertSame($womenCategory->id, $data['target_id']);
        $this->assertSame(1, $data['summary']['units_sold']);
        $this->assertSame(1500000, $data['summary']['revenue']);
    }

    public function test_zero_division_safety_when_shop_has_no_revenue(): void
    {
        $admin = $this->createUserWithRole('admin');
        $product = Product::firstOrFail();

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/dashboard/item-performance?target_type=product&target_id={$product->id}&range=7d");

        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertSame(0, $data['summary']['units_sold']);
        $this->assertSame(0, $data['summary']['revenue']);
        $this->assertEquals(0.0, $data['summary']['share_of_total_revenue']);
        $this->assertNull($data['delta']['units_sold']);
        $this->assertNull($data['delta']['revenue']);
        $this->assertNull($data['delta']['share_of_total_revenue']);
    }

    public function test_all_categories_whole_store_performance(): void
    {
        $admin = $this->createUserWithRole('admin');
        $customer = $this->createUserWithRole('customer');

        $product = Product::firstOrFail();
        $variant = ProductVariant::where('product_id', $product->id)->firstOrFail();

        $now = Carbon::now('Asia/Ho_Chi_Minh');

        $order = $this->createOrder($customer, [
            'status'       => OrderStatus::Delivered,
            'total_amount' => 2000000,
            'paid_at'      => $now->copy()->setTimezone('UTC'),
            'created_at'   => $now->copy()->setTimezone('UTC'),
        ]);

        OrderItem::create([
            'order_id'     => $order->id,
            'product_id'   => $product->id,
            'variant_id'   => $variant->id,
            'product_name' => $product->name,
            'sku'          => $variant->sku,
            'color_name'   => 'Đen',
            'size_name'    => 'L',
            'unit_price'   => 2000000,
            'quantity'     => 1,
            'line_total'   => 2000000,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/dashboard/item-performance?target_type=category&target_id=0&range=7d');

        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertSame('category', $data['target_type']);
        $this->assertSame(0, $data['target_id']);
        $this->assertSame('Tất cả danh mục', $data['target_name']);
        $this->assertGreaterThanOrEqual(1, $data['summary']['units_sold']);
        $this->assertGreaterThanOrEqual(2000000, $data['summary']['revenue']);
        $this->assertEquals(100.0, $data['summary']['share_of_total_revenue']);
    }
}
