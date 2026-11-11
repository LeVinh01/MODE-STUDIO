<?php

namespace Database\Seeders;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\UserStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoOrderSeeder extends Seeder
{
    /**
     * Seeder dữ liệu mẫu cho Dashboard Admin
     * Chỉ chạy thủ công qua: php artisan db:seed --class=DemoOrderSeeder
     */
    public function run(): void
    {
        // 1. Cố định seed ngẫu nhiên để kết quả hoàn toàn lặp lại được
        mt_srand(20261111);

        // 2. IDEMPOTENT: Dọn dẹp dữ liệu demo cũ (nhận diện qua mã DEMO- và email @demo.local)
        $demoOrderIds = Order::where('order_code', 'LIKE', 'DEMO-%')->pluck('id');
        if ($demoOrderIds->isNotEmpty()) {
            OrderStatusHistory::whereIn('order_id', $demoOrderIds)->delete();
            OrderItem::whereIn('order_id', $demoOrderIds)->delete();
            Order::whereIn('id', $demoOrderIds)->delete();
        }

        $demoUsers = User::where('email', 'LIKE', '%@demo.local')->get();
        foreach ($demoUsers as $user) {
            $user->cartItems()->delete();
            $user->tokens()->delete();
            $user->delete();
        }

        // 3. Chuẩn bị Role & Sản phẩm/Biến thể thật
        $customerRole = Role::where('name', 'customer')->firstOrFail();
        $adminUser = User::whereHas('role', fn ($q) => $q->where('name', 'admin'))->first();
        $adminId = $adminUser?->id;

        $variants = ProductVariant::withoutTrashed()
            ->where('is_active', true)
            ->whereHas('product', fn ($q) => $q->withoutTrashed()->where('status', 'active'))
            ->with(['product.mainImage', 'product.images', 'color', 'size'])
            ->get();

        if ($variants->isEmpty()) {
            $this->command->warn('Không tìm thấy biến thể sản phẩm hợp lệ để tạo order_items. Hãy chạy ProductSeeder trước.');
            return;
        }

        // Lấy ngưỡng freeship và phí ship chuẩn từ cấu hình
        $freeShippingThreshold = (int) config('shop.shipping.free_threshold', 2000000);
        $standardShippingFee = (int) config('shop.shipping.standard_fee', 30000);

        // 4. Tạo 10 khách hàng demo với thông tin tiếng Việt thật
        $demoCustomerProfiles = [
            ['name' => 'Lê Thu Hà', 'phone' => '0903112233', 'address' => '45 Nguyễn Thị Minh Khai, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh'],
            ['name' => 'Trần Hoàng Nam', 'phone' => '0918223344', 'address' => '12 Kim Mã, Phường Kim Mã, Quận Ba Đình, Hà Nội'],
            ['name' => 'Phạm Minh Trang', 'phone' => '0987334455', 'address' => '88 Nguyễn Văn Linh, Phường Nam Dương, Quận Hải Châu, Đà Nẵng'],
            ['name' => 'Đặng Quốc Bảo', 'phone' => '0976445566', 'address' => '234 Hai Bà Trưng, Phường Tân Định, Quận 1, TP. Hồ Chí Minh'],
            ['name' => 'Vũ Mai Linh', 'phone' => '0935556677', 'address' => '67 Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy, Hà Nội'],
            ['name' => 'Ngô Tiến Đạt', 'phone' => '0944667788', 'address' => '15 Pasteur, Phường 6, Quận 3, TP. Hồ Chí Minh'],
            ['name' => 'Hoàng Bích Ngọc', 'phone' => '0923778899', 'address' => '320 Trần Phú, Phường Phước Vĩnh, TP. Huế, Thừa Thiên Huế'],
            ['name' => 'Bùi Gia Huy', 'phone' => '0962889900', 'address' => '102 Lê Hồng Phong, Phường 4, TP. Vũng Tàu, Bà Rịa - Vũng Tàu'],
            ['name' => 'Đỗ Phương Uyên', 'phone' => '0911990011', 'address' => '54 Phan Chu Trinh, Phường Vạn Thắng, TP. Nha Trang, Khánh Hòa'],
            ['name' => 'Nguyễn Thanh Tùng', 'phone' => '0989001122', 'address' => '28 Lý Tự Trọng, Phường An Cư, Quận Ninh Kiều, Cần Thơ'],
        ];

        $nowVn = Carbon::now('Asia/Ho_Chi_Minh');
        $createdUsers = [];

        foreach ($demoCustomerProfiles as $index => $profile) {
            $userNum = $index + 1;
            // Khách được tạo rải từ 45 ngày trước đến gần đây
            $daysAgo = mt_rand(5, 44);
            $userCreatedAt = $nowVn->copy()->subDays($daysAgo)->subHours(mt_rand(1, 15))->setTimezone('UTC');

            $user = User::create([
                'full_name'         => $profile['name'],
                'email'             => "demo_customer_{$userNum}@demo.local",
                'phone'             => $profile['phone'],
                'password'          => Hash::make('Demo@123456'),
                'role_id'           => $customerRole->id,
                'status'            => UserStatus::Active,
                'email_verified_at' => $userCreatedAt,
                'created_at'        => $userCreatedAt,
                'updated_at'        => $userCreatedAt,
            ]);

            $createdUsers[] = [
                'user'    => $user,
                'profile' => $profile,
            ];
        }

        // 5. Chuẩn bị kế hoạch đơn hàng rải đều 45 ngày theo tuổi đơn
        // Định nghĩa rõ số lượng trạng thái cho 5 ngày gần nhất (dayOffset 0..4) để demo luồng xử lý:
        // Ngày 0 (hôm nay): 4 pending, 1 confirmed
        // Ngày 1: 2 pending, 2 confirmed, 1 cancelled
        // Ngày 2: 1 confirmed, 1 shipping, 1 delivered
        // Ngày 3: 2 shipping, 1 delivered
        // Ngày 4: 1 shipping, 2 delivered
        // -> Tổng cộng ngày 0-4: 6 pending, 4 confirmed, 4 shipping, 4 delivered, 1 cancelled
        $recentDaysSchedule = [
            0 => [OrderStatus::Pending, OrderStatus::Pending, OrderStatus::Pending, OrderStatus::Pending, OrderStatus::Confirmed],
            1 => [OrderStatus::Pending, OrderStatus::Pending, OrderStatus::Confirmed, OrderStatus::Confirmed, OrderStatus::Cancelled],
            2 => [OrderStatus::Confirmed, OrderStatus::Shipping, OrderStatus::Delivered],
            3 => [OrderStatus::Shipping, OrderStatus::Shipping, OrderStatus::Delivered],
            4 => [OrderStatus::Shipping, OrderStatus::Delivered, OrderStatus::Delivered],
        ];

        $cancelReasons = [
            'Khách hàng đổi ý muốn chọn màu sắc khác',
            'Trùng đơn hàng đã đặt trước đó',
            'Không liên lạc được số điện thoại người nhận',
            'Thời gian giao hàng dự kiến không phù hợp',
            'Khách đặt nhầm kích cỡ sản phẩm',
        ];

        $orderCounter = 1;

        // Lặp 45 ngày từ quá khứ (44 ngày trước) đến hiện tại (ngày 0)
        for ($dayOffset = 44; $dayOffset >= 0; $dayOffset--) {
            // Xác định danh sách trạng thái cho ngày này
            if ($dayOffset < 5) {
                $dayStatuses = $recentDaysSchedule[$dayOffset];
            } else {
                // Đơn cũ hơn 5 ngày CHỈ có thể là delivered (92%) hoặc cancelled (8%)
                $ordersInDay = mt_rand(1, 3);
                $dayStatuses = [];
                for ($k = 0; $k < $ordersInDay; $k++) {
                    $dayStatuses[] = (mt_rand(1, 100) <= 92) ? OrderStatus::Delivered : OrderStatus::Cancelled;
                }
            }

            foreach ($dayStatuses as $status) {
                // Chọn ngẫu nhiên khách hàng
                $customerData = $createdUsers[mt_rand(0, count($createdUsers) - 1)];
                $customer = $customerData['user'];
                $profile = $customerData['profile'];

                // Tạo giờ đặt hàng trong ngày (GMT+7)
                // Cố ý rải một vài đơn vào khung 00:00 - 06:59 sáng giờ VN để kiểm tra múi giờ
                $isEarlyMorning = ($orderCounter % 6 === 0);
                if ($isEarlyMorning) {
                    $hour = mt_rand(0, 5);
                    $minute = mt_rand(10, 50);
                } else {
                    $hour = mt_rand(8, 22);
                    $minute = mt_rand(0, 59);
                }

                $orderCreatedVn = $nowVn->copy()
                    ->subDays($dayOffset)
                    ->setTime($hour, $minute, mt_rand(0, 59));

                $orderCreatedUtc = $orderCreatedVn->copy()->setTimezone('UTC');

                // Phương thức thanh toán: 80% COD, 20% VNPay
                $paymentMethod = (mt_rand(1, 100) <= 80) ? PaymentMethod::Cod : PaymentMethod::Vnpay;

                // Mốc thời gian chuyển trạng thái (theo UTC)
                $paidAtUtc = null;
                $updatedAtUtc = $orderCreatedUtc->copy();
                $cancelledAtUtc = null;
                $cancelReason = null;
                $confirmedAtUtc = null;
                $shippingAtUtc = null;

                if ($status === OrderStatus::Delivered) {
                    $paymentStatus = PaymentStatus::Paid;
                    // Thời gian giao thường trong cùng ngày hoặc 1-2 ngày sau
                    $deliveryDelayHours = mt_rand(4, 30);
                    $deliveredTimeVn = $orderCreatedVn->copy()->addHours($deliveryDelayHours);
                    if ($deliveredTimeVn->gt($nowVn)) {
                        $deliveredTimeVn = $nowVn->copy()->subMinutes(mt_rand(5, 60));
                    }
                    $paidAtUtc = $deliveredTimeVn->copy()->setTimezone('UTC');
                    $updatedAtUtc = $paidAtUtc;

                    $confirmedAtUtc = $orderCreatedUtc->copy()->addMinutes(mt_rand(15, 45));
                    $shippingAtUtc = $orderCreatedUtc->copy()->addHours(mt_rand(2, 6));
                } elseif ($status === OrderStatus::Shipping) {
                    $paymentStatus = ($paymentMethod === PaymentMethod::Vnpay) ? PaymentStatus::Paid : PaymentStatus::Unpaid;
                    if ($paymentMethod === PaymentMethod::Vnpay) {
                        $paidAtUtc = $orderCreatedUtc->copy()->addMinutes(mt_rand(5, 15));
                    }
                    $confirmedAtUtc = $orderCreatedUtc->copy()->addMinutes(mt_rand(15, 45));
                    $shippingAtUtc = $orderCreatedUtc->copy()->addHours(mt_rand(2, 6));
                    $updatedAtUtc = $shippingAtUtc;
                } elseif ($status === OrderStatus::Confirmed) {
                    $paymentStatus = ($paymentMethod === PaymentMethod::Vnpay) ? PaymentStatus::Paid : PaymentStatus::Unpaid;
                    if ($paymentMethod === PaymentMethod::Vnpay) {
                        $paidAtUtc = $orderCreatedUtc->copy()->addMinutes(mt_rand(5, 15));
                    }
                    $confirmedAtUtc = $orderCreatedUtc->copy()->addMinutes(mt_rand(15, 45));
                    $updatedAtUtc = $confirmedAtUtc;
                } elseif ($status === OrderStatus::Cancelled) {
                    $paymentStatus = ($paymentMethod === PaymentMethod::Vnpay) ? PaymentStatus::Refunded : PaymentStatus::Unpaid;
                    $cancelDelayHours = mt_rand(1, 4);
                    $cancelledAtUtc = $orderCreatedUtc->copy()->addHours($cancelDelayHours);
                    $updatedAtUtc = $cancelledAtUtc;
                    $cancelReason = $cancelReasons[mt_rand(0, count($cancelReasons) - 1)];

                    // 50% đơn hủy sau khi đã xác nhận
                    if (mt_rand(1, 100) <= 50) {
                        $confirmedAtUtc = $orderCreatedUtc->copy()->addMinutes(mt_rand(15, 30));
                    }
                } else {
                    // Pending
                    $paymentStatus = PaymentStatus::Unpaid;
                }

                $orderCode = 'DEMO-' . $orderCreatedVn->format('ymd') . '-' . sprintf('%04d', $orderCounter);

                // 6. Tạo vỏ đơn hàng
                $order = Order::create([
                    'order_code'       => $orderCode,
                    'user_id'          => $customer->id,
                    'status'           => $status,
                    'payment_method'   => $paymentMethod,
                    'payment_status'   => $paymentStatus,
                    'recipient_name'   => $profile['name'],
                    'recipient_phone'  => $profile['phone'],
                    'shipping_address' => $profile['address'],
                    'note'             => ($orderCounter % 7 === 0) ? 'Giao giờ hành chính, gọi trước khi đến' : null,
                    'subtotal'         => 0,
                    'shipping_fee'     => 0,
                    'discount_amount'  => 0,
                    'total_amount'     => 0,
                    'cancel_reason'    => $cancelReason,
                    'cancelled_at'     => $cancelledAtUtc,
                    'paid_at'          => $paidAtUtc,
                    'created_at'       => $orderCreatedUtc,
                    'updated_at'       => $updatedAtUtc,
                ]);

                // 7. Tạo order_items: 90% đơn có 1 món, 10% đơn có 2 món (giữ AOV trong khoảng 2.5 - 3.5 triệu)
                $numItems = (mt_rand(1, 100) <= 90) ? 1 : 2;
                $subtotal = 0;
                $usedVariantIds = [];

                for ($itemIdx = 0; $itemIdx < $numItems; $itemIdx++) {
                    $variant = $variants[mt_rand(0, $variants->count() - 1)];
                    if (in_array($variant->id, $usedVariantIds)) {
                        continue;
                    }
                    $usedVariantIds[] = $variant->id;

                    $product = $variant->product;
                    $quantity = 1; // Hầu hết mua 1 chiếc/mẫu
                    $unitPrice = (int) $product->base_price;
                    $lineTotal = $unitPrice * $quantity;
                    $subtotal += $lineTotal;

                    $imageUrl = $product->mainImage?->image_url
                        ?? $product->images->first()?->image_url
                        ?? 'https://placehold.co/800x1000/2c2824/ffffff';

                    OrderItem::create([
                        'order_id'     => $order->id,
                        'product_id'   => $product->id,
                        'variant_id'   => $variant->id,
                        'product_name' => $product->name,
                        'sku'          => $variant->sku,
                        'color_name'   => $variant->color?->name ?? 'Tiêu chuẩn',
                        'size_name'    => $variant->size?->name ?? 'Tiêu chuẩn',
                        'image_url'    => $imageUrl,
                        'unit_price'   => $unitPrice,
                        'quantity'     => $quantity,
                        'line_total'   => $lineTotal,
                        'created_at'   => $orderCreatedUtc,
                        'updated_at'   => $orderCreatedUtc,
                    ]);
                }

                // 8. Cập nhật subtotal, shipping_fee và total_amount nhất quán theo config/shop.php
                $shippingFee = ($subtotal >= $freeShippingThreshold) ? 0 : $standardShippingFee;
                $totalAmount = $subtotal + $shippingFee;

                $order->update([
                    'subtotal'     => $subtotal,
                    'shipping_fee' => $shippingFee,
                    'total_amount' => $totalAmount,
                ]);

                // 9. Tạo lịch sử chuyển trạng thái (OrderStatusHistory) theo đúng chuỗi nghiệp vụ hợp lệ
                // Bước 1: Khởi tạo pending
                OrderStatusHistory::create([
                    'order_id'    => $order->id,
                    'from_status' => null,
                    'to_status'   => OrderStatus::Pending->value,
                    'changed_by'  => $customer->id,
                    'reason'      => 'Khách hàng đặt đơn thành công',
                    'created_at'  => $orderCreatedUtc,
                ]);

                // Bước 2: Chuyển sang Confirmed (nếu có)
                if ($confirmedAtUtc) {
                    OrderStatusHistory::create([
                        'order_id'    => $order->id,
                        'from_status' => OrderStatus::Pending->value,
                        'to_status'   => OrderStatus::Confirmed->value,
                        'changed_by'  => $adminId,
                        'reason'      => 'Quản trị viên xác nhận đơn hàng',
                        'created_at'  => $confirmedAtUtc,
                    ]);
                }

                // Bước 3: Chuyển sang Shipping (nếu có)
                if ($shippingAtUtc) {
                    OrderStatusHistory::create([
                        'order_id'    => $order->id,
                        'from_status' => OrderStatus::Confirmed->value,
                        'to_status'   => OrderStatus::Shipping->value,
                        'changed_by'  => $adminId,
                        'reason'      => 'Đã bàn giao cho đơn vị vận chuyển',
                        'created_at'  => $shippingAtUtc,
                    ]);
                }

                // Bước 4: Chuyển sang Delivered (nếu có)
                if ($status === OrderStatus::Delivered && $paidAtUtc) {
                    OrderStatusHistory::create([
                        'order_id'    => $order->id,
                        'from_status' => OrderStatus::Shipping->value,
                        'to_status'   => OrderStatus::Delivered->value,
                        'changed_by'  => $adminId,
                        'reason'      => 'Giao hàng thành công đến người nhận',
                        'created_at'  => $paidAtUtc,
                    ]);
                }

                // Bước 5: Chuyển sang Cancelled (nếu có)
                if ($status === OrderStatus::Cancelled && $cancelledAtUtc) {
                    $fromStatus = $confirmedAtUtc ? OrderStatus::Confirmed->value : OrderStatus::Pending->value;
                    OrderStatusHistory::create([
                        'order_id'    => $order->id,
                        'from_status' => $fromStatus,
                        'to_status'   => OrderStatus::Cancelled->value,
                        'changed_by'  => $customer->id,
                        'reason'      => $cancelReason,
                        'created_at'  => $cancelledAtUtc,
                    ]);
                }

                $orderCounter++;
            }
        }

        $totalDemoOrders = Order::where('order_code', 'LIKE', 'DEMO-%')->count();
        $deliveredCount = Order::where('order_code', 'LIKE', 'DEMO-%')->where('status', OrderStatus::Delivered->value)->count();
        $pendingCount = Order::where('order_code', 'LIKE', 'DEMO-%')->where('status', OrderStatus::Pending->value)->count();
        $confirmedCount = Order::where('order_code', 'LIKE', 'DEMO-%')->where('status', OrderStatus::Confirmed->value)->count();
        $shippingCount = Order::where('order_code', 'LIKE', 'DEMO-%')->where('status', OrderStatus::Shipping->value)->count();
        $cancelledCount = Order::where('order_code', 'LIKE', 'DEMO-%')->where('status', OrderStatus::Cancelled->value)->count();

        $this->command->info("Đã tạo thành công {$totalDemoOrders} đơn hàng demo:");
        $this->command->info("- Đã giao (Delivered): {$deliveredCount}");
        $this->command->info("- Chờ xử lý (Pending): {$pendingCount}");
        $this->command->info("- Đã xác nhận (Confirmed): {$confirmedCount}");
        $this->command->info("- Đang giao (Shipping): {$shippingCount}");
        $this->command->info("- Đã hủy (Cancelled): {$cancelledCount}");
    }
}
