<?php

namespace Tests\Feature\Api;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\ProductStatus;
use App\Enums\UserStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
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

class AdminOrderManagementTest extends TestCase
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

    /*
    |--------------------------------------------------------------------------
    | PHÂN QUYỀN & XÁC THỰC
    |--------------------------------------------------------------------------
    */

    public function test_unauthenticated_request_to_admin_orders_returns_401(): void
    {
        $this->getJson('/api/admin/orders')->assertStatus(401);
        $this->getJson('/api/admin/orders/MS123456')->assertStatus(401);
        $this->patchJson('/api/admin/orders/MS123456/status', ['status' => 'confirmed'])->assertStatus(401);
    }

    public function test_customer_role_accessing_admin_orders_returns_403_vietnamese(): void
    {
        $customer = $this->createCustomer();
        Sanctum::actingAs($customer);

        $this->getJson('/api/admin/orders')
            ->assertStatus(403)
            ->assertJson([
                'message' => 'Bạn không có quyền thực hiện thao tác này.',
            ]);

        $this->getJson('/api/admin/orders/MS123456')
            ->assertStatus(403)
            ->assertJson([
                'message' => 'Bạn không có quyền thực hiện thao tác này.',
            ]);

        $this->patchJson('/api/admin/orders/MS123456/status', ['status' => 'confirmed'])
            ->assertStatus(403)
            ->assertJson([
                'message' => 'Bạn không có quyền thực hiện thao tác này.',
            ]);
    }

    public function test_locked_admin_or_operator_returns_403_vietnamese(): void
    {
        $lockedAdmin = $this->createAdmin(['status' => UserStatus::Locked]);
        Sanctum::actingAs($lockedAdmin);

        $this->getJson('/api/admin/orders')
            ->assertStatus(403)
            ->assertJson([
                'message' => 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
            ]);
    }

    public function test_admin_and_operator_can_access_admin_orders_endpoints(): void
    {
        $admin = $this->createAdmin();
        $operator = $this->createOperator();

        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/orders')->assertStatus(200);

        Sanctum::actingAs($operator);
        $this->getJson('/api/admin/orders')->assertStatus(200);
    }

    /*
    |--------------------------------------------------------------------------
    | DANH SÁCH ĐƠN HÀNG (GET /api/admin/orders)
    |--------------------------------------------------------------------------
    */

    public function test_admin_orders_list_structure_pagination_and_customer_info(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer(['full_name' => 'Khách VIP', 'email' => 'vip@example.com']);
        $order = $this->createOrder($customer, ['order_code' => 'MSADMINLIST01']);

        [$v1] = $this->getActiveVariants(1);
        $this->addOrderItem($order, $v1, 2, 200000);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/orders')
            ->assertStatus(200)
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
                        'discount_amount',
                        'total_amount',
                        'items_count',
                        'created_at',
                        'customer' => [
                            'id',
                            'full_name',
                            'email',
                            'phone',
                        ],
                    ],
                ],
                'links' => ['first', 'last', 'prev', 'next'],
                'meta'  => ['current_page', 'last_page', 'per_page', 'total'],
            ]);

        $first = $response->json('data.0');
        $this->assertSame('MSADMINLIST01', $first['order_code']);
        $this->assertSame(1, $first['items_count']);
        $this->assertSame('Khách VIP', $first['customer']['full_name']);
        $this->assertSame('vip@example.com', $first['customer']['email']);
    }

    public function test_admin_orders_list_filters_by_status_and_payment_status(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();

        $this->createOrder($customer, [
            'order_code'     => 'MSPENDING01',
            'status'         => OrderStatus::Pending,
            'payment_status' => PaymentStatus::Unpaid,
        ]);
        $this->createOrder($customer, [
            'order_code'     => 'MSCONFIRMED01',
            'status'         => OrderStatus::Confirmed,
            'payment_status' => PaymentStatus::Paid,
        ]);

        Sanctum::actingAs($admin);

        // Lọc status=pending
        $resPending = $this->getJson('/api/admin/orders?status=pending')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
        $this->assertSame('MSPENDING01', $resPending->json('data.0.order_code'));

        // Lọc payment_status=paid
        $resPaid = $this->getJson('/api/admin/orders?payment_status=paid')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
        $this->assertSame('MSCONFIRMED01', $resPaid->json('data.0.order_code'));
    }

    public function test_admin_orders_list_filters_by_date_range_from_to(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();

        $orderPast = $this->createOrder($customer, ['order_code' => 'MSPAST0001']);
        $orderPast->created_at = now()->subDays(10);
        $orderPast->save();

        $orderToday = $this->createOrder($customer, ['order_code' => 'MSTODAY001']);
        $orderToday->created_at = now();
        $orderToday->save();

        Sanctum::actingAs($admin);

        $todayStr = now()->format('Y-m-d');
        $res = $this->getJson("/api/admin/orders?from={$todayStr}&to={$todayStr}")
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');

        $this->assertSame('MSTODAY001', $res->json('data.0.order_code'));
    }

    public function test_admin_orders_list_rejects_invalid_date_range_with_422(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/orders?from=2026-11-10&to=2026-11-05')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['to'])
            ->assertJsonFragment([
                'to' => ['Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.'],
            ]);
    }

    public function test_admin_orders_list_searches_by_code_name_phone_and_escapes_wildcards(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();

        $this->createOrder($customer, [
            'order_code'      => 'MS_SPECIAL%01',
            'recipient_name'  => 'Le_Thi%B',
            'recipient_phone' => '0988776655',
        ]);
        $this->createOrder($customer, [
            'order_code'      => 'MSXSPECIALY01',
            'recipient_name'  => 'LeXThiYB',
            'recipient_phone' => '0911223344',
        ]);

        Sanctum::actingAs($admin);

        // Tìm kiếm chính xác ký tự đặc biệt % và _
        $res = $this->getJson('/api/admin/orders?search=_SPECIAL%')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
        $this->assertSame('MS_SPECIAL%01', $res->json('data.0.order_code'));

        // Tìm theo số điện thoại
        $resPhone = $this->getJson('/api/admin/orders?search=0988776655')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
        $this->assertSame('MS_SPECIAL%01', $resPhone->json('data.0.order_code'));
    }

    public function test_admin_orders_list_rejects_per_page_greater_than_50_with_422(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/orders?per_page=51')
            ->assertStatus(422)
            ->assertJsonValidationErrors(['per_page'])
            ->assertJsonFragment([
                'per_page' => ['Số lượng đơn hàng mỗi trang tối đa là 50.'],
            ]);
    }

    /*
    |--------------------------------------------------------------------------
    | CHI TIẾT ĐƠN HÀNG (GET /api/admin/orders/{order_code})
    |--------------------------------------------------------------------------
    */

    public function test_admin_view_order_detail_returns_full_info_items_and_histories(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $order = $this->createOrder($customer, ['order_code' => 'MSDETAIL0001']);

        [$v1] = $this->getActiveVariants(1);
        $this->addOrderItem($order, $v1, 2, 200000);

        OrderStatusHistory::create([
            'order_id'    => $order->id,
            'from_status' => null,
            'to_status'   => OrderStatus::Pending->value,
            'changed_by'  => $customer->id,
            'reason'      => 'Khách hàng tạo đơn',
            'created_at'  => now(),
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/orders/MSDETAIL0001')
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
                    'note',
                    'subtotal',
                    'shipping_fee',
                    'discount_amount',
                    'total_amount',
                    'cancel_reason',
                    'cancelled_at',
                    'paid_at',
                    'items_count',
                    'created_at',
                    'customer' => ['id', 'full_name', 'email', 'phone'],
                    'items'    => [
                        '*' => ['id', 'product_id', 'variant_id', 'product_name', 'sku', 'color_name', 'size_name', 'unit_price', 'quantity', 'line_total'],
                    ],
                    'status_histories' => [
                        '*' => [
                            'id',
                            'from_status',
                            'to_status',
                            'reason',
                            'created_at',
                            'changed_by' => ['id', 'full_name', 'email', 'role'],
                        ],
                    ],
                ],
            ]);

        $this->assertSame('MSDETAIL0001', $response->json('order.order_code'));
        $this->assertCount(1, $response->json('order.items'));
        $this->assertCount(1, $response->json('order.status_histories'));
        $this->assertSame($customer->id, $response->json('order.status_histories.0.changed_by.id'));
    }

    public function test_order_detail_accepts_empty_status_histories_for_legacy_orders(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $order = $this->createOrder($customer, ['order_code' => 'MSLEGACY0001']);

        Sanctum::actingAs($admin);

        $response = $this->getJson("/api/admin/orders/{$order->order_code}")
            ->assertStatus(200);

        $this->assertSame([], $response->json('order.status_histories'));
    }

    public function test_admin_view_nonexistent_order_returns_404(): void
    {
        $admin = $this->createAdmin();
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/orders/MSNONEXISTENT99')
            ->assertStatus(404)
            ->assertJson([
                'message' => 'Đơn hàng không tồn tại.',
            ]);
    }

    /*
    |--------------------------------------------------------------------------
    | CHUYỂN TRẠNG THÁI HỢP LỆ (PATCH /api/admin/orders/{order_code}/status)
    |--------------------------------------------------------------------------
    */

    public function test_admin_transition_pending_to_confirmed_creates_history(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $order = $this->createOrder($customer, ['status' => OrderStatus::Pending]);

        Sanctum::actingAs($admin);

        $response = $this->patchJson("/api/admin/orders/{$order->order_code}/status", [
            'status' => 'confirmed',
            'reason' => 'Đã gọi điện xác nhận với khách hàng',
        ])
            ->assertStatus(200)
            ->assertJson([
                'message' => 'Cập nhật trạng thái đơn hàng thành công.',
                'order'   => [
                    'order_code' => $order->order_code,
                    'status'     => 'confirmed',
                ],
            ]);

        $this->assertDatabaseHas('orders', [
            'id'     => $order->id,
            'status' => OrderStatus::Confirmed->value,
        ]);

        $this->assertDatabaseHas('order_status_histories', [
            'order_id'    => $order->id,
            'from_status' => OrderStatus::Pending->value,
            'to_status'   => OrderStatus::Confirmed->value,
            'changed_by'  => $admin->id,
            'reason'      => 'Đã gọi điện xác nhận với khách hàng',
        ]);
    }

    public function test_admin_transition_confirmed_to_shipping_creates_history(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $order = $this->createOrder($customer, ['status' => OrderStatus::Confirmed]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/orders/{$order->order_code}/status", [
            'status' => 'shipping',
        ])
            ->assertStatus(200)
            ->assertJson([
                'order' => [
                    'status' => 'shipping',
                ],
            ]);

        $this->assertDatabaseHas('orders', [
            'id'     => $order->id,
            'status' => OrderStatus::Shipping->value,
        ]);

        $this->assertDatabaseHas('order_status_histories', [
            'order_id'    => $order->id,
            'from_status' => OrderStatus::Confirmed->value,
            'to_status'   => OrderStatus::Shipping->value,
            'changed_by'  => $admin->id,
        ]);
    }

    public function test_admin_transition_shipping_to_delivered_updates_cod_payment_status_and_paid_at(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $order = $this->createOrder($customer, [
            'status'         => OrderStatus::Shipping,
            'payment_method' => PaymentMethod::Cod,
            'payment_status' => PaymentStatus::Unpaid,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->patchJson("/api/admin/orders/{$order->order_code}/status", [
            'status' => 'delivered',
        ])
            ->assertStatus(200)
            ->assertJson([
                'order' => [
                    'status'         => 'delivered',
                    'payment_status' => 'paid',
                ],
            ]);

        $this->assertNotNull($response->json('order.paid_at'));

        $this->assertDatabaseHas('orders', [
            'id'             => $order->id,
            'status'         => OrderStatus::Delivered->value,
            'payment_status' => PaymentStatus::Paid->value,
        ]);

        $this->assertNotNull($order->fresh()->paid_at);
    }

    public function test_admin_cancel_pending_order_restores_inventory_and_requires_reason(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $order = $this->createOrder($customer, ['status' => OrderStatus::Pending]);

        [$v1, $v2] = $this->getActiveVariants(2, 20);
        $v1->update(['stock_quantity' => 10]);
        $v2->update(['stock_quantity' => 15]);

        $this->addOrderItem($order, $v1, 3, 100000);
        $this->addOrderItem($order, $v2, 5, 200000);

        Sanctum::actingAs($admin);

        // Không gửi lý do -> 422
        $this->patchJson("/api/admin/orders/{$order->order_code}/status", [
            'status' => 'cancelled',
            'reason' => '',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['reason'])
            ->assertJsonFragment([
                'reason' => ['Lý do hủy đơn hàng là bắt buộc khi quản trị viên hủy đơn.'],
            ]);

        // Gửi có lý do -> 200 và hoàn tồn kho đúng
        $response = $this->patchJson("/api/admin/orders/{$order->order_code}/status", [
            'status' => 'cancelled',
            'reason' => 'Sản phẩm lỗi khi kiểm tra chất lượng',
        ])
            ->assertStatus(200)
            ->assertJson([
                'order' => [
                    'status'        => 'cancelled',
                    'cancel_reason' => 'Sản phẩm lỗi khi kiểm tra chất lượng',
                ],
            ]);

        $this->assertNotNull($response->json('order.cancelled_at'));

        // Kiểm tra tồn kho được hoàn
        $this->assertSame(13, $v1->fresh()->stock_quantity); // 10 + 3
        $this->assertSame(20, $v2->fresh()->stock_quantity); // 15 + 5

        // Kiểm tra lịch sử
        $this->assertDatabaseHas('order_status_histories', [
            'order_id'    => $order->id,
            'from_status' => OrderStatus::Pending->value,
            'to_status'   => OrderStatus::Cancelled->value,
            'changed_by'  => $admin->id,
            'reason'      => 'Sản phẩm lỗi khi kiểm tra chất lượng',
        ]);
    }

    public function test_admin_cancel_confirmed_order_restores_inventory(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $order = $this->createOrder($customer, ['status' => OrderStatus::Confirmed]);

        [$v1] = $this->getActiveVariants(1, 10);
        $v1->update(['stock_quantity' => 5]);
        $this->addOrderItem($order, $v1, 4, 150000);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/orders/{$order->order_code}/status", [
            'status' => 'cancelled',
            'reason' => 'Khách hàng liên hệ qua hotline yêu cầu hủy',
        ])
            ->assertStatus(200);

        $this->assertSame(9, $v1->fresh()->stock_quantity); // 5 + 4
        $this->assertSame(OrderStatus::Cancelled, $order->fresh()->status);
    }

    /*
    |--------------------------------------------------------------------------
    | CHUYỂN TRẠNG THÁI KHÔNG HỢP LỆ (MÁY TRẠNG THÁI & TRẠNG THÁI CUỐI)
    |--------------------------------------------------------------------------
    */

    public function test_admin_transition_invalid_jump_or_backward_returns_422(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();

        // Nhảy bước: pending -> shipping
        $order1 = $this->createOrder($customer, ['status' => OrderStatus::Pending]);
        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/orders/{$order1->order_code}/status", ['status' => 'shipping'])
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Không thể chuyển trạng thái từ pending sang shipping.',
            ]);

        // Nhảy bước: pending -> delivered
        $this->patchJson("/api/admin/orders/{$order1->order_code}/status", ['status' => 'delivered'])
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Không thể chuyển trạng thái từ pending sang delivered.',
            ]);

        // Đi lùi: shipping -> confirmed
        $order2 = $this->createOrder($customer, ['status' => OrderStatus::Shipping]);
        $this->patchJson("/api/admin/orders/{$order2->order_code}/status", ['status' => 'confirmed'])
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Không thể chuyển trạng thái từ shipping sang confirmed.',
            ]);

        // Đi lùi: shipping -> cancelled
        $this->patchJson("/api/admin/orders/{$order2->order_code}/status", ['status' => 'cancelled', 'reason' => 'Hủy khi đang giao'])
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Không thể chuyển trạng thái từ shipping sang cancelled.',
            ]);
    }

    public function test_admin_transition_from_terminal_states_delivered_or_cancelled_returns_422(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();

        // Từ delivered
        $orderDelivered = $this->createOrder($customer, ['status' => OrderStatus::Delivered]);
        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/orders/{$orderDelivered->order_code}/status", ['status' => 'cancelled', 'reason' => 'Hủy'])
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Không thể thay đổi trạng thái của đơn hàng đã delivered.',
            ]);

        // Từ cancelled
        $orderCancelled = $this->createOrder($customer, ['status' => OrderStatus::Cancelled]);
        $this->patchJson("/api/admin/orders/{$orderCancelled->order_code}/status", ['status' => 'confirmed'])
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Không thể thay đổi trạng thái của đơn hàng đã cancelled.',
            ]);
    }

    public function test_admin_transition_same_status_returns_422(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $order = $this->createOrder($customer, ['status' => OrderStatus::Confirmed]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/orders/{$order->order_code}/status", [
            'status' => 'confirmed',
        ])
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Đơn hàng hiện đã ở trạng thái confirmed. Không thể chuyển sang cùng trạng thái.',
            ]);
    }

    /*
    |--------------------------------------------------------------------------
    | ĐIỀU KIỆN 3: KIỂM SOÁT THỨ TỰ THAO TÁC & KIỂM TRA TRẠNG THÁI SAU KHÓA
    |--------------------------------------------------------------------------
    */

    /**
     * Kiểm tra trình tự: Khách hủy đơn trước -> Admin sau đó xác nhận đơn.
     * Chứng minh: Sau khi khóa dòng đơn hàng, admin phát hiện trạng thái đã là cancelled
     * nên từ chối 422 và không làm ảnh hưởng đến dữ liệu đã hủy.
     */
    public function test_sequential_customer_cancels_then_admin_confirms_fails_due_to_status_check_after_lock(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $order = $this->createOrder($customer, ['status' => OrderStatus::Pending]);

        [$v1] = $this->getActiveVariants(1, 10);
        $v1->update(['stock_quantity' => 5]);
        $this->addOrderItem($order, $v1, 2, 100000);

        // 1. Khách hàng thực hiện hủy trước
        Sanctum::actingAs($customer);
        $this->postJson("/api/orders/{$order->order_code}/cancel")
            ->assertStatus(200);

        // Tồn kho đã hoàn: 5 + 2 = 7
        $this->assertSame(7, $v1->fresh()->stock_quantity);
        $this->assertSame(OrderStatus::Cancelled, $order->fresh()->status);

        // 2. Admin cố tình gọi xác nhận đơn này
        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/orders/{$order->order_code}/status", ['status' => 'confirmed'])
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Không thể thay đổi trạng thái của đơn hàng đã cancelled.',
            ]);

        // Đơn vẫn giữ nguyên trạng thái cancelled và tồn kho không đổi
        $this->assertSame(7, $v1->fresh()->stock_quantity);
        $this->assertSame(OrderStatus::Cancelled, $order->fresh()->status);
    }

    /**
     * Kiểm tra trình tự: Admin xác nhận đơn trước -> Khách hàng sau đó cố hủy đơn.
     * Chứng minh: Sau khi khóa dòng đơn hàng, khách phát hiện trạng thái đã là confirmed
     * (không còn pending) nên từ chối 422 và không hoàn lại tồn kho.
     */
    public function test_sequential_admin_confirms_then_customer_cancels_fails_due_to_status_check_after_lock(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $order = $this->createOrder($customer, ['status' => OrderStatus::Pending]);

        [$v1] = $this->getActiveVariants(1, 10);
        $v1->update(['stock_quantity' => 5]);
        $this->addOrderItem($order, $v1, 2, 100000);

        // 1. Admin duyệt đơn trước
        Sanctum::actingAs($admin);
        $this->patchJson("/api/admin/orders/{$order->order_code}/status", ['status' => 'confirmed'])
            ->assertStatus(200);

        $this->assertSame(OrderStatus::Confirmed, $order->fresh()->status);

        // 2. Khách hàng sau đó gọi hủy đơn
        Sanctum::actingAs($customer);
        $this->postJson("/api/orders/{$order->order_code}/cancel")
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Chỉ có thể hủy đơn hàng khi đơn đang ở trạng thái chờ xử lý (pending).',
            ]);

        // Tồn kho không bị hoàn tăng: vẫn giữ nguyên 5
        $this->assertSame(5, $v1->fresh()->stock_quantity);
        $this->assertSame(OrderStatus::Confirmed, $order->fresh()->status);
    }

    /**
     * Kiểm tra: Không hoàn kho hai lần khi gọi hủy hai lần liên tiếp
     */
    public function test_no_double_inventory_restoration_when_cancelled_twice(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $order = $this->createOrder($customer, ['status' => OrderStatus::Pending]);

        [$v1] = $this->getActiveVariants(1, 10);
        $v1->update(['stock_quantity' => 10]);
        $this->addOrderItem($order, $v1, 3, 100000);

        Sanctum::actingAs($admin);

        // Lần hủy 1: thành công, kho tăng 10 -> 13
        $this->patchJson("/api/admin/orders/{$order->order_code}/status", [
            'status' => 'cancelled',
            'reason' => 'Lần hủy 1',
        ])
            ->assertStatus(200);

        $this->assertSame(13, $v1->fresh()->stock_quantity);

        // Lần hủy 2: bị từ chối 422 và KHÔNG tăng tồn kho thêm
        $this->patchJson("/api/admin/orders/{$order->order_code}/status", [
            'status' => 'cancelled',
            'reason' => 'Lần hủy 2',
        ])
            ->assertStatus(422);

        $this->assertSame(13, $v1->fresh()->stock_quantity);
    }
}
