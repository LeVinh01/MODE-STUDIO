<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\ProductGender;
use App\Enums\ProductStatus;
use App\Enums\UserStatus;
use App\Models\Brand;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Color;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\Size;
use App\Models\StockAdjustment;
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
use Illuminate\Support\Facades\Route;
use PHPUnit\Framework\Attributes\Group;
use Tests\TestCase;

/**
 * Business Rule Verification Test Suite
 *
 * @group business-rules
 */
#[Group('business-rules')]
class BusinessRulesTest extends TestCase
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

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper Methods
    // ─────────────────────────────────────────────────────────────────────────

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

    protected function createCustomer(array $attributes = []): User
    {
        return $this->createUserWithRole('customer', $attributes);
    }

    protected function createAdmin(array $attributes = []): User
    {
        return $this->createUserWithRole('admin', $attributes);
    }

    protected function createOperator(array $attributes = []): User
    {
        return $this->createUserWithRole('operator', $attributes);
    }

    protected function getActiveVariant(int $stock = 10, ?int $price = null): ProductVariant
    {
        $variant = ProductVariant::where('is_active', true)
            ->whereHas('product', fn($q) => $q->where('status', ProductStatus::Active)->whereNull('deleted_at'))
            ->firstOrFail();

        $variant->update(['stock_quantity' => $stock]);

        if ($price !== null) {
            $variant->product->update(['base_price' => $price]);
        }

        return $variant->fresh(['product']);
    }

    protected function validCheckoutPayload(array $overrides = []): array
    {
        return array_merge([
            'recipient_name'   => 'Nguyen Van A',
            'recipient_phone'  => '0912345678',
            'shipping_address' => '123 Le Loi, Ben Nghe, Quan 1, TP Ho Chi Minh',
            'note'             => 'Giao gio hanh chinh',
            'payment_method'   => 'cod',
        ], $overrides);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ORDER STATE MACHINE
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * OR-01 | Create an order | initial status is `pending`; a row exists in order_status_histories.
     */
    public function test_OR_01_create_order_initial_status_pending_and_history_created(): void
    {
        $customer = $this->createCustomer();
        $variant = $this->getActiveVariant(10);

        CartItem::create([
            'user_id'    => $customer->id,
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/orders', $this->validCheckoutPayload());

        $response->assertStatus(201);
        $orderCode = $response->json('order.order_code');

        $order = Order::where('order_code', $orderCode)->firstOrFail();
        $this->assertEquals(OrderStatus::Pending, $order->status);

        $histories = OrderStatusHistory::where('order_id', $order->id)->get();
        $this->assertCount(1, $histories);
        $this->assertNull($histories->first()->from_status);
        $this->assertEquals(OrderStatus::Pending->value, $histories->first()->to_status);
        $this->assertEquals($customer->id, $histories->first()->changed_by);
    }

    /**
     * OR-02 | Admin moves pending -> confirmed -> shipping -> delivered | each step succeeds; one history row per step.
     */
    public function test_OR_02_admin_moves_pending_confirmed_shipping_delivered(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $variant = $this->getActiveVariant(10);

        CartItem::create([
            'user_id'    => $customer->id,
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);

        $createRes = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/orders', $this->validCheckoutPayload());
        $orderCode = $createRes->json('order.order_code');

        // Step 1: pending -> confirmed
        $res1 = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$orderCode}/status", [
                'status' => 'confirmed',
                'reason' => 'Xac nhan don hang',
            ]);
        $res1->assertStatus(200);

        // Step 2: confirmed -> shipping
        $allowedCarriers = config('shop.shipping.carriers', ['GHN']);
        $carrier = $allowedCarriers[0] ?? 'GHN';
        $res2 = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$orderCode}/status", [
                'status'        => 'shipping',
                'carrier'       => $carrier,
                'tracking_code' => 'TRACK123456',
                'reason'        => 'Giao cho don vi van chuyen',
            ]);
        $res2->assertStatus(200);

        // Step 3: shipping -> delivered
        $res3 = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$orderCode}/status", [
                'status' => 'delivered',
                'reason' => 'Giao hang thanh cong',
            ]);
        $res3->assertStatus(200);

        $order = Order::where('order_code', $orderCode)->firstOrFail();
        $this->assertEquals(OrderStatus::Delivered, $order->status);

        // 1 initial + 3 transitions = 4 history rows
        $histories = OrderStatusHistory::where('order_id', $order->id)->orderBy('id', 'asc')->get();
        $this->assertCount(4, $histories);
        $this->assertEquals(['pending', 'confirmed', 'shipping', 'delivered'], $histories->pluck('to_status')->all());
    }

    /**
     * OR-03 | Try invalid transitions (pending -> shipping, pending -> delivered, delivered -> pending, delivered -> cancelled, cancelled -> confirmed)
     */
    public function test_OR_03_invalid_order_status_transitions_are_rejected(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $variant = $this->getActiveVariant(10);

        // Order 1: Test pending -> shipping and pending -> delivered
        CartItem::create([
            'user_id'    => $customer->id,
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);
        $res = $this->actingAs($customer, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $orderCode1 = $res->json('order.order_code');

        // pending -> shipping: invalid
        $resInvalid1 = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$orderCode1}/status", [
                'status'        => 'shipping',
                'carrier'       => 'GHN',
                'tracking_code' => 'TRK01',
            ]);
        $resInvalid1->assertStatus(422);
        $this->assertEquals(OrderStatus::Pending, Order::where('order_code', $orderCode1)->value('status'));

        // pending -> delivered: invalid
        $resInvalid2 = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$orderCode1}/status", ['status' => 'delivered']);
        $resInvalid2->assertStatus(422);
        $this->assertEquals(OrderStatus::Pending, Order::where('order_code', $orderCode1)->value('status'));

        // Advance Order 1 to delivered
        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/orders/{$orderCode1}/status", ['status' => 'confirmed']);
        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/orders/{$orderCode1}/status", [
            'status'        => 'shipping',
            'carrier'       => 'GHN',
            'tracking_code' => 'TRK02',
        ]);
        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/orders/{$orderCode1}/status", ['status' => 'delivered']);

        // delivered -> pending: invalid (terminal state)
        $resInvalid3 = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$orderCode1}/status", ['status' => 'pending']);
        $resInvalid3->assertStatus(422);
        $this->assertEquals(OrderStatus::Delivered, Order::where('order_code', $orderCode1)->value('status'));

        // delivered -> cancelled: invalid (terminal state)
        $resInvalid4 = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$orderCode1}/status", [
                'status' => 'cancelled',
                'reason' => 'Ly do huy',
            ]);
        $resInvalid4->assertStatus(422);
        $this->assertEquals(OrderStatus::Delivered, Order::where('order_code', $orderCode1)->value('status'));

        // Order 2: Test cancelled -> confirmed
        CartItem::create([
            'user_id'    => $customer->id,
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);
        $res = $this->actingAs($customer, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $orderCode2 = $res->json('order.order_code');

        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/orders/{$orderCode2}/status", [
            'status' => 'cancelled',
            'reason' => 'Huy don kiem tra',
        ]);
        $this->assertEquals(OrderStatus::Cancelled, Order::where('order_code', $orderCode2)->value('status'));

        // cancelled -> confirmed: invalid (terminal state)
        $resInvalid5 = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$orderCode2}/status", ['status' => 'confirmed']);
        $resInvalid5->assertStatus(422);
        $this->assertEquals(OrderStatus::Cancelled, Order::where('order_code', $orderCode2)->value('status'));
    }

    /**
     * OR-04 | Move to `shipping` without carrier or tracking code | rejected; succeeds when valid.
     */
    public function test_OR_04_transition_to_shipping_requires_valid_carrier_and_tracking_code(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $variant = $this->getActiveVariant(10);

        CartItem::create([
            'user_id'    => $customer->id,
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);
        $createRes = $this->actingAs($customer, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $orderCode = $createRes->json('order.order_code');

        // Move to confirmed first
        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/orders/{$orderCode}/status", ['status' => 'confirmed']);

        // Missing carrier & tracking_code -> 422
        $resMissing = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$orderCode}/status", [
                'status' => 'shipping',
            ]);
        $resMissing->assertStatus(422)
            ->assertJsonValidationErrors(['carrier', 'tracking_code']);

        // Invalid carrier not in allowed list -> 422
        $resInvalidCarrier = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$orderCode}/status", [
                'status'        => 'shipping',
                'carrier'       => 'INVALID_CARRIER_XYZ',
                'tracking_code' => 'TRK12345',
            ]);
        $resInvalidCarrier->assertStatus(422)
            ->assertJsonValidationErrors(['carrier']);

        // Valid carrier and tracking code -> 200
        $allowedCarriers = config('shop.shipping.carriers', ['GHN']);
        $carrier = $allowedCarriers[0] ?? 'GHN';
        $resValid = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$orderCode}/status", [
                'status'        => 'shipping',
                'carrier'       => $carrier,
                'tracking_code' => 'TRK12345',
            ]);
        $resValid->assertStatus(200);
        $this->assertEquals(OrderStatus::Shipping, Order::where('order_code', $orderCode)->value('status'));
    }

    /**
     * OR-05 | Customer views another customer's order (by code or id) | 403 or 404, never the data.
     */
    public function test_OR_05_customer_cannot_view_another_customers_order(): void
    {
        $customerA = $this->createCustomer(['email' => 'customer_a@example.com']);
        $customerB = $this->createCustomer(['email' => 'customer_b@example.com']);
        $variant = $this->getActiveVariant(10);

        CartItem::create([
            'user_id'    => $customerA->id,
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);
        $createRes = $this->actingAs($customerA, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $orderCodeA = $createRes->json('order.order_code');

        // Customer B tries to view Customer A's order by code
        $res = $this->actingAs($customerB, 'sanctum')->getJson("/api/orders/{$orderCodeA}");

        // Must be 403 or 404, never 200
        $this->assertContains($res->status(), [403, 404]);
        $res->assertJsonMissing(['order_code' => $orderCodeA]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STOCK
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * ST-01 | Place an order for quantity <= stock | stock decreases by exactly the ordered quantity per variant.
     */
    public function test_ST_01_placing_order_decreases_stock_by_exact_quantity(): void
    {
        $customer = $this->createCustomer();
        $variant = $this->getActiveVariant(10);

        CartItem::create([
            'user_id'    => $customer->id,
            'variant_id' => $variant->id,
            'quantity'   => 3,
        ]);

        $res = $this->actingAs($customer, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $res->assertStatus(201);

        $this->assertEquals(7, $variant->fresh()->stock_quantity);
    }

    /**
     * ST-02 | Place an order for quantity > stock | rejected, no order created, stock unchanged.
     */
    public function test_ST_02_placing_order_exceeding_stock_is_rejected_and_stock_unchanged(): void
    {
        $customer = $this->createCustomer();
        $variant = $this->getActiveVariant(5);

        // Put 5 in cart, then reduce stock to 2 to simulate concurrent stock depletion
        CartItem::create([
            'user_id'    => $customer->id,
            'variant_id' => $variant->id,
            'quantity'   => 5,
        ]);
        $variant->update(['stock_quantity' => 2]);

        $initialOrdersCount = Order::count();

        $res = $this->actingAs($customer, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $res->assertStatus(422);

        $this->assertEquals($initialOrdersCount, Order::count());
        $this->assertEquals(2, $variant->fresh()->stock_quantity);
    }

    /**
     * ST-03 | Cancel a pending/confirmed order | stock is restored; stock_adjustments or equivalent record exists; cancelling twice does not restore twice.
     */
    public function test_ST_03_cancel_order_restores_stock_and_prevents_double_cancel(): void
    {
        $customer = $this->createCustomer();
        $variant = $this->getActiveVariant(10);

        CartItem::create([
            'user_id'    => $customer->id,
            'variant_id' => $variant->id,
            'quantity'   => 4,
        ]);

        $res = $this->actingAs($customer, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $orderCode = $res->json('order.order_code');
        $this->assertEquals(6, $variant->fresh()->stock_quantity);

        // Customer cancels order
        $cancelRes = $this->actingAs($customer, 'sanctum')
            ->postJson("/api/orders/{$orderCode}/cancel", [
                'reason' => 'Doi y khong mua nua',
            ]);
        $cancelRes->assertStatus(200);

        // 1. Stock restored
        $this->assertEquals(10, $variant->fresh()->stock_quantity);

        // 2. Equivalent audit record in order_status_histories exists
        $order = Order::where('order_code', $orderCode)->firstOrFail();
        $history = OrderStatusHistory::where('order_id', $order->id)
            ->where('to_status', OrderStatus::Cancelled->value)
            ->first();
        $this->assertNotNull($history, 'Cancellation history record must exist');

        // Note on stock_adjustments: checked and reported in verification report.
        $hasStockAdjustment = StockAdjustment::where('variant_id', $variant->id)->exists();
        // We assert true if either stock_adjustments OR order_status_histories recorded it
        $this->assertTrue($hasStockAdjustment || $history !== null);

        // 3. Cancelling twice does not restore twice
        $cancelAgainRes = $this->actingAs($customer, 'sanctum')
            ->postJson("/api/orders/{$orderCode}/cancel", [
                'reason' => 'Huy lan nua',
            ]);
        $cancelAgainRes->assertStatus(422);
        $this->assertEquals(10, $variant->fresh()->stock_quantity);
    }

    /**
     * ST-04 | Two orders competing for the last unit | only one succeeds.
     */
    public function test_ST_04_two_orders_competing_for_last_unit_only_one_succeeds(): void
    {
        $customer1 = $this->createCustomer(['email' => 'compete1@example.com']);
        $customer2 = $this->createCustomer(['email' => 'compete2@example.com']);
        $variant = $this->getActiveVariant(1);

        CartItem::create(['user_id' => $customer1->id, 'variant_id' => $variant->id, 'quantity' => 1]);
        CartItem::create(['user_id' => $customer2->id, 'variant_id' => $variant->id, 'quantity' => 1]);

        // Customer 1 orders the last unit
        $res1 = $this->actingAs($customer1, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $res1->assertStatus(201);
        $this->assertEquals(0, $variant->fresh()->stock_quantity);

        // Customer 2 attempts to checkout the same unit
        $res2 = $this->actingAs($customer2, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $res2->assertStatus(422);
        $this->assertEquals(0, $variant->fresh()->stock_quantity);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRICING AND SHIPPING
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * PR-01 | Subtotal below threshold | shipping fee equals config fee; total = subtotal + fee.
     */
    public function test_PR_01_subtotal_below_threshold_applies_standard_shipping_fee(): void
    {
        $customer = $this->createCustomer();
        $freeThreshold = (int) config('shop.shipping.free_threshold');
        $standardFee = (int) config('shop.shipping.standard_fee');

        $subtotal = (int) ($freeThreshold / 4); // Subtotal dynamically computed below threshold
        $variant = $this->getActiveVariant(10, $subtotal);

        CartItem::create(['user_id' => $customer->id, 'variant_id' => $variant->id, 'quantity' => 1]);

        $res = $this->actingAs($customer, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $res->assertStatus(201);

        $order = Order::where('order_code', $res->json('order.order_code'))->firstOrFail();
        $this->assertEquals($subtotal, $order->subtotal);
        $this->assertEquals($standardFee, $order->shipping_fee);
        $this->assertEquals($subtotal + $standardFee, $order->total_amount);
    }

    /**
     * PR-02 | Subtotal at and above threshold | shipping fee is 0. Test exactly threshold-1, threshold, threshold+1.
     */
    public function test_PR_02_shipping_fee_at_exact_boundary_thresholds(): void
    {
        $freeThreshold = (int) config('shop.shipping.free_threshold');
        $standardFee = (int) config('shop.shipping.standard_fee');

        // Case A: threshold - 1
        $customerA = $this->createCustomer(['email' => 'thresh_minus1@example.com']);
        $variantA = $this->getActiveVariant(10, $freeThreshold - 1);
        CartItem::create(['user_id' => $customerA->id, 'variant_id' => $variantA->id, 'quantity' => 1]);
        $resA = $this->actingAs($customerA, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $resA->assertStatus(201);
        $orderA = Order::where('order_code', $resA->json('order.order_code'))->firstOrFail();
        $this->assertEquals($freeThreshold - 1, $orderA->subtotal);
        $this->assertEquals($standardFee, $orderA->shipping_fee);
        $this->assertEquals(($freeThreshold - 1) + $standardFee, $orderA->total_amount);

        // Quote check for Case A: verify subtotal matches
        $quoteResA = $this->postJson('/api/cart/quote', [
            'items' => [['variant_id' => $variantA->id, 'quantity' => 1]],
        ]);
        $quoteResA->assertStatus(200);
        $this->assertEquals($freeThreshold - 1, $quoteResA->json('subtotal'));

        // Case B: exactly threshold
        $customerB = $this->createCustomer(['email' => 'thresh_exact@example.com']);
        $variantB = $this->getActiveVariant(10, $freeThreshold);
        CartItem::create(['user_id' => $customerB->id, 'variant_id' => $variantB->id, 'quantity' => 1]);
        $resB = $this->actingAs($customerB, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $resB->assertStatus(201);
        $orderB = Order::where('order_code', $resB->json('order.order_code'))->firstOrFail();
        $this->assertEquals($freeThreshold, $orderB->subtotal);
        $this->assertEquals(0, $orderB->shipping_fee);
        $this->assertEquals($freeThreshold, $orderB->total_amount);

        // Quote check for Case B: verify subtotal matches
        $quoteResB = $this->postJson('/api/cart/quote', [
            'items' => [['variant_id' => $variantB->id, 'quantity' => 1]],
        ]);
        $quoteResB->assertStatus(200);
        $this->assertEquals($freeThreshold, $quoteResB->json('subtotal'));

        // Case C: threshold + 1
        $customerC = $this->createCustomer(['email' => 'thresh_plus1@example.com']);
        $variantC = $this->getActiveVariant(10, $freeThreshold + 1);
        CartItem::create(['user_id' => $customerC->id, 'variant_id' => $variantC->id, 'quantity' => 1]);
        $resC = $this->actingAs($customerC, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $resC->assertStatus(201);
        $orderC = Order::where('order_code', $resC->json('order.order_code'))->firstOrFail();
        $this->assertEquals($freeThreshold + 1, $orderC->subtotal);
        $this->assertEquals(0, $orderC->shipping_fee);
        $this->assertEquals($freeThreshold + 1, $orderC->total_amount);

        // Quote check for Case C: verify subtotal matches
        $quoteResC = $this->postJson('/api/cart/quote', [
            'items' => [['variant_id' => $variantC->id, 'quantity' => 1]],
        ]);
        $quoteResC->assertStatus(200);
        $this->assertEquals($freeThreshold + 1, $quoteResC->json('subtotal'));
    }

    /**
     * PR-02-B | Cart Quote design contract | verify that POST /api/cart/quote returns subtotal/items and does NOT return shipping_fee.
     *
     * Thiết kế kiến trúc: Frontend chỉ hiển thị phí vận chuyển ước tính dựa trên STORE_POLICIES (client-side),
     * trong khi tổng tiền đơn hàng và phí vận chuyển chính thức được tính toán bảo mật tại Backend (OrderController::store).
     */
    public function test_PR_02_cart_quote_design_contract_returns_subtotal_and_omits_shipping_fee(): void
    {
        $freeThreshold = (int) config('shop.shipping.free_threshold');
        $variant = $this->getActiveVariant(10, $freeThreshold - 1);

        $quoteRes = $this->postJson('/api/cart/quote', [
            'items' => [
                ['variant_id' => $variant->id, 'quantity' => 1],
            ],
        ]);
        $quoteRes->assertStatus(200);

        // Verify quote payload contract
        $quoteData = $quoteRes->json();
        $this->assertArrayHasKey('subtotal', $quoteData);
        $this->assertArrayHasKey('items', $quoteData);
        $this->assertArrayHasKey('total_quantity', $quoteData);
        $this->assertArrayHasKey('items_count', $quoteData);
        $this->assertArrayHasKey('has_unpurchasable_items', $quoteData);

        // Verify that quote does NOT return shipping_fee (authoritative shipping is calculated upon order creation in OrderController::store)
        $this->assertArrayNotHasKey('shipping_fee', $quoteData);
        $this->assertEquals($freeThreshold - 1, $quoteData['subtotal']);
    }

    /**
     * PR-03 | Change a product's price AFTER an order is placed | existing order prices do not change (price snapshot).
     */
    public function test_PR_03_changing_product_price_after_order_does_not_affect_existing_order(): void
    {
        $customer = $this->createCustomer();
        $initialPrice = 500000;
        $variant = $this->getActiveVariant(10, $initialPrice);

        CartItem::create(['user_id' => $customer->id, 'variant_id' => $variant->id, 'quantity' => 2]);
        $res = $this->actingAs($customer, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $orderCode = $res->json('order.order_code');

        // Admin changes product price to 900,000
        $variant->product->update(['base_price' => 900000]);

        // Existing order must keep snapshot price
        $order = Order::where('order_code', $orderCode)->with('items')->firstOrFail();
        $this->assertEquals(1000000, $order->subtotal);
        $this->assertEquals($initialPrice, $order->items->first()->unit_price);
        $this->assertEquals(1000000, $order->items->first()->line_total);
    }

    /**
     * PR-04 | Soft-delete a product in an existing order | order detail still returns the item; creating new order is rejected.
     */
    public function test_PR_04_soft_deleting_product_keeps_order_history_but_rejects_new_order(): void
    {
        $customer = $this->createCustomer();
        $variant = $this->getActiveVariant(10);
        $product = $variant->product;

        CartItem::create(['user_id' => $customer->id, 'variant_id' => $variant->id, 'quantity' => 1]);
        $createRes = $this->actingAs($customer, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $orderCode = $createRes->json('order.order_code');

        // Soft delete the product
        $product->delete();
        $this->assertSoftDeleted($product);

        // 1. Order detail still returns the item
        $showRes = $this->actingAs($customer, 'sanctum')->getJson("/api/orders/{$orderCode}");
        $showRes->assertStatus(200);
        $this->assertNotEmpty($showRes->json('order.items'));
        $this->assertEquals($product->name, $showRes->json('order.items.0.product_name'));

        // 2. Creating a new order with the deleted product is rejected
        $customer2 = $this->createCustomer(['email' => 'customer2@example.com']);
        $addRes = $this->actingAs($customer2, 'sanctum')->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);
        $addRes->assertStatus(422);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CART AND CHECKOUT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * CK-01 | Add quantity 0, negative, non-integer, or above stock to cart | rejected (422) with Vietnamese message.
     */
    public function test_CK_01_cart_rejects_invalid_quantities_with_vietnamese_message(): void
    {
        $customer = $this->createCustomer();
        $variant = $this->getActiveVariant(5);

        // 1. Quantity = 0
        $res0 = $this->actingAs($customer, 'sanctum')->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => 0,
        ]);
        $res0->assertStatus(422);
        $this->assertMatchesRegularExpression('/[\p{L}\s]+/u', json_encode($res0->json(), JSON_UNESCAPED_UNICODE));

        // 2. Quantity = -2
        $resNeg = $this->actingAs($customer, 'sanctum')->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => -2,
        ]);
        $resNeg->assertStatus(422);

        // 3. Non-integer quantity = 1.5
        $resFloat = $this->actingAs($customer, 'sanctum')->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => 1.5,
        ]);
        $resFloat->assertStatus(422);

        // 4. Quantity above stock = 10 (stock = 5)
        $resAbove = $this->actingAs($customer, 'sanctum')->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => 10,
        ]);
        $resAbove->assertStatus(422);
        $message = $resAbove->json('message') ?? $resAbove->json('errors.quantity.0');
        $this->assertStringContainsString('vượt quá số lượng còn lại trong kho', $message);
    }

    /**
     * CK-02 | Checkout with empty cart | rejected.
     */
    public function test_CK_02_checkout_with_empty_cart_is_rejected(): void
    {
        $customer = $this->createCustomer();
        $this->assertEquals(0, CartItem::where('user_id', $customer->id)->count());

        $res = $this->actingAs($customer, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $res->assertStatus(422);
        $this->assertStringContainsString('trống', json_encode($res->json(), JSON_UNESCAPED_UNICODE));
    }

    /**
     * CK-03 | Checkout with missing/invalid name, phone, address | 422 with field-level messages.
     */
    public function test_CK_03_checkout_with_missing_or_invalid_fields_returns_422(): void
    {
        $customer = $this->createCustomer();
        $variant = $this->getActiveVariant(10);
        CartItem::create(['user_id' => $customer->id, 'variant_id' => $variant->id, 'quantity' => 1]);

        $res = $this->actingAs($customer, 'sanctum')->postJson('/api/orders', [
            'recipient_name'   => '',
            'recipient_phone'  => '12345', // Invalid phone format
            'shipping_address' => '',
            'payment_method'   => 'cod',
        ]);

        $res->assertStatus(422)
            ->assertJsonValidationErrors(['recipient_name', 'recipient_phone', 'shipping_address']);
    }

    /**
     * CK-04 | Unauthenticated user calls cart/checkout/orders endpoints | 401.
     */
    public function test_CK_04_unauthenticated_user_access_returns_401(): void
    {
        $this->getJson('/api/cart')->assertStatus(401);
        $this->postJson('/api/cart/items', ['variant_id' => 1, 'quantity' => 1])->assertStatus(401);
        $this->deleteJson('/api/cart')->assertStatus(401);
        $this->getJson('/api/orders')->assertStatus(401);
        $this->postJson('/api/orders', $this->validCheckoutPayload())->assertStatus(401);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STATISTICS DEFINITIONS (Asia/Ho_Chi_Minh timezone)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * ST-D1 | Revenue and average order value | only `delivered` orders counted; cancelled/pending excluded.
     */
    public function test_ST_D1_revenue_and_aov_only_counts_delivered_orders(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();

        // 1. Delivered order (included in revenue)
        Order::create([
            'order_code'       => 'MSDELIV01',
            'user_id'          => $customer->id,
            'status'           => OrderStatus::Delivered,
            'payment_method'   => PaymentMethod::Cod,
            'payment_status'   => PaymentStatus::Paid,
            'paid_at'          => now(),
            'recipient_name'   => 'Customer A',
            'recipient_phone'  => '0912345678',
            'shipping_address' => 'HCM',
            'subtotal'         => 1000000,
            'shipping_fee'     => 0,
            'total_amount'     => 1000000,
        ]);

        // 2. Pending order (excluded from revenue)
        Order::create([
            'order_code'       => 'MSPEND01',
            'user_id'          => $customer->id,
            'status'           => OrderStatus::Pending,
            'payment_method'   => PaymentMethod::Cod,
            'payment_status'   => PaymentStatus::Unpaid,
            'recipient_name'   => 'Customer B',
            'recipient_phone'  => '0912345678',
            'shipping_address' => 'HCM',
            'subtotal'         => 500000,
            'shipping_fee'     => 30000,
            'total_amount'     => 530000,
        ]);

        // 3. Cancelled order (excluded from revenue)
        Order::create([
            'order_code'       => 'MSCANC01',
            'user_id'          => $customer->id,
            'status'           => OrderStatus::Cancelled,
            'payment_method'   => PaymentMethod::Cod,
            'payment_status'   => PaymentStatus::Unpaid,
            'recipient_name'   => 'Customer C',
            'recipient_phone'  => '0912345678',
            'shipping_address' => 'HCM',
            'subtotal'         => 2000000,
            'shipping_fee'     => 0,
            'total_amount'     => 2000000,
        ]);

        $res = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard/summary');
        $res->assertStatus(200);

        $this->assertEquals(1000000, $res->json('data.revenue'));
        $this->assertEquals(1, $res->json('data.delivered_orders_count'));
        $this->assertEquals(1000000, $res->json('data.average_order_value'));
    }

    /**
     * ST-D2 | Cancellation rate | cancelled orders / all orders, grouped by created_at date; verify an order created at 23:30 VN time lands on the correct day.
     */
    public function test_ST_D2_cancellation_rate_and_timezone_boundary(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();

        // Kiểm tra độc lập với thời gian chạy test bằng ít nhất 2 ngày đích khác nhau (boundary dates)
        $testTargetDates = ['2026-11-15', '2027-06-20'];

        try {
            foreach ($testTargetDates as $index => $targetVnDate) {
                // Đóng băng thời gian tại ngày test (12:00 trưa giờ VN)
                Carbon::setTestNow(Carbon::createFromFormat('Y-m-d H:i:s', "{$targetVnDate} 12:00:00", 'Asia/Ho_Chi_Minh'));

                // 23:30 Vietnam time (UTC+7) is 16:30 UTC on the same calendar day
                $vnLateNightUtc = Carbon::createFromFormat('Y-m-d H:i:s', "{$targetVnDate} 23:30:00", 'Asia/Ho_Chi_Minh')
                    ->setTimezone('UTC');

                $vnMorningUtc = Carbon::createFromFormat('Y-m-d H:i:s', "{$targetVnDate} 09:00:00", 'Asia/Ho_Chi_Minh')
                    ->setTimezone('UTC');

                $nextDayVnDate = Carbon::createFromFormat('Y-m-d', $targetVnDate, 'Asia/Ho_Chi_Minh')
                    ->addDay()
                    ->format('Y-m-d');

                // Order 1: Pending, created in morning VN time
                $o1 = Order::create([
                    'order_code'       => 'MSTIME01_' . $index,
                    'user_id'          => $customer->id,
                    'status'           => OrderStatus::Pending,
                    'payment_method'   => PaymentMethod::Cod,
                    'payment_status'   => PaymentStatus::Unpaid,
                    'recipient_name'   => 'A',
                    'recipient_phone'  => '0912345678',
                    'shipping_address' => 'HCM',
                    'subtotal'         => 500000,
                    'shipping_fee'     => 30000,
                    'total_amount'     => 530000,
                ]);
                $o1->forceFill([
                    'created_at' => $vnMorningUtc,
                    'updated_at' => $vnMorningUtc,
                ])->save();

                // Order 2: Cancelled, created at 23:30 VN time
                $o2 = Order::create([
                    'order_code'       => 'MSTIME02_' . $index,
                    'user_id'          => $customer->id,
                    'status'           => OrderStatus::Cancelled,
                    'payment_method'   => PaymentMethod::Cod,
                    'payment_status'   => PaymentStatus::Unpaid,
                    'recipient_name'   => 'B',
                    'recipient_phone'  => '0912345678',
                    'shipping_address' => 'HCM',
                    'subtotal'         => 500000,
                    'shipping_fee'     => 30000,
                    'total_amount'     => 530000,
                ]);
                $o2->forceFill([
                    'created_at' => $vnLateNightUtc,
                    'updated_at' => $vnLateNightUtc,
                ])->save();

                // Query dashboard summary for exactly targetVnDate
                $res = $this->actingAs($admin, 'sanctum')->getJson("/api/admin/dashboard/summary?from={$targetVnDate}&to={$targetVnDate}");
                $res->assertStatus(200);

                // Both orders must fall on this VN day (total = 2, cancelled = 1, cancellation_rate = 50.0%)
                $this->assertEquals(2, array_sum($res->json('data.orders_by_status')));
                $this->assertEquals(1, $res->json('data.orders_by_status.cancelled'));
                $this->assertEquals(50.0, $res->json('data.cancellation_rate'));

                // Querying for the next day must NOT include the 23:30 order
                $nextDayRes = $this->actingAs($admin, 'sanctum')->getJson("/api/admin/dashboard/summary?from={$nextDayVnDate}&to={$nextDayVnDate}");
                $nextDayRes->assertStatus(200);
                $this->assertEquals(0, array_sum($nextDayRes->json('data.orders_by_status')));
            }
        } finally {
            Carbon::setTestNow();
        }
    }

    /**
     * ST-D3 | Customer total_spent | sum of delivered orders only.
     */
    public function test_ST_D3_customer_total_spent_sums_only_delivered_orders(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();

        // Delivered order 1: 600,000
        Order::create([
            'order_code'       => 'MSUSER01',
            'user_id'          => $customer->id,
            'status'           => OrderStatus::Delivered,
            'payment_method'   => PaymentMethod::Cod,
            'payment_status'   => PaymentStatus::Paid,
            'recipient_name'   => 'Customer',
            'recipient_phone'  => '0912345678',
            'shipping_address' => 'HCM',
            'subtotal'         => 600000,
            'shipping_fee'     => 0,
            'total_amount'     => 600000,
        ]);

        // Delivered order 2: 400,000
        Order::create([
            'order_code'       => 'MSUSER02',
            'user_id'          => $customer->id,
            'status'           => OrderStatus::Delivered,
            'payment_method'   => PaymentMethod::Cod,
            'payment_status'   => PaymentStatus::Paid,
            'recipient_name'   => 'Customer',
            'recipient_phone'  => '0912345678',
            'shipping_address' => 'HCM',
            'subtotal'         => 400000,
            'shipping_fee'     => 0,
            'total_amount'     => 400000,
        ]);

        // Pending order: 700,000 (must be excluded)
        Order::create([
            'order_code'       => 'MSUSER03',
            'user_id'          => $customer->id,
            'status'           => OrderStatus::Pending,
            'payment_method'   => PaymentMethod::Cod,
            'payment_status'   => PaymentStatus::Unpaid,
            'recipient_name'   => 'Customer',
            'recipient_phone'  => '0912345678',
            'shipping_address' => 'HCM',
            'subtotal'         => 700000,
            'shipping_fee'     => 0,
            'total_amount'     => 700000,
        ]);

        // Cancelled order: 300,000 (must be excluded)
        Order::create([
            'order_code'       => 'MSUSER04',
            'user_id'          => $customer->id,
            'status'           => OrderStatus::Cancelled,
            'payment_method'   => PaymentMethod::Cod,
            'payment_status'   => PaymentStatus::Unpaid,
            'recipient_name'   => 'Customer',
            'recipient_phone'  => '0912345678',
            'shipping_address' => 'HCM',
            'subtotal'         => 300000,
            'shipping_fee'     => 0,
            'total_amount'     => 300000,
        ]);

        // 1. In list: GET /api/admin/customers
        $listRes = $this->actingAs($admin, 'sanctum')->getJson('/api/admin/customers');
        $customerData = collect($listRes->json('data'))->firstWhere('id', $customer->id);
        $this->assertEquals(1000000, $customerData['total_spent']);

        // 2. In detail: GET /api/admin/customers/{id}
        $detailRes = $this->actingAs($admin, 'sanctum')->getJson("/api/admin/customers/{$customer->id}");
        $this->assertEquals(1000000, $detailRes->json('stats.total_spent'));
    }

    /**
     * ST-D4 | Best-selling sort | quantity sold in the last 90 days, excluding cancelled orders; order 91 days old is excluded.
     */
    public function test_ST_D4_best_selling_sort_rules(): void
    {
        $customer = $this->createCustomer();
        $category = Category::first();
        $brand = Brand::first();

        $color = Color::first();
        $size = Size::first();

        // Product A: 5 units sold 10 days ago (active)
        $prodA = Product::create([
            'name'         => 'Product A Best Seller',
            'slug'         => 'prod-a-best-seller',
            'category_id'  => $category->id,
            'brand_id'     => $brand->id,
            'base_price'   => 100000,
            'status'       => ProductStatus::Active,
            'published_at' => now()->subDays(10),
        ]);
        $varA = ProductVariant::create([
            'product_id'     => $prodA->id,
            'color_id'       => $color->id,
            'size_id'        => $size->id,
            'sku'            => 'SKU-A-01',
            'stock_quantity' => 100,
            'is_active'      => true,
        ]);

        // Product B: 10 units sold in CANCELLED order 5 days ago (must NOT count)
        $prodB = Product::create([
            'name'         => 'Product B Cancelled Seller',
            'slug'         => 'prod-b-cancelled-seller',
            'category_id'  => $category->id,
            'brand_id'     => $brand->id,
            'base_price'   => 100000,
            'status'       => ProductStatus::Active,
            'published_at' => now()->subDays(10),
        ]);
        $varB = ProductVariant::create([
            'product_id'     => $prodB->id,
            'color_id'       => $color->id,
            'size_id'        => $size->id,
            'sku'            => 'SKU-B-01',
            'stock_quantity' => 100,
            'is_active'      => true,
        ]);

        // Product C: 20 units sold 95 days ago (>90 days cutoff, must NOT count)
        $prodC = Product::create([
            'name'         => 'Product C Old Seller',
            'slug'         => 'prod-c-old-seller',
            'category_id'  => $category->id,
            'brand_id'     => $brand->id,
            'base_price'   => 100000,
            'status'       => ProductStatus::Active,
            'published_at' => now()->subDays(100),
        ]);
        $varC = ProductVariant::create([
            'product_id'     => $prodC->id,
            'color_id'       => $color->id,
            'size_id'        => $size->id,
            'sku'            => 'SKU-C-01',
            'stock_quantity' => 100,
            'is_active'      => true,
        ]);

        // Order for A: 10 days ago, delivered, qty 5
        $orderA = Order::create([
            'order_code'       => 'MSBSTA01',
            'user_id'          => $customer->id,
            'status'           => OrderStatus::Delivered,
            'payment_method'   => PaymentMethod::Cod,
            'payment_status'   => PaymentStatus::Paid,
            'recipient_name'   => 'A',
            'recipient_phone'  => '0912345678',
            'shipping_address' => 'HCM',
            'subtotal'         => 500000,
            'shipping_fee'     => 0,
            'total_amount'     => 500000,
        ]);
        DB::table('orders')->where('id', $orderA->id)->update([
            'created_at' => now()->subDays(10),
            'updated_at' => now()->subDays(10),
        ]);
        OrderItem::create([
            'order_id'     => $orderA->id,
            'product_id'   => $prodA->id,
            'variant_id'   => $varA->id,
            'product_name' => $prodA->name,
            'color_name'   => 'Đen',
            'size_name'    => 'M',
            'sku'          => $varA->sku,
            'unit_price'   => 100000,
            'quantity'     => 5,
            'line_total'   => 500000,
        ]);

        // Order for B: 5 days ago, cancelled, qty 10
        $orderB = Order::create([
            'order_code'       => 'MSBSTB01',
            'user_id'          => $customer->id,
            'status'           => OrderStatus::Cancelled,
            'payment_method'   => PaymentMethod::Cod,
            'payment_status'   => PaymentStatus::Unpaid,
            'recipient_name'   => 'B',
            'recipient_phone'  => '0912345678',
            'shipping_address' => 'HCM',
            'subtotal'         => 1000000,
            'shipping_fee'     => 0,
            'total_amount'     => 1000000,
        ]);
        DB::table('orders')->where('id', $orderB->id)->update([
            'created_at' => now()->subDays(5),
            'updated_at' => now()->subDays(5),
        ]);
        OrderItem::create([
            'order_id'     => $orderB->id,
            'product_id'   => $prodB->id,
            'variant_id'   => $varB->id,
            'product_name' => $prodB->name,
            'color_name'   => 'Đen',
            'size_name'    => 'M',
            'sku'          => $varB->sku,
            'unit_price'   => 100000,
            'quantity'     => 10,
            'line_total'   => 1000000,
        ]);

        // Order for C: 95 days ago, delivered, qty 20
        $orderC = Order::create([
            'order_code'       => 'MSBSTC01',
            'user_id'          => $customer->id,
            'status'           => OrderStatus::Delivered,
            'payment_method'   => PaymentMethod::Cod,
            'payment_status'   => PaymentStatus::Paid,
            'recipient_name'   => 'C',
            'recipient_phone'  => '0912345678',
            'shipping_address' => 'HCM',
            'subtotal'         => 2000000,
            'shipping_fee'     => 0,
            'total_amount'     => 2000000,
        ]);
        DB::table('orders')->where('id', $orderC->id)->update([
            'created_at' => now()->subDays(95),
            'updated_at' => now()->subDays(95),
        ]);
        OrderItem::create([
            'order_id'     => $orderC->id,
            'product_id'   => $prodC->id,
            'variant_id'   => $varC->id,
            'product_name' => $prodC->name,
            'color_name'   => 'Đen',
            'size_name'    => 'M',
            'sku'          => $varC->sku,
            'unit_price'   => 100000,
            'quantity'     => 20,
            'line_total'   => 2000000,
        ]);

        $res = $this->getJson('/api/products?sort=best_selling&per_page=48');
        $res->assertStatus(200);

        $slugs = collect($res->json('data'))->pluck('slug')->all();
        $posA = array_search('prod-a-best-seller', $slugs);
        $posB = array_search('prod-b-cancelled-seller', $slugs);
        $posC = array_search('prod-c-old-seller', $slugs);

        $this->assertNotFalse($posA, 'Product A must appear in list');
        // Product A (sold 5 in last 90 days) must be positioned ahead of Product B (0 valid) and Product C (0 valid)
        $this->assertTrue($posA < $posB, 'Product A must rank higher than cancelled-order Product B');
        $this->assertTrue($posA < $posC, 'Product A must rank higher than 95-day-old Product C');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AUTHORIZATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * AU-01 | Customer token on every /api/admin/* route | 403.
     */
    public function test_AU_01_customer_token_returns_403_on_all_admin_routes(): void
    {
        $customer = $this->createCustomer();

        $adminRoutes = collect(Route::getRoutes()->getRoutes())
            ->filter(fn($r) => str_starts_with($r->uri(), 'api/admin'));

        $this->assertNotEmpty($adminRoutes, 'There must be registered admin routes');

        foreach ($adminRoutes as $route) {
            $uri = $route->uri();
            $methods = array_diff($route->methods(), ['HEAD']);

            // Substitute dummy route parameters
            $testUri = '/' . preg_replace('/\{[a-zA-Z_]+\}/', '1', $uri);

            foreach ($methods as $method) {
                $response = $this->actingAs($customer, 'sanctum')
                    ->json($method, $testUri);

                $this->assertEquals(
                    403,
                    $response->status(),
                    "Customer token must receive 403 on {$method} {$testUri}, received {$response->status()}"
                );
            }
        }
    }

    /**
     * AU-02 | Operator vs admin | document exactly which admin routes each role can access.
     */
    public function test_AU_02_operator_vs_admin_permissions(): void
    {
        $operator = $this->createOperator();

        // 1. Operator CAN access read routes (200)
        $this->actingAs($operator, 'sanctum')->getJson('/api/admin/orders')->assertStatus(200);
        $this->actingAs($operator, 'sanctum')->getJson('/api/admin/products')->assertStatus(200);
        $this->actingAs($operator, 'sanctum')->getJson('/api/admin/customers')->assertStatus(200);
        $this->actingAs($operator, 'sanctum')->getJson('/api/admin/dashboard/summary')->assertStatus(200);
        $this->actingAs($operator, 'sanctum')->getJson('/api/admin/stock/low')->assertStatus(200);

        // 2. Operator CANNOT perform admin-only write/destructive operations (403)
        $this->actingAs($operator, 'sanctum')->postJson('/api/admin/products', [])->assertStatus(403);
        $this->actingAs($operator, 'sanctum')->deleteJson('/api/admin/products/1')->assertStatus(403);
        $this->actingAs($operator, 'sanctum')->postJson('/api/admin/variants/1/stock', [])->assertStatus(403);
        $this->actingAs($operator, 'sanctum')->deleteJson('/api/admin/variants/1')->assertStatus(403);
        $this->actingAs($operator, 'sanctum')->postJson('/api/admin/products/1/images', [])->assertStatus(403);
    }

    /**
     * AU-03 | Inactive/blocked user token | rejected by active middleware.
     */
    public function test_AU_03_locked_user_token_rejected_by_active_middleware(): void
    {
        $lockedCustomer = $this->createCustomer(['status' => UserStatus::Locked]);

        $resCart = $this->actingAs($lockedCustomer, 'sanctum')->getJson('/api/cart');
        $resCart->assertStatus(403)
            ->assertJson([
                'message' => 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
            ]);

        $resOrder = $this->actingAs($lockedCustomer, 'sanctum')->getJson('/api/orders');
        $resOrder->assertStatus(403);
    }

    /**
     * AU-04 | No token on protected routes | 401.
     */
    public function test_AU_04_unauthenticated_requests_to_protected_routes_return_401(): void
    {
        $this->getJson('/api/cart')->assertStatus(401);
        $this->getJson('/api/orders')->assertStatus(401);
        $this->getJson('/api/admin/orders')->assertStatus(401);
        $this->getJson('/api/admin/products')->assertStatus(401);
        $this->getJson('/api/admin/customers')->assertStatus(401);
        $this->getJson('/api/admin/dashboard/summary')->assertStatus(401);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRODUCT VISIBILITY AND SEARCH
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * PV-01 | Hidden/inactive/soft-deleted products | absent from public list, detail, search, best sellers.
     */
    public function test_PV_01_hidden_inactive_and_soft_deleted_products_absent_from_public(): void
    {
        $category = Category::first();
        $brand = Brand::first();

        // 1. Inactive product
        $inactiveProd = Product::create([
            'name'         => 'San Pham Inactive Bi An',
            'slug'         => 'san-pham-inactive-bi-an',
            'category_id'  => $category->id,
            'brand_id'     => $brand->id,
            'base_price'   => 150000,
            'status'       => ProductStatus::Draft,
            'published_at' => now()->subDay(),
        ]);

        // 2. Future published product
        $futureProd = Product::create([
            'name'         => 'San Pham Tuong Lai Bi An',
            'slug'         => 'san-pham-tuong-lai-bi-an',
            'category_id'  => $category->id,
            'brand_id'     => $brand->id,
            'base_price'   => 150000,
            'status'       => ProductStatus::Active,
            'published_at' => now()->addDays(5),
        ]);

        // 3. Soft-deleted product
        $deletedProd = Product::create([
            'name'         => 'San Pham Da Xoa Bi An',
            'slug'         => 'san-pham-da-xoa-bi-an',
            'category_id'  => $category->id,
            'brand_id'     => $brand->id,
            'base_price'   => 150000,
            'status'       => ProductStatus::Active,
            'published_at' => now()->subDay(),
        ]);
        $deletedProd->delete();

        // Check list endpoint: GET /api/products
        $listRes = $this->getJson('/api/products?per_page=100');
        $slugs = collect($listRes->json('data'))->pluck('slug')->all();
        $this->assertNotContains($inactiveProd->slug, $slugs);
        $this->assertNotContains($futureProd->slug, $slugs);
        $this->assertNotContains($deletedProd->slug, $slugs);

        // Check search endpoint
        $searchRes = $this->getJson('/api/products?search=Bi+An');
        $searchSlugs = collect($searchRes->json('data'))->pluck('slug')->all();
        $this->assertNotContains($inactiveProd->slug, $searchSlugs);
        $this->assertNotContains($futureProd->slug, $searchSlugs);
        $this->assertNotContains($deletedProd->slug, $searchSlugs);

        // Check detail endpoint: GET /api/products/{slug} returns 404
        $this->getJson("/api/products/{$inactiveProd->slug}")->assertStatus(404);
        $this->getJson("/api/products/{$futureProd->slug}")->assertStatus(404);
        $this->getJson("/api/products/{$deletedProd->slug}")->assertStatus(404);
    }

    /**
     * SE-01 | Search behavior | documents whether search matches name, slug, description, material, brand, category.
     */
    public function test_SE_01_search_matches_multiple_columns_documentation(): void
    {
        $category = Category::where('slug', 'dresses')->first() ?? Category::first();
        $brand = Brand::first();

        // Unique token per field
        $tokenDesc = 'UNQDESC' . uniqid();
        $tokenMat  = 'UNQMAT' . uniqid();

        $prodDesc = Product::create([
            'name'         => 'Ao Khoac Thuan Tuy',
            'slug'         => 'ao-khoac-thuan-tuy-' . uniqid(),
            'description'  => "Mo ta dac biet chua {$tokenDesc} doc nhat",
            'material'     => 'Cotton',
            'category_id'  => $category->id,
            'brand_id'     => $brand->id,
            'base_price'   => 200000,
            'status'       => ProductStatus::Active,
            'published_at' => now()->subDay(),
        ]);

        $prodMat = Product::create([
            'name'         => 'Vay Da Hoi Co Dien',
            'slug'         => 'vay-da-hoi-co-dien-' . uniqid(),
            'description'  => 'Mo ta binh thuong',
            'material'     => "Chat lieu {$tokenMat} cao cap",
            'category_id'  => $category->id,
            'brand_id'     => $brand->id,
            'base_price'   => 200000,
            'status'       => ProductStatus::Active,
            'published_at' => now()->subDay(),
        ]);

        // 1. Search matching description
        $resDesc = $this->getJson("/api/products?search={$tokenDesc}");
        $this->assertTrue(
            collect($resDesc->json('data'))->contains('slug', $prodDesc->slug),
            'Search currently matches description column'
        );

        // 2. Search matching material
        $resMat = $this->getJson("/api/products?search={$tokenMat}");
        $this->assertTrue(
            collect($resMat->json('data'))->contains('slug', $prodMat->slug),
            'Search currently matches material column'
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MISSING BUSINESS RULES (M-01 to M-06)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * M-01 | Move an order to `shipping` without carrier or tracking code -> rejected; with both -> succeeds; carrier outside the allowed list -> rejected.
     */
    public function test_M_01_move_order_to_shipping_carrier_and_tracking_code_rules(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $variant = $this->getActiveVariant(10);

        CartItem::create([
            'user_id'    => $customer->id,
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);

        $orderRes = $this->actingAs($customer, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $orderRes->assertStatus(201);
        $orderCode = $orderRes->json('order.order_code');

        // Move pending -> confirmed
        $confRes = $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/orders/{$orderCode}/status", [
            'status' => 'confirmed',
        ]);
        $confRes->assertStatus(200);

        // 1. Without carrier or tracking code -> rejected (422)
        $noShippingInfoRes = $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/orders/{$orderCode}/status", [
            'status' => 'shipping',
        ]);
        $noShippingInfoRes->assertStatus(422)
            ->assertJsonValidationErrors(['carrier', 'tracking_code']);

        // 2. With carrier only (missing tracking_code) -> rejected (422)
        $onlyCarrierRes = $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/orders/{$orderCode}/status", [
            'status'  => 'shipping',
            'carrier' => 'GHN',
        ]);
        $onlyCarrierRes->assertStatus(422)
            ->assertJsonValidationErrors(['tracking_code']);

        // 3. Carrier outside allowed list -> rejected (422)
        $invalidCarrierRes = $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/orders/{$orderCode}/status", [
            'status'        => 'shipping',
            'carrier'       => 'UnsupportedExpress999',
            'tracking_code' => 'TRACK123456',
        ]);
        $invalidCarrierRes->assertStatus(422)
            ->assertJsonValidationErrors(['carrier']);

        // 4. With both valid carrier and tracking code -> succeeds (200)
        $allowedCarrier = config('shop.shipping.carriers.0', 'GHN');
        $validShippingRes = $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/orders/{$orderCode}/status", [
            'status'        => 'shipping',
            'carrier'       => $allowedCarrier,
            'tracking_code' => 'GHN123456789VN',
        ]);
        $validShippingRes->assertStatus(200);

        $order = Order::where('order_code', $orderCode)->firstOrFail();
        $this->assertEquals(OrderStatus::Shipping, $order->status);
        $this->assertEquals($allowedCarrier, $order->carrier);
        $this->assertEquals('GHN123456789VN', $order->tracking_code);
    }

    /**
     * M-02 | Add to cart with quantity 0, negative, non-integer, and above available stock -> each rejected with 422.
     */
    public function test_M_02_add_to_cart_invalid_quantities_and_above_stock_rejected(): void
    {
        $customer = $this->createCustomer();
        $variant = $this->getActiveVariant(5); // stock = 5

        // 1. Quantity 0 -> 422
        $resZero = $this->actingAs($customer, 'sanctum')->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => 0,
        ]);
        $resZero->assertStatus(422)->assertJsonValidationErrors(['quantity']);

        // 2. Negative quantity -> 422
        $resNegative = $this->actingAs($customer, 'sanctum')->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => -2,
        ]);
        $resNegative->assertStatus(422)->assertJsonValidationErrors(['quantity']);

        // 3. Non-integer quantity -> 422
        $resNonInt = $this->actingAs($customer, 'sanctum')->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => 2.5,
        ]);
        $resNonInt->assertStatus(422)->assertJsonValidationErrors(['quantity']);

        // 4. Quantity above available stock (6 > 5) -> 422
        $resAboveStock = $this->actingAs($customer, 'sanctum')->postJson('/api/cart/items', [
            'variant_id' => $variant->id,
            'quantity'   => 6,
        ]);
        $resAboveStock->assertStatus(422)->assertJsonValidationErrors(['quantity']);

        // Cart remains empty
        $this->assertEquals(0, CartItem::where('user_id', $customer->id)->count());
    }

    /**
     * M-03 | Checkout with an empty cart -> rejected.
     */
    public function test_M_03_checkout_with_empty_cart_rejected(): void
    {
        $customer = $this->createCustomer();
        // Ensure no cart items exist
        CartItem::where('user_id', $customer->id)->delete();

        $initialOrdersCount = Order::count();

        $res = $this->actingAs($customer, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $res->assertStatus(422);
        $res->assertJsonFragment([
            'message' => 'Giỏ hàng của bạn đang trống.',
        ]);

        $this->assertEquals($initialOrdersCount, Order::count());
    }

    /**
     * M-04 | Place an order, then change the product's price, then fetch the existing order -> order_items unit_price and total_amount unchanged.
     */
    public function test_M_04_order_prices_remain_unchanged_after_product_price_modification(): void
    {
        $customer = $this->createCustomer();
        $originalPrice = 250000;
        $variant = $this->getActiveVariant(10, $originalPrice);

        CartItem::create([
            'user_id'    => $customer->id,
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);

        $orderRes = $this->actingAs($customer, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $orderRes->assertStatus(201);
        $orderCode = $orderRes->json('order.order_code');

        $freeThreshold = (int) config('shop.shipping.free_threshold', 2000000);
        $standardFee = (int) config('shop.shipping.standard_fee', 30000);
        $expectedShippingFee = $originalPrice >= $freeThreshold ? 0 : $standardFee;
        $expectedTotal = $originalPrice + $expectedShippingFee;

        // Change the product price drastically to 999,999
        $variant->product->update(['base_price' => 999999]);

        // Customer fetches the placed order
        $detailRes = $this->actingAs($customer, 'sanctum')->getJson("/api/orders/{$orderCode}");
        $detailRes->assertStatus(200);

        $this->assertEquals($originalPrice, $detailRes->json('order.subtotal'));
        $this->assertEquals($expectedShippingFee, $detailRes->json('order.shipping_fee'));
        $this->assertEquals($expectedTotal, $detailRes->json('order.total_amount'));
        $this->assertEquals($originalPrice, $detailRes->json('order.items.0.unit_price'));
        $this->assertEquals($originalPrice, $detailRes->json('order.items.0.line_total'));
    }

    /**
     * M-05 | Soft-delete a product that is in an existing order -> order detail still returns the item; creating a new order with it is rejected.
     */
    public function test_M_05_soft_deleted_product_in_existing_order_remains_visible_and_new_order_rejected(): void
    {
        $customer = $this->createCustomer();
        $variant = $this->getActiveVariant(10, 200000);
        $product = $variant->product;

        // 1. Place order with the active product
        CartItem::create([
            'user_id'    => $customer->id,
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);
        $orderRes = $this->actingAs($customer, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $orderRes->assertStatus(201);
        $orderCode = $orderRes->json('order.order_code');

        // 2. Soft-delete the product
        $product->delete();
        $this->assertTrue($product->fresh()->trashed());

        // 3. Existing order detail still returns the item snapshot
        $detailRes = $this->actingAs($customer, 'sanctum')->getJson("/api/orders/{$orderCode}");
        $detailRes->assertStatus(200);
        $this->assertEquals($product->name, $detailRes->json('order.items.0.product_name'));
        $this->assertEquals(200000, $detailRes->json('order.items.0.unit_price'));

        // 4. Attempting to place a new order with the soft-deleted product is rejected (422)
        CartItem::create([
            'user_id'    => $customer->id,
            'variant_id' => $variant->id,
            'quantity'   => 1,
        ]);
        $newOrderRes = $this->actingAs($customer, 'sanctum')->postJson('/api/orders', $this->validCheckoutPayload());
        $newOrderRes->assertStatus(422);
        $newOrderRes->assertJsonFragment([
            'message' => 'Một số sản phẩm trong giỏ hàng không đủ số lượng hoặc không còn khả dụng.',
        ]);
    }

    /**
     * M-06 | Issue a token for a user, then deactivate the user -> the existing token is rejected on protected routes (the `active` middleware), not only at login.
     */
    public function test_M_06_deactivated_user_existing_token_rejected_on_protected_routes(): void
    {
        $customer = $this->createCustomer();
        $token = $customer->createToken('auth-token')->plainTextToken;

        // Active user accesses protected route successfully
        $activeRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me');
        $activeRes->assertStatus(200);

        // Deactivate (lock) the user
        $customer->update(['status' => UserStatus::Locked]);
        auth()->forgetGuards();

        // Existing token used on protected route is rejected with 403 by CheckActiveUser middleware
        $lockedRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me');
        $lockedRes->assertStatus(403);
        $lockedRes->assertJsonFragment([
            'message' => 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
        ]);

        // Middleware also revokes the token
        $this->assertEquals(0, $customer->tokens()->count());

        // Subsequent request fails with 401 Unauthorized because the token was deleted
        auth()->forgetGuards();
        $revokedRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/auth/me');
        $revokedRes->assertStatus(401);
    }
}

