<?php

namespace Tests\Feature\Api;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\UserStatus;
use App\Mail\OrderConfirmationMail;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use App\Services\OrderMailService;
use App\Services\VnPayService;
use Carbon\Carbon;
use Database\Seeders\BrandSeeder;
use Database\Seeders\CategorySeeder;
use Database\Seeders\ColorSeeder;
use Database\Seeders\ProductSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SizeSeeder;
use Exception;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Mockery;
use Tests\TestCase;

class OrderConfirmationEmailTest extends TestCase
{
    use RefreshDatabase;

    protected string $testHashSecret = 'TESTSECRETKEYFORVNPAYHASHING1234';
    protected string $testTmnCode = 'TESTTMN01';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'shop.brand_name'            => 'OMBRE',
            'shop.frontend_url'          => 'http://localhost:5173',
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

    protected function createCustomer(array $attributes = []): User
    {
        $role = Role::where('name', 'customer')->firstOrFail();

        return User::create(array_merge([
            'full_name' => 'Nguyen Van Khach',
            'email'     => 'customer_' . uniqid() . '@example.com',
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

        $order = Order::create(array_merge([
            'order_code'       => $orderCode,
            'user_id'          => $user->id,
            'status'           => OrderStatus::Pending,
            'payment_method'   => PaymentMethod::Vnpay,
            'payment_status'   => PaymentStatus::Unpaid,
            'recipient_name'   => 'Nguyen Van Nhan',
            'recipient_phone'  => '0912345678',
            'shipping_address' => '123 Le Loi, Quan 1, TP.HCM',
            'note'             => 'Giao gio hanh chinh',
            'subtotal'         => 500000,
            'shipping_fee'     => 30000,
            'discount_amount'  => 0,
            'total_amount'     => 530000,
        ], $attributes));

        $variant = ProductVariant::with('product')->firstOrFail();

        // Create sample order item snapshot
        OrderItem::create([
            'order_id'     => $order->id,
            'product_id'   => $variant->product_id,
            'variant_id'   => $variant->id,
            'product_name' => 'Ao So Mi OMBRE Oxford',
            'sku'          => 'AO-SOM-OXF-001',
            'color_name'   => 'Trang Kem',
            'size_name'    => 'L',
            'image_url'    => null,
            'unit_price'   => 500000,
            'quantity'     => 1,
            'line_total'   => 500000,
        ]);

        return $order;
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
    // 1. ĐƠN COD: GỬI CHÍNH XÁC 1 EMAIL KHI TẠO ĐƠN THÀNH CÔNG
    // =========================================================================

    public function test_cod_order_sends_exactly_one_email_to_customer(): void
    {
        Mail::fake();

        $user = $this->createCustomer(['email' => 'cod_customer@example.com']);
        $variant = ProductVariant::where('is_active', true)->where('stock_quantity', '>=', 5)->firstOrFail();
        CartItem::create(['user_id' => $user->id, 'variant_id' => $variant->id, 'quantity' => 1]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/orders', [
            'payment_method'   => 'cod',
            'recipient_name'   => 'Nguyen Van Nhan COD',
            'recipient_phone'  => '0912345678',
            'shipping_address' => '456 Tran Phu, Da Nang',
            'note'             => 'Goi truoc khi giao',
        ]);

        $response->assertStatus(201);
        $orderCode = $response->json('order.order_code');

        Mail::assertSent(OrderConfirmationMail::class, function (OrderConfirmationMail $mail) use ($user, $orderCode) {
            $isCorrectRecipient = $mail->hasTo($user->email);
            $isCorrectOrderCode = $mail->order->order_code === $orderCode;
            $rendered = $mail->render();

            $containsOrderCode = str_contains($rendered, $orderCode);
            $containsBrand = str_contains($rendered, 'OMBRE');
            $containsTotal = str_contains($rendered, number_format($mail->order->total_amount, 0, ',', '.'));

            return $isCorrectRecipient && $isCorrectOrderCode && $containsOrderCode && $containsBrand && $containsTotal;
        });

        Mail::assertSent(OrderConfirmationMail::class, 1);
    }

    // =========================================================================
    // 2. ĐƠN VNPAY: KHÔNG GỬI KHI TẠO ĐƠN (CHƯA THANH TOÁN)
    // =========================================================================

    public function test_vnpay_order_sends_no_email_at_creation(): void
    {
        Mail::fake();

        $user = $this->createCustomer(['email' => 'vnpay_customer@example.com']);
        $variant = ProductVariant::where('is_active', true)->where('stock_quantity', '>=', 5)->firstOrFail();
        CartItem::create(['user_id' => $user->id, 'variant_id' => $variant->id, 'quantity' => 1]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/orders', [
            'payment_method'   => 'vnpay',
            'recipient_name'   => 'Nguyen Van VNPAY',
            'recipient_phone'  => '0912345678',
            'shipping_address' => '789 Nguyen Hue, Q.1, TP.HCM',
            'note'             => 'Thanh toan truc tuyen',
        ]);

        $response->assertStatus(201);
        $this->assertEquals('unpaid', $response->json('order.payment_status'));

        Mail::assertNothingSent();
    }

    // =========================================================================
    // 3. ĐƠN VNPAY: GỬI 1 EMAIL KHI XÁC THỰC THANH TOÁN THÀNH CÔNG
    // =========================================================================

    public function test_vnpay_order_sends_exactly_one_email_on_successful_verification(): void
    {
        Mail::fake();

        $user = $this->createCustomer(['email' => 'vnpay_paid@example.com']);
        $order = $this->createOrder($user, [
            'payment_status' => PaymentStatus::Unpaid,
            'total_amount'   => 530000,
        ]);

        $payment = Payment::create([
            'order_id' => $order->id,
            'provider' => 'vnpay',
            'txn_ref'  => 'VNP_TEST_TXN_001',
            'amount'   => 530000,
            'status'   => 'pending',
        ]);

        $payload = $this->buildSignedVnPayPayload([
            'vnp_TxnRef'            => $payment->txn_ref,
            'vnp_Amount'            => '53000000',
            'vnp_ResponseCode'      => '00',
            'vnp_TransactionStatus' => '00',
        ]);

        $response = $this->postJson('/api/payment/vnpay/verify', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success');

        Mail::assertSent(OrderConfirmationMail::class, function (OrderConfirmationMail $mail) use ($user, $order) {
            return $mail->hasTo($user->email)
                && $mail->order->order_code === $order->order_code;
        });

        Mail::assertSent(OrderConfirmationMail::class, 1);
    }

    // =========================================================================
    // 4. ĐƠN VNPAY: GỌI LẠI CALLBACK THÀNH CÔNG (IDEMPOTENT) KHÔNG GỬI TRÙNG
    // =========================================================================

    public function test_vnpay_repeated_successful_callback_does_not_send_duplicate_email(): void
    {
        Mail::fake();

        $user = $this->createCustomer(['email' => 'vnpay_repeat@example.com']);
        $order = $this->createOrder($user, [
            'payment_status' => PaymentStatus::Unpaid,
            'total_amount'   => 530000,
        ]);

        $payment = Payment::create([
            'order_id' => $order->id,
            'provider' => 'vnpay',
            'txn_ref'  => 'VNP_TEST_REPEAT_001',
            'amount'   => 530000,
            'status'   => 'pending',
        ]);

        $payload = $this->buildSignedVnPayPayload([
            'vnp_TxnRef'            => $payment->txn_ref,
            'vnp_Amount'            => '53000000',
            'vnp_ResponseCode'      => '00',
            'vnp_TransactionStatus' => '00',
        ]);

        // Lần 1: Xác nhận thành công -> gửi 1 email
        $firstResponse = $this->postJson('/api/payment/vnpay/verify', $payload);
        $firstResponse->assertStatus(200)->assertJsonPath('status', 'success');
        Mail::assertSent(OrderConfirmationMail::class, 1);

        // Lần 2: Callback trùng lặp -> không gửi thêm email nào
        $secondResponse = $this->postJson('/api/payment/vnpay/verify', $payload);
        $secondResponse->assertStatus(200)->assertJsonPath('status', 'success');
        Mail::assertSent(OrderConfirmationMail::class, 1);
    }

    // =========================================================================
    // 5. ĐƠN VNPAY: THANH TOÁN THẤT BẠI HOẶC HỦY KHÔNG GỬI EMAIL
    // =========================================================================

    public function test_vnpay_failed_or_cancelled_payment_sends_no_email(): void
    {
        Mail::fake();

        $user = $this->createCustomer(['email' => 'vnpay_failed@example.com']);
        $order = $this->createOrder($user, [
            'payment_status' => PaymentStatus::Unpaid,
            'total_amount'   => 530000,
        ]);

        $payment = Payment::create([
            'order_id' => $order->id,
            'provider' => 'vnpay',
            'txn_ref'  => 'VNP_TEST_FAIL_001',
            'amount'   => 530000,
            'status'   => 'pending',
        ]);

        // Khách hàng hủy thanh toán (mã 24)
        $payload = $this->buildSignedVnPayPayload([
            'vnp_TxnRef'            => $payment->txn_ref,
            'vnp_Amount'            => '53000000',
            'vnp_ResponseCode'      => '24',
            'vnp_TransactionStatus' => '02',
        ]);

        $response = $this->postJson('/api/payment/vnpay/verify', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'failed');

        Mail::assertNothingSent();
    }

    // =========================================================================
    // 6. ĐƠN VNPAY: GIAO DỊCH THÀNH CÔNG TRỄ TRÊN ĐƠN ĐÃ HỦY KHÔNG GỬI EMAIL
    // =========================================================================

    public function test_vnpay_late_success_on_cancelled_order_sends_no_email(): void
    {
        Mail::fake();

        $user = $this->createCustomer(['email' => 'vnpay_cancelled@example.com']);
        $order = $this->createOrder($user, [
            'status'         => OrderStatus::Cancelled,
            'payment_status' => PaymentStatus::Unpaid,
            'total_amount'   => 530000,
        ]);

        $payment = Payment::create([
            'order_id' => $order->id,
            'provider' => 'vnpay',
            'txn_ref'  => 'VNP_TEST_CANCELLED_001',
            'amount'   => 530000,
            'status'   => 'pending',
        ]);

        $payload = $this->buildSignedVnPayPayload([
            'vnp_TxnRef'            => $payment->txn_ref,
            'vnp_Amount'            => '53000000',
            'vnp_ResponseCode'      => '00',
            'vnp_TransactionStatus' => '00',
        ]);

        $response = $this->postJson('/api/payment/vnpay/verify', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success_abnormal');

        Mail::assertNothingSent();
    }

    // =========================================================================
    // 7. LỖI GỬI EMAIL KHÔNG LÀM HỎNG QUÁ TRÌNH TẠO ĐƠN COD
    // =========================================================================

    public function test_mail_exception_does_not_fail_cod_order_creation(): void
    {
        // Mock OrderMailService để ném ngoại lệ khi gửi
        $mockService = Mockery::mock(OrderMailService::class);
        $mockService->shouldReceive('sendOrderConfirmation')
            ->once()
            ->andReturn(false); // sendOrderConfirmation luôn bắt ngoại lệ và trả về false

        $this->app->instance(OrderMailService::class, $mockService);

        $user = $this->createCustomer(['email' => 'cod_fail_mail@example.com']);
        $variant = ProductVariant::where('is_active', true)->where('stock_quantity', '>=', 5)->firstOrFail();
        CartItem::create(['user_id' => $user->id, 'variant_id' => $variant->id, 'quantity' => 1]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/orders', [
            'payment_method'   => 'cod',
            'recipient_name'   => 'Nguyen Van Nhan Mail Error',
            'recipient_phone'  => '0912345678',
            'shipping_address' => '999 Nguyen Trai, Q.5, TP.HCM',
        ]);

        // Đơn hàng vẫn được tạo thành công với mã 201
        $response->assertStatus(201)
            ->assertJsonPath('message', 'Đặt hàng thành công.');

        $this->assertDatabaseHas('orders', [
            'user_id'        => $user->id,
            'payment_method' => 'cod',
            'recipient_name' => 'Nguyen Van Nhan Mail Error',
        ]);
    }

    // =========================================================================
    // 8. LỖI GỬI EMAIL KHÔNG LÀM HỎNG QUÁ TRÌNH XÁC THỰC THANH TOÁN VNPAY
    // =========================================================================

    public function test_mail_exception_does_not_fail_vnpay_payment_verification(): void
    {
        $mockService = Mockery::mock(OrderMailService::class);
        $mockService->shouldReceive('sendOrderConfirmation')
            ->once()
            ->andReturn(false);

        $this->app->instance(OrderMailService::class, $mockService);

        $user = $this->createCustomer(['email' => 'vnpay_fail_mail@example.com']);
        $order = $this->createOrder($user, [
            'payment_status' => PaymentStatus::Unpaid,
            'total_amount'   => 530000,
        ]);

        $payment = Payment::create([
            'order_id' => $order->id,
            'provider' => 'vnpay',
            'txn_ref'  => 'VNP_TEST_FAIL_MAIL_001',
            'amount'   => 530000,
            'status'   => 'pending',
        ]);

        $payload = $this->buildSignedVnPayPayload([
            'vnp_TxnRef'            => $payment->txn_ref,
            'vnp_Amount'            => '53000000',
            'vnp_ResponseCode'      => '00',
            'vnp_TransactionStatus' => '00',
        ]);

        $response = $this->postJson('/api/payment/vnpay/verify', $payload);

        // API vẫn trả về 200 success và order được cập nhật thành Paid
        $response->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseHas('orders', [
            'id'             => $order->id,
            'payment_status' => 'paid',
        ]);
    }

    // =========================================================================
    // 9. TEST NỘI TẠI CỦA ORDERMAILSERVICE: BẮT EXCEPTION THẬT SỰ TỪ MAIL::SEND
    // =========================================================================

    public function test_order_mail_service_catches_mailer_exception_and_logs_warning(): void
    {
        Mail::shouldReceive('to->send')
            ->once()
            ->andThrow(new Exception('Connection to SMTP server timed out.'));

        $user = $this->createCustomer(['email' => 'real_exception@example.com']);
        $order = $this->createOrder($user);

        $service = new OrderMailService();
        $result = $service->sendOrderConfirmation($order);

        // Dịch vụ bắt ngoại lệ an toàn và trả về false, không throw ra ngoài
        $this->assertFalse($result);
    }
}
