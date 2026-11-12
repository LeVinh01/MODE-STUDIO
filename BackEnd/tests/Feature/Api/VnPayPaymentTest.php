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
use App\Models\OrderStatusHistory;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use App\Services\VnPayService;
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

class VnPayPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected string $testHashSecret = 'TESTSECRETKEYFORVNPAYHASHING1234';
    protected string $testTmnCode = 'TESTTMN01';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.vnpay.tmn_code'    => $this->testTmnCode,
            'services.vnpay.hash_secret' => $this->testHashSecret,
            'services.vnpay.url'         => 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
            'services.vnpay.return_url'  => 'http://localhost:5173/payment/vnpay/callback',
        ]);

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

    protected function createOrder(User $user, array $attributes = []): Order
    {
        $orderCode = $attributes['order_code'] ?? ('MS' . date('ymd') . strtoupper(Str::random(6)));
        unset($attributes['order_code']);

        return Order::create(array_merge([
            'order_code'       => $orderCode,
            'user_id'          => $user->id,
            'status'           => OrderStatus::Pending,
            'payment_method'   => PaymentMethod::Vnpay,
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

    protected function buildSignedVnPayPayload(array $overrideParams = []): array
    {
        $vnPayService = app(VnPayService::class);

        $params = array_merge([
            'vnp_Amount'            => '53000000',
            'vnp_BankCode'          => 'NCB',
            'vnp_BankTranNo'        => 'VNP14828111',
            'vnp_CardType'          => 'ATM',
            'vnp_OrderInfo'         => 'Thanh toan don hang',
            'vnp_PayDate'           => Carbon::now('Asia/Ho_Chi_Minh')->format('YmdHis'),
            'vnp_ResponseCode'      => '00',
            'vnp_TmnCode'           => $this->testTmnCode,
            'vnp_TransactionNo'     => '14828111',
            'vnp_TransactionStatus' => '00',
            'vnp_TxnRef'            => 'VNP_SAMPLE_REF',
        ], $overrideParams);

        $signature = $vnPayService->generateSignature($params, $this->testHashSecret);
        $params['vnp_SecureHash'] = $signature;

        return $params;
    }

    // =========================================================================
    // 1. ĐẶT ĐƠN VỚI VNPAY
    // =========================================================================

    public function test_customer_can_checkout_with_vnpay_method(): void
    {
        $user = $this->createCustomer();
        $variant = ProductVariant::where('is_active', true)->where('stock_quantity', '>=', 5)->firstOrFail();
        CartItem::create(['user_id' => $user->id, 'variant_id' => $variant->id, 'quantity' => 1]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/orders', [
            'payment_method'   => 'vnpay',
            'recipient_name'   => 'Nguyen Van A',
            'recipient_phone'  => '0912345678',
            'shipping_address' => '123 Đường CMT8, Q.3, TP.HCM',
            'note'             => 'Thanh toan online',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('order.payment_method', 'vnpay')
            ->assertJsonPath('order.payment_status', 'unpaid')
            ->assertJsonPath('order.status', 'pending');

        $this->assertDatabaseHas('orders', [
            'user_id'        => $user->id,
            'payment_method' => 'vnpay',
            'payment_status' => 'unpaid',
            'status'         => 'pending',
        ]);
    }

    // =========================================================================
    // 2. TẠO URL THANH TOÁN VNPAY (POST /api/orders/{order_code}/payment/vnpay)
    // =========================================================================

    public function test_customer_can_generate_vnpay_url_for_pending_vnpay_order(): void
    {
        $user = $this->createCustomer();
        $order = $this->createOrder($user, [
            'total_amount' => 530000,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/orders/{$order->order_code}/payment/vnpay");

        $response->assertStatus(200)
            ->assertJsonStructure(['payment_url', 'txn_ref']);

        $url = $response->json('payment_url');
        $txnRef = $response->json('txn_ref');

        $this->assertStringContainsString('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?', $url);
        $this->assertStringContainsString('vnp_TmnCode=' . $this->testTmnCode, $url);
        $this->assertStringContainsString('vnp_Amount=53000000', $url);
        $this->assertStringContainsString('vnp_TxnRef=' . $txnRef, $url);
        $this->assertStringContainsString('vnp_SecureHash=', $url);

        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'provider' => 'vnpay',
            'txn_ref'  => $txnRef,
            'amount'   => 530000,
            'status'   => 'pending',
        ]);
    }

    public function test_guest_cannot_generate_vnpay_url(): void
    {
        $user = $this->createCustomer();
        $order = $this->createOrder($user);

        $response = $this->postJson("/api/orders/{$order->order_code}/payment/vnpay");

        $response->assertStatus(401);
    }

    public function test_customer_cannot_generate_vnpay_url_for_another_customers_order(): void
    {
        $owner = $this->createCustomer();
        $otherUser = $this->createCustomer(['email' => 'other@example.com']);
        $order = $this->createOrder($owner);

        $response = $this->actingAs($otherUser, 'sanctum')
            ->postJson("/api/orders/{$order->order_code}/payment/vnpay");

        $response->assertStatus(404);
    }

    public function test_cannot_generate_vnpay_url_for_cod_order(): void
    {
        $user = $this->createCustomer();
        $order = $this->createOrder($user, ['payment_method' => PaymentMethod::Cod]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/orders/{$order->order_code}/payment/vnpay");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Đơn hàng này không sử dụng phương thức thanh toán VNPay.');
    }

    public function test_cannot_generate_vnpay_url_for_already_paid_order(): void
    {
        $user = $this->createCustomer();
        $order = $this->createOrder($user, ['payment_status' => PaymentStatus::Paid]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/orders/{$order->order_code}/payment/vnpay");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Đơn hàng này đã được thanh toán thành công.');
    }

    public function test_cannot_generate_vnpay_url_for_cancelled_order(): void
    {
        $user = $this->createCustomer();
        $order = $this->createOrder($user, ['status' => OrderStatus::Cancelled]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/orders/{$order->order_code}/payment/vnpay");

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Chỉ có thể tạo thanh toán cho đơn hàng đang chờ xử lý.');
    }

    // =========================================================================
    // 3. XÁC THỰC KẾT QUẢ VNPAY (POST /api/payment/vnpay/verify)
    // =========================================================================

    public function test_vnpay_verify_with_valid_signature_updates_payment_and_order_to_paid(): void
    {
        $user = $this->createCustomer();
        $order = $this->createOrder($user, ['total_amount' => 530000]);

        $txnRef = 'VNP' . $order->id . '123456';
        $payment = Payment::create([
            'order_id' => $order->id,
            'provider' => 'vnpay',
            'txn_ref'  => $txnRef,
            'amount'   => 530000,
            'status'   => 'pending',
        ]);

        $payload = $this->buildSignedVnPayPayload([
            'vnp_TxnRef'            => $txnRef,
            'vnp_Amount'            => '53000000',
            'vnp_ResponseCode'      => '00',
            'vnp_TransactionStatus' => '00',
            'vnp_BankCode'          => 'NCB',
            'vnp_TransactionNo'     => '99887766',
        ]);

        // Verify là endpoint public, không cần actingAs
        $response = $this->postJson('/api/payment/vnpay/verify', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('order_code', $order->order_code)
            ->assertJsonPath('amount', 530000)
            ->assertJsonPath('bank_code', 'NCB')
            ->assertJsonPath('provider_transaction_no', '99887766');

        $payment->refresh();
        $this->assertEquals('success', $payment->status);
        $this->assertEquals('NCB', $payment->bank_code);
        $this->assertEquals('99887766', $payment->provider_transaction_no);
        $this->assertNotNull($payment->paid_at);

        $order->refresh();
        $this->assertEquals(PaymentStatus::Paid, $order->payment_status);
        $this->assertNotNull($order->paid_at);

        $this->assertDatabaseHas('order_status_histories', [
            'order_id' => $order->id,
            'reason'   => 'Thanh toán VNPay thành công (mã GD: 99887766, ngân hàng: NCB)',
        ]);
    }

    public function test_vnpay_verify_rejects_invalid_signature_with_400(): void
    {
        $payload = $this->buildSignedVnPayPayload();
        $payload['vnp_SecureHash'] = 'INVALIDSIGNATUREHASH123456789';

        $response = $this->postJson('/api/payment/vnpay/verify', $payload);

        $response->assertStatus(400)
            ->assertJsonPath('status', 'invalid_signature')
            ->assertJsonPath('message', 'Chữ ký giao dịch không hợp lệ.');
    }

    public function test_vnpay_verify_rejects_mismatched_tmn_code_with_400(): void
    {
        $payload = $this->buildSignedVnPayPayload([
            'vnp_TmnCode' => 'WRONGTMNCODE999',
        ]);

        $response = $this->postJson('/api/payment/vnpay/verify', $payload);

        $response->assertStatus(400)
            ->assertJsonPath('status', 'invalid_tmn_code')
            ->assertJsonPath('message', 'Mã website merchant (vnp_TmnCode) không hợp lệ.');
    }

    public function test_vnpay_verify_returns_404_when_txn_ref_not_found(): void
    {
        $payload = $this->buildSignedVnPayPayload([
            'vnp_TxnRef' => 'VNP_NONEXISTENT_REF',
        ]);

        $response = $this->postJson('/api/payment/vnpay/verify', $payload);

        $response->assertStatus(404)
            ->assertJsonPath('status', 'not_found');
    }

    public function test_vnpay_verify_rejects_amount_mismatch_with_422(): void
    {
        $user = $this->createCustomer();
        $order = $this->createOrder($user, ['total_amount' => 530000]);

        $txnRef = 'VNP' . $order->id . 'AMOUNTMISMATCH';
        $payment = Payment::create([
            'order_id' => $order->id,
            'provider' => 'vnpay',
            'txn_ref'  => $txnRef,
            'amount'   => 530000,
            'status'   => 'pending',
        ]);

        // Giả sử VNPay trả về số tiền chỉ có 200,000 VND (20,000,000 cents)
        $payload = $this->buildSignedVnPayPayload([
            'vnp_TxnRef' => $txnRef,
            'vnp_Amount' => '20000000',
        ]);

        $response = $this->postJson('/api/payment/vnpay/verify', $payload);

        $response->assertStatus(422)
            ->assertJsonPath('status', 'amount_mismatch')
            ->assertJsonPath('message', 'Số tiền giao dịch không khớp với đơn hàng.');

        $payment->refresh();
        $this->assertEquals('failed', $payment->status);

        $order->refresh();
        $this->assertEquals(PaymentStatus::Unpaid, $order->payment_status);
    }

    public function test_vnpay_verify_is_idempotent_when_called_multiple_times(): void
    {
        $user = $this->createCustomer();
        $order = $this->createOrder($user, ['total_amount' => 530000]);

        $txnRef = 'VNP' . $order->id . 'IDEMPOTENT';
        Payment::create([
            'order_id' => $order->id,
            'provider' => 'vnpay',
            'txn_ref'  => $txnRef,
            'amount'   => 530000,
            'status'   => 'pending',
        ]);

        $payload = $this->buildSignedVnPayPayload([
            'vnp_TxnRef'        => $txnRef,
            'vnp_Amount'        => '53000000',
            'vnp_ResponseCode'  => '00',
            'vnp_TransactionNo' => '11223344',
        ]);

        // Lần gọi 1 (người dùng vừa thanh toán xong)
        $res1 = $this->postJson('/api/payment/vnpay/verify', $payload);
        $res1->assertStatus(200)->assertJsonPath('status', 'success');

        $initialHistoriesCount = OrderStatusHistory::where('order_id', $order->id)->count();
        $this->assertEquals(1, $initialHistoriesCount);

        // Lần gọi 2 (React StrictMode gọi lặp lại hoặc người dùng F5)
        $res2 = $this->postJson('/api/payment/vnpay/verify', $payload);
        $res2->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('message', 'Giao dịch đã được xác nhận thành công trước đó.');

        // Không sinh thêm bản ghi lịch sử thứ 2
        $finalHistoriesCount = OrderStatusHistory::where('order_id', $order->id)->count();
        $this->assertEquals(1, $finalHistoriesCount);
    }

    public function test_vnpay_verify_handles_customer_cancellation_code_24(): void
    {
        $user = $this->createCustomer();
        $order = $this->createOrder($user, ['total_amount' => 530000]);

        $txnRef = 'VNP' . $order->id . 'CANCELLED_BY_USER';
        $payment = Payment::create([
            'order_id' => $order->id,
            'provider' => 'vnpay',
            'txn_ref'  => $txnRef,
            'amount'   => 530000,
            'status'   => 'pending',
        ]);

        $payload = $this->buildSignedVnPayPayload([
            'vnp_TxnRef'            => $txnRef,
            'vnp_Amount'            => '53000000',
            'vnp_ResponseCode'      => '24',
            'vnp_TransactionStatus' => '02',
        ]);

        $response = $this->postJson('/api/payment/vnpay/verify', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'failed')
            ->assertJsonPath('response_code', '24')
            ->assertJsonPath('message', 'Giao dịch bị hủy bởi khách hàng.');

        $payment->refresh();
        $this->assertEquals('failed', $payment->status);

        $order->refresh();
        $this->assertEquals(PaymentStatus::Unpaid, $order->payment_status);
        $this->assertEquals(OrderStatus::Pending, $order->status);
    }

    public function test_customer_can_retry_payment_url_generation_after_failed_or_cancelled_payment_with_new_txn_ref(): void
    {
        $user = $this->createCustomer();
        $order = $this->createOrder($user, ['total_amount' => 530000]);

        // Lần 1: Tạo URL thanh toán
        $res1 = $this->actingAs($user, 'sanctum')->postJson("/api/orders/{$order->order_code}/payment/vnpay");
        $res1->assertStatus(200);
        $firstTxnRef = $res1->json('txn_ref');

        // Giả lập khách hủy ở cổng VNPay (code 24)
        $verifyPayload = $this->buildSignedVnPayPayload([
            'vnp_TxnRef'            => $firstTxnRef,
            'vnp_Amount'            => '53000000',
            'vnp_ResponseCode'      => '24',
            'vnp_TransactionStatus' => '02',
        ]);
        $this->postJson('/api/payment/vnpay/verify', $verifyPayload)->assertStatus(200);

        // Bản ghi 1 đã failed, đơn vẫn pending & unpaid
        $this->assertDatabaseHas('payments', ['txn_ref' => $firstTxnRef, 'status' => 'failed']);
        $order->refresh();
        $this->assertEquals(OrderStatus::Pending, $order->status);
        $this->assertEquals(PaymentStatus::Unpaid, $order->payment_status);

        // Lần 2: Khách bấm "Thanh toán lại" -> sinh URL mới với txn_ref MỚI độc nhất
        $res2 = $this->actingAs($user, 'sanctum')->postJson("/api/orders/{$order->order_code}/payment/vnpay");
        $res2->assertStatus(200);
        $secondTxnRef = $res2->json('txn_ref');

        $this->assertNotEquals($firstTxnRef, $secondTxnRef);
        $this->assertDatabaseCount('payments', 2);
        $this->assertDatabaseHas('payments', ['txn_ref' => $secondTxnRef, 'status' => 'pending']);
    }

    public function test_vnpay_verify_abnormal_success_on_already_cancelled_order(): void
    {
        $user = $this->createCustomer();
        // Đơn hàng đã bị hủy trước khi verify trả về
        $order = $this->createOrder($user, [
            'total_amount' => 530000,
            'status'       => OrderStatus::Cancelled,
        ]);

        $txnRef = 'VNP' . $order->id . 'ABNORMAL_CANCELLED';
        $payment = Payment::create([
            'order_id' => $order->id,
            'provider' => 'vnpay',
            'txn_ref'  => $txnRef,
            'amount'   => 530000,
            'status'   => 'pending',
        ]);

        $payload = $this->buildSignedVnPayPayload([
            'vnp_TxnRef'        => $txnRef,
            'vnp_Amount'        => '53000000',
            'vnp_ResponseCode'  => '00',
            'vnp_TransactionNo' => 'TXN_CANCELLED_ORDER',
        ]);

        $response = $this->postJson('/api/payment/vnpay/verify', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success_abnormal')
            ->assertJsonPath('message', 'Giao dịch thành công nhưng đơn hàng đã bị hủy trước đó. Cần hoàn tiền thủ công.');

        $payment->refresh();
        $this->assertEquals('success', $payment->status);

        $order->refresh();
        // Đơn hàng vẫn giữ nguyên trạng thái Cancelled
        $this->assertEquals(OrderStatus::Cancelled, $order->status);

        $this->assertDatabaseHas('order_status_histories', [
            'order_id' => $order->id,
            'reason'   => 'Giao dịch TXN_CANCELLED_ORDER thành công sau khi đơn đã hủy, cần hoàn tiền thủ công',
        ]);
    }

    public function test_vnpay_verify_abnormal_success_on_already_paid_order_duplicate(): void
    {
        $user = $this->createCustomer();
        // Đơn hàng đã có thanh toán Paid trước đó
        $order = $this->createOrder($user, [
            'total_amount'   => 530000,
            'payment_status' => PaymentStatus::Paid,
            'paid_at'        => now()->subHour(),
        ]);

        $txnRef = 'VNP' . $order->id . 'ABNORMAL_DUPLICATE';
        $payment = Payment::create([
            'order_id' => $order->id,
            'provider' => 'vnpay',
            'txn_ref'  => $txnRef,
            'amount'   => 530000,
            'status'   => 'pending',
        ]);

        $payload = $this->buildSignedVnPayPayload([
            'vnp_TxnRef'        => $txnRef,
            'vnp_Amount'        => '53000000',
            'vnp_ResponseCode'  => '00',
            'vnp_TransactionNo' => 'TXN_DUPLICATE_ORDER',
        ]);

        $response = $this->postJson('/api/payment/vnpay/verify', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success_abnormal')
            ->assertJsonPath('message', 'Giao dịch thành công nhưng đơn hàng đã được thanh toán trước đó (trùng giao dịch). Cần hoàn tiền thủ công.');

        $payment->refresh();
        $this->assertEquals('success', $payment->status);

        $this->assertDatabaseHas('order_status_histories', [
            'order_id' => $order->id,
            'reason'   => 'Giao dịch TXN_DUPLICATE_ORDER thành công nhưng đơn đã được thanh toán trước đó (trùng giao dịch), cần hoàn tiền thủ công',
        ]);
    }

    // =========================================================================
    // 4. HỦY ĐƠN VÀ PHÂN QUYỀN CHUYỂN TRẠNG THÁI
    // =========================================================================

    public function test_customer_cannot_cancel_paid_vnpay_order(): void
    {
        $user = $this->createCustomer();
        $order = $this->createOrder($user, [
            'payment_status' => PaymentStatus::Paid,
            'status'         => OrderStatus::Pending,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/orders/{$order->order_code}/cancel", [
                'reason' => 'Doi y khong mua',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Không thể hủy đơn hàng đã thanh toán trực tuyến. Vui lòng liên hệ bộ phận hỗ trợ.');
    }

    public function test_customer_can_cancel_unpaid_vnpay_order(): void
    {
        $user = $this->createCustomer();
        $order = $this->createOrder($user, [
            'payment_status' => PaymentStatus::Unpaid,
            'status'         => OrderStatus::Pending,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/orders/{$order->order_code}/cancel", [
                'reason' => 'Khong muon thanh toan nua',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('order.status', 'cancelled');

        $order->refresh();
        $this->assertEquals(OrderStatus::Cancelled, $order->status);
    }

    public function test_admin_cannot_transition_unpaid_vnpay_order_to_confirmed_shipping_or_delivered(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $order = $this->createOrder($customer, [
            'payment_method' => PaymentMethod::Vnpay,
            'payment_status' => PaymentStatus::Unpaid,
            'status'         => OrderStatus::Pending,
        ]);

        // Thử chuyển sang confirmed -> phải bị chặn 422
        $resConfirmed = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->order_code}/status", [
                'status' => 'confirmed',
            ]);

        $resConfirmed->assertStatus(422)
            ->assertJsonPath('message', 'Đơn hàng thanh toán qua VNPay chưa hoàn tất thanh toán. Không thể xử lý đơn hàng.');

        // Thử chuyển sang shipping -> phải bị chặn 422
        $resShipping = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->order_code}/status", [
                'status' => 'shipping',
            ]);

        $resShipping->assertStatus(422)
            ->assertJsonPath('message', 'Đơn hàng thanh toán qua VNPay chưa hoàn tất thanh toán. Không thể xử lý đơn hàng.');
    }

    public function test_admin_can_transition_paid_vnpay_order_to_confirmed(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $order = $this->createOrder($customer, [
            'payment_method' => PaymentMethod::Vnpay,
            'payment_status' => PaymentStatus::Paid,
            'paid_at'        => now(),
            'status'         => OrderStatus::Pending,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->order_code}/status", [
                'status' => 'confirmed',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('order.status', 'confirmed');

        $order->refresh();
        $this->assertEquals(OrderStatus::Confirmed, $order->status);
    }

    public function test_admin_can_cancel_unpaid_or_paid_vnpay_order(): void
    {
        $admin = $this->createAdmin();
        $customer = $this->createCustomer();
        $order = $this->createOrder($customer, [
            'payment_method' => PaymentMethod::Vnpay,
            'payment_status' => PaymentStatus::Unpaid,
            'status'         => OrderStatus::Pending,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/orders/{$order->order_code}/status", [
                'status' => 'cancelled',
                'reason' => 'Khách gọi điện nhờ hủy',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('order.status', 'cancelled');

        $order->refresh();
        $this->assertEquals(OrderStatus::Cancelled, $order->status);
    }

    // =========================================================================
    // 5. AN TOÀN DỮ LIỆU: KHÔNG LỘ HASH/RAW_RESPONSE QUA API
    // =========================================================================

    public function test_order_resources_expose_only_safe_payment_details(): void
    {
        $customer = $this->createCustomer();
        $admin = $this->createAdmin();
        $order = $this->createOrder($customer, [
            'payment_method' => PaymentMethod::Vnpay,
            'payment_status' => PaymentStatus::Paid,
            'paid_at'        => now(),
        ]);

        Payment::create([
            'order_id'                => $order->id,
            'provider'                => 'vnpay',
            'txn_ref'                 => 'SAFE_REF_123',
            'amount'                  => 530000,
            'status'                  => 'success',
            'bank_code'               => 'NCB',
            'provider_transaction_no' => '999888',
            'raw_response'            => ['secret_field' => 'should_be_hidden', 'vnp_SecureHash' => 'secret_hash'],
            'paid_at'                 => now(),
        ]);

        // Customer show
        $customerRes = $this->actingAs($customer, 'sanctum')
            ->getJson("/api/orders/{$order->order_code}");

        $customerRes->assertStatus(200)
            ->assertJsonPath('order.payment_details.provider', 'vnpay')
            ->assertJsonPath('order.payment_details.txn_ref', 'SAFE_REF_123')
            ->assertJsonPath('order.payment_details.bank_code', 'NCB')
            ->assertJsonMissingPath('order.payment_details.raw_response')
            ->assertJsonMissingPath('order.payment_details.vnp_SecureHash');

        // Admin show
        $adminRes = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/orders/{$order->order_code}");

        $adminRes->assertStatus(200)
            ->assertJsonPath('order.payment_details.provider', 'vnpay')
            ->assertJsonPath('order.payment_details.txn_ref', 'SAFE_REF_123')
            ->assertJsonMissingPath('order.payment_details.raw_response')
            ->assertJsonMissingPath('order.payment_details.vnp_SecureHash');
    }
}
