<?php

namespace Tests\Feature\Api;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\ProductStatus;
use App\Enums\UserStatus;
use App\Models\Order;
use App\Models\OrderItem;
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
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderManagementTest extends TestCase
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

    protected function createCustomer(array $attributes = []): User
    {
        $role = Role::where('name', 'customer')->firstOrFail();

        return User::create(array_merge([
            'full_name' => 'Khách Hàng Quản Lý Đơn',
            'email'     => 'cust_' . uniqid() . '@example.com',
            'phone'     => '0901234567',
            'password'  => Hash::make('Secret123!'),
            'role_id'   => $role->id,
            'status'    => UserStatus::Active,
        ], $attributes));
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
            'shipping_address' => 'Số 123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
            'note'             => 'Giao giờ hành chính',
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
            'color_name'   => $variant->color ? $variant->color->name : 'Tiêu chuẩn',
            'size_name'    => $variant->size ? $variant->size->name : 'Tiêu chuẩn',
            'image_url'    => $product->mainImage ? $product->mainImage->image_url : null,
            'unit_price'   => $unitPrice,
            'quantity'     => $quantity,
            'line_total'   => $unitPrice * $quantity,
        ]);
    }

    protected function getActiveVariants(int $count = 2, int $stock = 20): array
    {
        $variants = ProductVariant::where('is_active', true)
            ->whereHas('product', fn($q) => $q->where('status', ProductStatus::Active)->whereNull('deleted_at'))
            ->take($count)
            ->get();

        foreach ($variants as $variant) {
            $variant->update(['stock_quantity' => $stock]);
        }

        return $variants->all();
    }

    public function test_unauthenticated_cannot_access_orders_endpoints(): void
    {
        $this->getJson('/api/orders')->assertStatus(401);
        $this->getJson('/api/orders/MS261108ABCD12')->assertStatus(401);
        $this->postJson('/api/orders/MS261108ABCD12/cancel')->assertStatus(401);
    }

    public function test_locked_user_receives_403_on_index_show_and_cancel(): void
    {
        $user = $this->createCustomer(['status' => UserStatus::Locked]);
        $order = $this->createOrder($user);

        Sanctum::actingAs($user);

        // GET /api/orders -> 403
        $this->getJson('/api/orders')
            ->assertStatus(403)
            ->assertJson([
                'message' => 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
            ]);

        // GET /api/orders/{order_code} -> 403
        $this->getJson("/api/orders/{$order->order_code}")
            ->assertStatus(403)
            ->assertJson([
                'message' => 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
            ]);

        // POST /api/orders/{order_code}/cancel -> 403
        $this->postJson("/api/orders/{$order->order_code}/cancel")
            ->assertStatus(403)
            ->assertJson([
                'message' => 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
            ]);
    }

    public function test_orders_list_is_isolated_between_users(): void
    {
        $userA = $this->createCustomer(['email' => 'user_a@example.com']);
        $userB = $this->createCustomer(['email' => 'user_b@example.com']);

        $orderA1 = $this->createOrder($userA, ['order_code' => 'MSUSERA10001']);
        $orderA2 = $this->createOrder($userA, ['order_code' => 'MSUSERA10002']);
        $orderB1 = $this->createOrder($userB, ['order_code' => 'MSUSERB10001']);

        Sanctum::actingAs($userA);

        $response = $this->getJson('/api/orders')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data');

        $codes = collect($response->json('data'))->pluck('order_code')->all();
        $this->assertContains('MSUSERA10001', $codes);
        $this->assertContains('MSUSERA10002', $codes);
        $this->assertNotContains('MSUSERB10001', $codes);
    }

    public function test_orders_list_has_full_pagination_structure_and_default_10(): void
    {
        $user = $this->createCustomer();

        for ($i = 1; $i <= 15; $i++) {
            $this->createOrder($user, ['order_code' => 'MSPAGINATE' . str_pad((string) $i, 4, '0', STR_PAD_LEFT)]);
        }

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/orders')
            ->assertStatus(200)
            ->assertJsonCount(10, 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'order_code',
                        'status',
                        'payment_method',
                        'payment_status',
                        'recipient_name',
                        'recipient_phone',
                        'shipping_address',
                        'subtotal',
                        'shipping_fee',
                        'total_amount',
                        'created_at',
                        'items',
                    ],
                ],
                'links' => ['first', 'last', 'prev', 'next'],
                'meta'  => [
                    'current_page',
                    'from',
                    'last_page',
                    'links',
                    'path',
                    'per_page',
                    'to',
                    'total',
                ],
            ]);

        $this->assertSame(1, $response->json('meta.current_page'));
        $this->assertSame(10, $response->json('meta.per_page'));
        $this->assertSame(15, $response->json('meta.total'));
        $this->assertSame(2, $response->json('meta.last_page'));
    }

    public function test_orders_list_rejects_per_page_greater_than_50_with_422(): void
    {
        $user = $this->createCustomer();
        Sanctum::actingAs($user);

        $this->getJson('/api/orders?per_page=51')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['per_page'])
            ->assertJsonFragment([
                'per_page' => ['Số lượng đơn hàng mỗi trang tối đa là 50.'],
            ]);
    }

    public function test_orders_list_can_filter_by_valid_status(): void
    {
        $user = $this->createCustomer();
        $this->createOrder($user, ['order_code' => 'MSPENDING0001', 'status' => OrderStatus::Pending]);
        $this->createOrder($user, ['order_code' => 'MSCONFIRMED01', 'status' => OrderStatus::Confirmed]);
        $this->createOrder($user, ['order_code' => 'MSCANCELLED01', 'status' => OrderStatus::Cancelled]);

        Sanctum::actingAs($user);

        // Lọc pending
        $pendingRes = $this->getJson('/api/orders?status=pending')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
        $this->assertSame('MSPENDING0001', $pendingRes->json('data.0.order_code'));

        // Lọc cancelled
        $cancelledRes = $this->getJson('/api/orders?status=cancelled')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
        $this->assertSame('MSCANCELLED01', $cancelledRes->json('data.0.order_code'));
    }

    public function test_orders_list_rejects_invalid_status_with_422(): void
    {
        $user = $this->createCustomer();
        Sanctum::actingAs($user);

        $this->getJson('/api/orders?status=invalid_status')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    public function test_show_own_order_returns_200_with_items_snapshot(): void
    {
        $user = $this->createCustomer();
        $order = $this->createOrder($user, ['order_code' => 'MSSHOW00000001']);

        [$v1, $v2] = $this->getActiveVariants(2, 50);
        $this->addOrderItem($order, $v1, 2, 200000);
        $this->addOrderItem($order, $v2, 1, 300000);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/orders/MSSHOW00000001')
            ->assertStatus(200)
            ->assertJsonStructure([
                'order' => [
                    'order_code',
                    'status',
                    'payment_method',
                    'payment_status',
                    'recipient_name',
                    'recipient_phone',
                    'shipping_address',
                    'subtotal',
                    'shipping_fee',
                    'total_amount',
                    'created_at',
                    'items' => [
                        '*' => [
                            'id',
                            'product_id',
                            'variant_id',
                            'product_name',
                            'sku',
                            'color_name',
                            'size_name',
                            'image_url',
                            'unit_price',
                            'quantity',
                            'line_total',
                        ],
                    ],
                ],
            ]);

        $this->assertSame('MSSHOW00000001', $response->json('order.order_code'));
        $this->assertCount(2, $response->json('order.items'));
    }

    public function test_show_other_users_order_or_nonexistent_returns_404_with_same_message(): void
    {
        $userA = $this->createCustomer(['email' => 'user_a_show@example.com']);
        $userB = $this->createCustomer(['email' => 'user_b_show@example.com']);
        $orderB = $this->createOrder($userB, ['order_code' => 'MSUSERBORDER01']);

        Sanctum::actingAs($userA);

        // Xem đơn của người khác -> 404
        $this->getJson("/api/orders/{$orderB->order_code}")
            ->assertStatus(404)
            ->assertJson([
                'message' => 'Đơn hàng không tồn tại.',
            ]);

        // Xem đơn không tồn tại -> 404 cùng message
        $this->getJson('/api/orders/MSNONEXISTENT99')
            ->assertStatus(404)
            ->assertJson([
                'message' => 'Đơn hàng không tồn tại.',
            ]);
    }

    public function test_cancel_pending_order_restores_stock_for_multiple_variants_and_sets_default_reason(): void
    {
        $user = $this->createCustomer();
        $order = $this->createOrder($user, ['order_code' => 'MSCANCELLABLE1']);

        [$v1, $v2] = $this->getActiveVariants(2, 20);
        $v1->update(['stock_quantity' => 10]);
        $v2->update(['stock_quantity' => 15]);

        $this->addOrderItem($order, $v1, 3, 100000);
        $this->addOrderItem($order, $v2, 5, 200000);

        Sanctum::actingAs($user);

        // Hủy không gửi reason
        $response = $this->postJson("/api/orders/{$order->order_code}/cancel", [])
            ->assertStatus(200)
            ->assertJson([
                'message' => 'Hủy đơn hàng thành công.',
                'order'   => [
                    'order_code'    => 'MSCANCELLABLE1',
                    'status'        => 'cancelled',
                    'cancel_reason' => 'Khách hàng tự hủy đơn',
                ],
            ]);

        $this->assertNotNull($response->json('order.cancelled_at'));

        // Kiểm tra database: status và cancel_reason
        $this->assertDatabaseHas('orders', [
            'id'            => $order->id,
            'status'        => OrderStatus::Cancelled->value,
            'cancel_reason' => 'Khách hàng tự hủy đơn',
        ]);

        // Kiểm tra tồn kho được cộng lại đầy đủ
        $this->assertSame(13, $v1->fresh()->stock_quantity); // 10 + 3
        $this->assertSame(20, $v2->fresh()->stock_quantity); // 15 + 5
    }

    public function test_cancel_order_with_custom_reason_saves_reason(): void
    {
        $user = $this->createCustomer();
        $order = $this->createOrder($user, ['order_code' => 'MSCUSTOMREASON']);

        Sanctum::actingAs($user);

        $customReason = 'Tôi muốn thay đổi địa chỉ nhận hàng và mua thêm sản phẩm.';
        $this->postJson("/api/orders/{$order->order_code}/cancel", [
            'reason' => $customReason,
        ])
            ->assertStatus(200)
            ->assertJson([
                'message' => 'Hủy đơn hàng thành công.',
                'order'   => [
                    'order_code'    => 'MSCUSTOMREASON',
                    'status'        => 'cancelled',
                    'cancel_reason' => $customReason,
                ],
            ]);

        $this->assertDatabaseHas('orders', [
            'id'            => $order->id,
            'status'        => OrderStatus::Cancelled->value,
            'cancel_reason' => $customReason,
        ]);
    }

    public function test_cancel_order_second_time_returns_422_and_does_not_increment_stock_again(): void
    {
        $user = $this->createCustomer();
        $order = $this->createOrder($user, ['order_code' => 'MSDOUBLECANCEL']);

        [$v1] = $this->getActiveVariants(1, 10);
        $this->addOrderItem($order, $v1, 2, 100000);

        Sanctum::actingAs($user);

        // Hủy lần 1 thành công: stock 10 -> 12
        $this->postJson("/api/orders/{$order->order_code}/cancel")
            ->assertStatus(200);
        $this->assertSame(12, $v1->fresh()->stock_quantity);

        // Hủy lần 2: phải bị từ chối 422 và KHÔNG được tăng tồn kho nữa
        $this->postJson("/api/orders/{$order->order_code}/cancel")
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Chỉ có thể hủy đơn hàng khi đơn đang ở trạng thái chờ xử lý (pending).',
            ]);

        $this->assertSame(12, $v1->fresh()->stock_quantity);
    }

    public function test_cancel_confirmed_order_returns_422_and_does_not_increment_stock(): void
    {
        $user = $this->createCustomer();
        $order = $this->createOrder($user, [
            'order_code' => 'MSCONFIRMED002',
            'status'     => OrderStatus::Confirmed,
        ]);

        [$v1] = $this->getActiveVariants(1, 10);
        $this->addOrderItem($order, $v1, 2, 100000);

        Sanctum::actingAs($user);

        $this->postJson("/api/orders/{$order->order_code}/cancel")
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Chỉ có thể hủy đơn hàng khi đơn đang ở trạng thái chờ xử lý (pending).',
            ]);

        $this->assertSame(10, $v1->fresh()->stock_quantity);
    }

    public function test_cancel_other_users_order_returns_404_and_does_not_modify_order(): void
    {
        $userA = $this->createCustomer(['email' => 'user_a_cancel@example.com']);
        $userB = $this->createCustomer(['email' => 'user_b_cancel@example.com']);

        $orderB = $this->createOrder($userB, ['order_code' => 'MSORDERUSERB01']);
        [$v1] = $this->getActiveVariants(1, 10);
        $this->addOrderItem($orderB, $v1, 3, 100000);

        Sanctum::actingAs($userA);

        // User A cố hủy đơn của User B -> 404
        $this->postJson("/api/orders/{$orderB->order_code}/cancel")
            ->assertStatus(404)
            ->assertJson([
                'message' => 'Đơn hàng không tồn tại.',
            ]);

        // Đơn của User B vẫn giữ nguyên pending và tồn kho không đổi
        $this->assertSame(OrderStatus::Pending, $orderB->fresh()->status);
        $this->assertSame(10, $v1->fresh()->stock_quantity);
    }
}
