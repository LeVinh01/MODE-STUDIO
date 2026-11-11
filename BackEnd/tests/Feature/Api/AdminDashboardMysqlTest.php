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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;

#[Group('mysql')]
class AdminDashboardMysqlTest extends TestCase
{
    use RefreshDatabase;

    protected $connectionsToTransact = ['mysql_testing'];

    protected function beforeRefreshingDatabase(): void
    {
        config(['database.default' => 'mysql_testing']);
    }

    protected function setUp(): void
    {
        parent::setUp();

        config(['database.default' => 'mysql_testing']);
        DB::purge('mysql_testing');

        try {
            DB::connection('mysql_testing')->getPdo();
        } catch (\Throwable $e) {
            $this->fail('Không thể kết nối đến MySQL testing database (mode_studio_testing). Hãy đảm bảo container mysql đang chạy và DB mode_studio_testing đã được tạo. Lỗi: ' . $e->getMessage());
        }

        $this->assertEquals(
            'mode_studio_testing',
            DB::connection('mysql_testing')->getDatabaseName(),
            'Database test phải là mode_studio_testing.'
        );

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

    public function test_mysql_group_by_day_and_month_revenue_with_only_full_group_by(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        Sanctum::actingAs($admin);

        // Tạo 2 đơn giao vào ngày 10/11/2026 giờ VN (tổng: 1.200.000)
        $t1 = Carbon::createFromFormat('Y-m-d H:i:s', '2026-11-10 09:00:00', 'Asia/Ho_Chi_Minh')->setTimezone('UTC');
        $o1 = $this->createOrder($customer, ['status' => OrderStatus::Delivered, 'total_amount' => 500000, 'paid_at' => $t1]);
        $o1->created_at = $t1;
        $o1->updated_at = $t1;
        $o1->save();

        $t2 = Carbon::createFromFormat('Y-m-d H:i:s', '2026-11-10 15:00:00', 'Asia/Ho_Chi_Minh')->setTimezone('UTC');
        $o2 = $this->createOrder($customer, ['status' => OrderStatus::Delivered, 'total_amount' => 700000, 'paid_at' => $t2]);
        $o2->created_at = $t2;
        $o2->updated_at = $t2;
        $o2->save();

        // Tạo 1 đơn giao vào ngày 11/11/2026 giờ VN (300.000)
        $t3 = Carbon::createFromFormat('Y-m-d H:i:s', '2026-11-11 11:00:00', 'Asia/Ho_Chi_Minh')->setTimezone('UTC');
        $o3 = $this->createOrder($customer, ['status' => OrderStatus::Delivered, 'total_amount' => 300000, 'paid_at' => $t3]);
        $o3->created_at = $t3;
        $o3->updated_at = $t3;
        $o3->save();

        // 1. Test group_by=day trên MySQL
        $resDay = $this->getJson('/api/admin/dashboard/revenue?from=2026-11-10&to=2026-11-11&group_by=day')
            ->assertStatus(200);

        $timelineDay = $resDay->json('data.timeline');
        $this->assertCount(2, $timelineDay);

        $this->assertSame('2026-11-10', $timelineDay[0]['date']);
        $this->assertSame(1200000, $timelineDay[0]['revenue']);
        $this->assertSame(2, $timelineDay[0]['orders_count']);

        $this->assertSame('2026-11-11', $timelineDay[1]['date']);
        $this->assertSame(300000, $timelineDay[1]['revenue']);
        $this->assertSame(1, $timelineDay[1]['orders_count']);

        // 2. Test group_by=month trên MySQL
        $resMonth = $this->getJson('/api/admin/dashboard/revenue?from=2026-11-01&to=2026-11-30&group_by=month')
            ->assertStatus(200);

        $timelineMonth = $resMonth->json('data.timeline');
        $this->assertCount(1, $timelineMonth);
        $this->assertSame('2026-11', $timelineMonth[0]['date']);
        $this->assertSame(1500000, $timelineMonth[0]['revenue']);
        $this->assertSame(3, $timelineMonth[0]['orders_count']);
    }

    public function test_mysql_order_at_00_30_vn_falls_into_correct_date(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        Sanctum::actingAs($admin);

        $targetDateVn = '2026-11-10';

        // Đơn giao lúc 00:30 ngày 10/11 giờ VN (tức 17:30 ngày 09/11 giờ UTC)
        $time0030Utc = Carbon::createFromFormat('Y-m-d H:i:s', '2026-11-10 00:30:00', 'Asia/Ho_Chi_Minh')->setTimezone('UTC');

        $order = $this->createOrder($customer, [
            'status'       => OrderStatus::Delivered,
            'total_amount' => 990000,
            'paid_at'      => $time0030Utc,
        ]);
        $order->created_at = $time0030Utc;
        $order->updated_at = $time0030Utc;
        $order->save();

        $res = $this->getJson("/api/admin/dashboard/revenue?from={$targetDateVn}&to={$targetDateVn}&group_by=day")
            ->assertStatus(200);

        $timeline = $res->json('data.timeline');
        $this->assertCount(1, $timeline);
        $this->assertSame('2026-11-10', $timeline[0]['date']);
        $this->assertSame(990000, $timeline[0]['revenue']);
        $this->assertSame(1, $timeline[0]['orders_count']);
    }

    public function test_mysql_top_products_with_only_full_group_by_and_deleted_product(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        Sanctum::actingAs($admin);

        $dateVn = '2026-11-10';
        $timeUtc = Carbon::createFromFormat('Y-m-d H:i:s', '2026-11-10 14:00:00', 'Asia/Ho_Chi_Minh')->setTimezone('UTC');

        $category = \App\Models\Category::first();
        $brand = \App\Models\Brand::first();
        $color = \App\Models\Color::first();
        $size = \App\Models\Size::first();

        $product = Product::create([
            'category_id'      => $category->id,
            'brand_id'         => $brand->id,
            'name'             => 'Áo Len Thử Nghiệm Xóa Mềm',
            'slug'             => 'ao-len-thu-nghiem-xoa-mem-' . uniqid(),
            'gender'           => 'unisex',
            'base_price'       => 350000,
            'status'           => 'active',
        ]);

        $variant = ProductVariant::create([
            'product_id'     => $product->id,
            'color_id'       => $color->id,
            'size_id'        => $size->id,
            'sku'            => 'TEST-SKU-' . uniqid(),
            'stock_quantity' => 15,
            'is_active'      => true,
        ]);

        $order = $this->createOrder($customer, [
            'status'  => OrderStatus::Delivered,
            'paid_at' => $timeUtc,
        ]);
        $order->created_at = $timeUtc;
        $order->updated_at = $timeUtc;
        $order->save();

        $this->addOrderItem($order, $variant, 4, 350000); // 1.400.000 đ

        // Xóa mềm sản phẩm để kiểm tra snapshot và product_id vẫn được xử lý an toàn
        $product->delete();

        $res = $this->getJson("/api/admin/dashboard/top-products?from={$dateVn}&to={$dateVn}&limit=5")
            ->assertStatus(200);

        $data = $res->json('data');
        $this->assertCount(1, $data);
        $this->assertSame($product->id, $data[0]['product_id']);
        $this->assertSame(4, $data[0]['total_quantity']);
        $this->assertSame(1400000, $data[0]['total_revenue']);
    }
}
