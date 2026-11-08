<?php

namespace Tests\Feature\Api;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\ProductStatus;
use App\Enums\UserStatus;
use App\Models\CartItem;
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
use Tests\TestCase;

class OrderCheckoutTest extends TestCase
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
            'full_name' => 'Khách Hàng Checkout',
            'email'     => 'checkout_' . uniqid() . '@example.com',
            'phone'     => '0901234567',
            'password'  => Hash::make('Secret123!'),
            'role_id'   => $role->id,
            'status'    => UserStatus::Active,
        ], $attributes));
    }

    protected function validCheckoutPayload(array $overrides = []): array
    {
        return array_merge([
            'recipient_name'   => 'Nguyen Van A',
            'recipient_phone'  => '0912345678',
            'shipping_address' => 'Số 123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
            'note'             => 'Giao giờ hành chính',
            'payment_method'   => 'cod',
        ], $overrides);
    }

    protected function getActiveVariant(int $stock = 10): ProductVariant
    {
        $variant = ProductVariant::where('is_active', true)
            ->whereHas('product', fn($q) => $q->where('status', ProductStatus::Active)->whereNull('deleted_at'))
            ->firstOrFail();

        $variant->update(['stock_quantity' => $stock]);

        return $variant;
    }

    // =========================================================================
    // 1. XÁC THỰC & PHÂN QUYỀN (AUTHENTICATION & ACTIVE MIDDLEWARE)
    // =========================================================================

    public function test_unauthenticated_user_cannot_checkout(): void
    {
        $response = $this->postJson('/api/orders', $this->validCheckoutPayload());

        $response->assertStatus(401);
    }

    public function test_locked_user_cannot_checkout(): void
    {
        $lockedUser = $this->createCustomer(['status' => UserStatus::Locked]);

        $response = $this->actingAs($lockedUser, 'sanctum')
            ->postJson('/api/orders', $this->validCheckoutPayload());

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
            ]);
    }

    // =========================================================================
    // 2. RÀNG BUỘC DỮ LIỆU ĐẦU VÀO & GIỎ HÀNG (VALIDATION)
    // =========================================================================

    public function test_cannot_checkout_with_empty_cart(): void
    {
        $user = $this->createCustomer();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->validCheckoutPayload());

        $response->assertStatus(422)
            ->assertJson([
                'message' => 'Giỏ hàng của bạn đang trống.',
                'errors'  => [
                    'cart' => ['Giỏ hàng của bạn đang trống.'],
                ],
            ]);
    }

    public function test_validation_errors_for_missing_recipient_information(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant();
        CartItem::create(['user_id' => $user->id, 'variant_id' => $variant->id, 'quantity' => 1]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/orders', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['recipient_name', 'recipient_phone', 'shipping_address', 'payment_method']);
    }

    public function test_validation_error_for_invalid_phone_number(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant();
        CartItem::create(['user_id' => $user->id, 'variant_id' => $variant->id, 'quantity' => 1]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload([
            'recipient_phone' => '123456', // Sai định dạng
        ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['recipient_phone']);
    }

    public function test_payment_method_vnpay_is_rejected_with_clear_message_in_errors_payment_method(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant();
        CartItem::create(['user_id' => $user->id, 'variant_id' => $variant->id, 'quantity' => 1]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload([
            'payment_method' => 'vnpay',
        ]));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['payment_method'])
            ->assertJsonPath('errors.payment_method.0', 'Phương thức thanh toán VNPay hiện đang được phát triển. Vui lòng chọn thanh toán khi nhận hàng (COD).');
    }

    // =========================================================================
    // 3. ĐẶT HÀNG THÀNH CÔNG VỚI COD (HAPPY PATH & SNAPSHOT)
    // =========================================================================

    public function test_checkout_successfully_with_cod_and_decrements_stock(): void
    {
        $user = $this->createCustomer();
        $variant1 = $this->getActiveVariant(10);
        $variant2 = ProductVariant::where('id', '!=', $variant1->id)
            ->where('is_active', true)
            ->whereHas('product', fn($q) => $q->where('status', ProductStatus::Active))
            ->firstOrFail();
        $variant2->update(['stock_quantity' => 5]);

        CartItem::create(['user_id' => $user->id, 'variant_id' => $variant1->id, 'quantity' => 2]);
        CartItem::create(['user_id' => $user->id, 'variant_id' => $variant2->id, 'quantity' => 1]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->validCheckoutPayload());

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Đặt hàng thành công.',
                'order'   => [
                    'status'           => 'pending',
                    'payment_method'   => 'cod',
                    'payment_status'   => 'unpaid',
                    'recipient_name'   => 'Nguyen Van A',
                    'recipient_phone'  => '0912345678',
                    'shipping_address' => 'Số 123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
                ],
            ]);

        $orderCode = $response->json('order.order_code');
        $this->assertNotEmpty($orderCode);
        $this->assertStringStartsWith('MS', $orderCode);

        // Kiểm tra tồn kho giảm đúng
        $this->assertEquals(8, $variant1->fresh()->stock_quantity);
        $this->assertEquals(4, $variant2->fresh()->stock_quantity);

        // Kiểm tra giỏ hàng bị xóa hoàn toàn
        $this->assertDatabaseMissing('cart_items', ['user_id' => $user->id]);

        // Kiểm tra bản ghi orders và order_items
        $this->assertDatabaseHas('orders', [
            'order_code' => $orderCode,
            'user_id'    => $user->id,
            'status'     => 'pending',
        ]);
        $this->assertDatabaseCount('order_items', 2);
    }

    public function test_order_snapshot_captures_correct_details(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant(10);
        $product = $variant->product;
        $unitPrice = (int) $product->base_price;

        CartItem::create(['user_id' => $user->id, 'variant_id' => $variant->id, 'quantity' => 2]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->validCheckoutPayload());

        $response->assertStatus(201);

        $orderId = Order::where('order_code', $response->json('order.order_code'))->value('id');

        $this->assertDatabaseHas('order_items', [
            'order_id'     => $orderId,
            'product_id'   => $product->id,
            'variant_id'   => $variant->id,
            'product_name' => $product->name,
            'sku'          => $variant->sku,
            'color_name'   => $variant->color->name,
            'size_name'    => $variant->size->name,
            'unit_price'   => $unitPrice,
            'quantity'     => 2,
            'line_total'   => $unitPrice * 2,
        ]);
    }

    public function test_order_uses_latest_product_price_at_checkout_time(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant(10);
        $product = $variant->product;

        // Cho vào giỏ khi giá là 1.000.000
        $product->update(['base_price' => 1000000]);
        CartItem::create(['user_id' => $user->id, 'variant_id' => $variant->id, 'quantity' => 1]);

        // Sau đó giá sản phẩm đổi sang 1.250.000 trước khi checkout
        $product->update(['base_price' => 1250000]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->validCheckoutPayload());

        $response->assertStatus(201)
            ->assertJsonPath('order.subtotal', 1250000)
            ->assertJsonPath('order.items.0.unit_price', 1250000);
    }

    public function test_shipping_fee_is_zero_when_subtotal_reaches_two_million(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant(10);
        $product = $variant->product;

        // Subtotal = 2.500.000 đ >= 2.000.000 đ
        $product->update(['base_price' => 2500000]);
        CartItem::create(['user_id' => $user->id, 'variant_id' => $variant->id, 'quantity' => 1]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->validCheckoutPayload());

        $response->assertStatus(201)
            ->assertJsonPath('order.subtotal', 2500000)
            ->assertJsonPath('order.shipping_fee', 0)
            ->assertJsonPath('order.total_amount', 2500000);
    }

    public function test_shipping_fee_is_standard_fee_when_subtotal_below_two_million(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant(10);
        $product = $variant->product;

        // Subtotal = 500.000 đ < 2.000.000 đ
        $product->update(['base_price' => 500000]);
        CartItem::create(['user_id' => $user->id, 'variant_id' => $variant->id, 'quantity' => 1]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->validCheckoutPayload());

        $response->assertStatus(201)
            ->assertJsonPath('order.subtotal', 500000)
            ->assertJsonPath('order.shipping_fee', 30000)
            ->assertJsonPath('order.total_amount', 530000);
    }

    // =========================================================================
    // 4. KIỂM SOÁT THIẾU TỒN & ROLLBACK TOÀN BỘ GIAO DỊCH
    // =========================================================================

    public function test_checkout_fails_and_rollbacks_when_single_item_has_insufficient_stock(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant(2); // Kho còn 2

        // Giỏ hàng muốn đặt 3
        CartItem::create(['user_id' => $user->id, 'variant_id' => $variant->id, 'quantity' => 3]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->validCheckoutPayload());

        $response->assertStatus(422)
            ->assertJson([
                'message'            => 'Một số sản phẩm trong giỏ hàng không đủ số lượng hoặc không còn khả dụng.',
                'insufficient_items' => [
                    [
                        'variant_id'         => $variant->id,
                        'requested_quantity' => 3,
                        'available_stock'    => 2,
                    ],
                ],
            ]);

        // Rollback: Tồn kho giữ nguyên 2
        $this->assertEquals(2, $variant->fresh()->stock_quantity);

        // Giỏ hàng vẫn còn nguyên
        $this->assertDatabaseHas('cart_items', [
            'user_id'    => $user->id,
            'variant_id' => $variant->id,
            'quantity'   => 3,
        ]);

        // Không tạo đơn hàng mồ côi
        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('order_items', 0);
    }

    public function test_rollback_multiple_lines_when_one_line_has_insufficient_stock(): void
    {
        $user = $this->createCustomer();
        $variant1 = $this->getActiveVariant(10); // Dòng 1: Đủ (kho 10, đặt 2)
        $variant2 = ProductVariant::where('id', '!=', $variant1->id)
            ->where('is_active', true)
            ->whereHas('product', fn($q) => $q->where('status', ProductStatus::Active))
            ->firstOrFail();
        $variant2->update(['stock_quantity' => 1]); // Dòng 2: Thiếu (kho 1, đặt 3)

        CartItem::create(['user_id' => $user->id, 'variant_id' => $variant1->id, 'quantity' => 2]);
        CartItem::create(['user_id' => $user->id, 'variant_id' => $variant2->id, 'quantity' => 3]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->validCheckoutPayload());

        $response->assertStatus(422)
            ->assertJsonPath('insufficient_items.0.variant_id', $variant2->id);

        // Tồn kho CẢ HAI biến thể giữ nguyên
        $this->assertEquals(10, $variant1->fresh()->stock_quantity);
        $this->assertEquals(1, $variant2->fresh()->stock_quantity);

        // Giỏ hàng giữ nguyên cả 2 dòng
        $this->assertDatabaseCount('cart_items', 2);

        // Không có đơn hàng nào được tạo
        $this->assertDatabaseCount('orders', 0);
        $this->assertDatabaseCount('order_items', 0);
    }

    public function test_checkout_fails_when_product_in_cart_is_soft_deleted_or_draft(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant(5);

        CartItem::create(['user_id' => $user->id, 'variant_id' => $variant->id, 'quantity' => 1]);

        // Sản phẩm bị xóa mềm
        $variant->product->delete();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->validCheckoutPayload());

        $response->assertStatus(422)
            ->assertJsonPath('insufficient_items.0.variant_id', $variant->id);

        $this->assertDatabaseCount('orders', 0);
    }

    // =========================================================================
    // 5. CHỐNG DOUBLE SUBMIT & CHỐNG BÁN VƯỢT TỒN (RACE CONDITION SIMULATION)
    // =========================================================================

    public function test_consecutive_checkouts_by_same_user_prevents_duplicate_orders(): void
    {
        $user = $this->createCustomer();
        $variant = $this->getActiveVariant(10);
        CartItem::create(['user_id' => $user->id, 'variant_id' => $variant->id, 'quantity' => 2]);

        // Request 1: Đặt hàng thành công
        $res1 = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->validCheckoutPayload());
        $res1->assertStatus(201);

        // Request 2 (bấm đúp hoặc gửi liên tiếp): Bị từ chối vì giỏ đã trống
        $res2 = $this->actingAs($user, 'sanctum')
            ->postJson('/api/orders', $this->validCheckoutPayload());
        $res2->assertStatus(422)
            ->assertJson([
                'message' => 'Giỏ hàng của bạn đang trống.',
            ]);

        // Chỉ đúng 1 đơn hàng được tạo, tồn kho giảm 2
        $this->assertDatabaseCount('orders', 1);
        $this->assertEquals(8, $variant->fresh()->stock_quantity);
    }

    public function test_concurrent_checkout_competition_simulation(): void
    {
        $userA = $this->createCustomer();
        $userB = $this->createCustomer();

        // Biến thể chỉ còn đúng 1 sản phẩm
        $variant = $this->getActiveVariant(1);

        // Cả 2 người dùng đều có 1 sản phẩm này trong giỏ hàng
        CartItem::create(['user_id' => $userA->id, 'variant_id' => $variant->id, 'quantity' => 1]);
        CartItem::create(['user_id' => $userB->id, 'variant_id' => $variant->id, 'quantity' => 1]);

        // User A đặt hàng trước -> Thành công 201
        $resA = $this->actingAs($userA, 'sanctum')
            ->postJson('/api/orders', $this->validCheckoutPayload());
        $resA->assertStatus(201);

        // User B gửi checkout ngay sau đó -> Bị từ chối 422 vì tồn kho đã về 0
        $resB = $this->actingAs($userB, 'sanctum')
            ->postJson('/api/orders', $this->validCheckoutPayload());
        $resB->assertStatus(422)
            ->assertJson([
                'message'            => 'Một số sản phẩm trong giỏ hàng không đủ số lượng hoặc không còn khả dụng.',
                'insufficient_items' => [
                    [
                        'variant_id'         => $variant->id,
                        'requested_quantity' => 1,
                        'available_stock'    => 0,
                    ],
                ],
            ]);

        // Khẳng định: Chỉ đúng 1 đơn hàng được tạo trong toàn bộ hệ thống
        $this->assertDatabaseCount('orders', 1);
        $this->assertEquals(0, $variant->fresh()->stock_quantity);

        // Giỏ của User A bị xóa, giỏ của User B vẫn còn nguyên
        $this->assertDatabaseMissing('cart_items', ['user_id' => $userA->id]);
        $this->assertDatabaseHas('cart_items', ['user_id' => $userB->id, 'variant_id' => $variant->id]);
    }
}
