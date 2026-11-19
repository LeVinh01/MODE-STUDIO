<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[{{ $brandName }}] Xác nhận đơn hàng #{{ $order->order_code }}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f7f7f7;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #222222;
            -webkit-text-size-adjust: 100%;
        }
        .wrapper {
            width: 100%;
            table-layout: fixed;
            background-color: #f7f7f7;
            padding: 40px 0;
        }
        .main-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        .header {
            background-color: #111111;
            padding: 28px 32px;
            text-align: center;
        }
        .brand-title {
            color: #ffffff;
            font-size: 24px;
            letter-spacing: 4px;
            margin: 0;
            font-weight: 700;
            text-transform: uppercase;
        }
        .content {
            padding: 32px;
        }
        .greeting {
            font-size: 16px;
            line-height: 1.6;
            margin-top: 0;
            margin-bottom: 20px;
        }
        .section-box {
            background-color: #fafafa;
            border: 1px solid #eeeeee;
            border-radius: 4px;
            padding: 18px 20px;
            margin-bottom: 24px;
        }
        .box-title {
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 12px 0;
            color: #333333;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            margin-bottom: 8px;
            line-height: 1.5;
        }
        .info-row:last-child {
            margin-bottom: 0;
        }
        .info-label {
            color: #666666;
            width: 45%;
        }
        .info-value {
            color: #111111;
            font-weight: 500;
            text-align: right;
            width: 55%;
        }
        .table-items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
            font-size: 14px;
        }
        .table-items th {
            background-color: #f3f3f3;
            color: #444444;
            font-weight: 600;
            text-align: left;
            padding: 10px 12px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #e5e5e5;
        }
        .table-items td {
            padding: 12px;
            border-bottom: 1px solid #eeeeee;
            vertical-align: top;
        }
        .item-name {
            font-weight: 600;
            color: #111111;
            margin-bottom: 4px;
        }
        .item-spec {
            font-size: 12px;
            color: #777777;
        }
        .text-right {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .totals-table {
            width: 100%;
            margin-bottom: 28px;
            font-size: 14px;
        }
        .totals-table td {
            padding: 6px 0;
        }
        .totals-total {
            font-size: 16px;
            font-weight: 700;
            border-top: 1px solid #e0e0e0;
            padding-top: 12px !important;
            color: #111111;
        }
        .cta-wrapper {
            text-align: center;
            margin: 32px 0 16px 0;
        }
        .btn-cta {
            display: inline-block;
            background-color: #111111;
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 32px;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
            border-radius: 2px;
        }
        .footer {
            border-top: 1px solid #eeeeee;
            padding: 24px 32px;
            background-color: #fafafa;
            text-align: center;
            font-size: 12px;
            color: #888888;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="main-container">
            <!-- HEADER -->
            <div class="header">
                <h1 class="brand-title">{{ $brandName }}</h1>
            </div>

            <!-- CONTENT -->
            <div class="content">
                <p class="greeting">
                    Xin chào <strong>{{ $order->recipient_name }}</strong>,
                </p>
                <p style="font-size: 14px; line-height: 1.6; color: #444444; margin-bottom: 24px;">
                    Cảm ơn bạn đã lựa chọn mua sắm tại <strong>{{ $brandName }}</strong>. Đơn hàng của bạn đã được ghi nhận thành công với các thông tin chi tiết như sau:
                </p>

                <!-- THÔNG TIN ĐƠN HÀNG -->
                <div class="section-box">
                    <h3 class="box-title">Thông Tin Đơn Hàng</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr>
                            <td style="padding: 4px 0; color: #666666;">Mã đơn hàng:</td>
                            <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #111111;">#{{ $order->order_code }}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #666666;">Ngày đặt:</td>
                            <td style="padding: 4px 0; text-align: right; color: #111111;">
                                {{ $order->created_at ? $order->created_at->timezone('Asia/Ho_Chi_Minh')->format('d/m/Y H:i') : '' }}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #666666;">Trạng thái đơn:</td>
                            <td style="padding: 4px 0; text-align: right; color: #111111; font-weight: 500;">{{ $orderStatusText }}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #666666;">Phương thức thanh toán:</td>
                            <td style="padding: 4px 0; text-align: right; color: #111111; font-weight: 500;">{{ $paymentMethodText }}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #666666;">Trạng thái thanh toán:</td>
                            <td style="padding: 4px 0; text-align: right; color: #111111; font-weight: 500;">{{ $paymentStatusText }}</td>
                        </tr>
                    </table>
                </div>

                <!-- THÔNG TIN NHẬN HÀNG -->
                <div class="section-box">
                    <h3 class="box-title">Thông Tin Giao Hàng</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr>
                            <td style="padding: 4px 0; color: #666666; width: 35%;">Người nhận:</td>
                            <td style="padding: 4px 0; text-align: right; color: #111111; font-weight: 500;">{{ $order->recipient_name }}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #666666;">Số điện thoại:</td>
                            <td style="padding: 4px 0; text-align: right; color: #111111; font-weight: 500;">{{ $order->recipient_phone }}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #666666; vertical-align: top;">Địa chỉ:</td>
                            <td style="padding: 4px 0; text-align: right; color: #111111;">{{ $order->shipping_address }}</td>
                        </tr>
                        @if(!empty($order->note))
                        <tr>
                            <td style="padding: 4px 0; color: #666666; vertical-align: top;">Ghi chú:</td>
                            <td style="padding: 4px 0; text-align: right; color: #555555; font-style: italic;">{{ $order->note }}</td>
                        </tr>
                        @endif
                    </table>
                </div>

                <!-- BẢNG SẢN PHẨM -->
                <table class="table-items">
                    <thead>
                        <tr>
                            <th style="width: 50%;">Sản phẩm</th>
                            <th class="text-center" style="width: 12%;">SL</th>
                            <th class="text-right" style="width: 18%;">Đơn giá</th>
                            <th class="text-right" style="width: 20%;">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($order->items as $item)
                        <tr>
                            <td>
                                <div class="item-name">{{ $item->product_name }}</div>
                                <div class="item-spec">
                                    {{ $item->color_name }} / {{ $item->size_name }}
                                    @if(!empty($item->sku))
                                        (SKU: {{ $item->sku }})
                                    @endif
                                </div>
                            </td>
                            <td class="text-center">{{ $item->quantity }}</td>
                            <td class="text-right">{{ number_format($item->unit_price, 0, ',', '.') }} đ</td>
                            <td class="text-right" style="font-weight: 600;">{{ number_format($item->line_total, 0, ',', '.') }} đ</td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>

                <!-- TỔNG KẾT CHI PHÍ -->
                <table class="totals-table">
                    <tr>
                        <td style="color: #666666;">Tạm tính:</td>
                        <td class="text-right" style="font-weight: 500;">{{ number_format($order->subtotal, 0, ',', '.') }} đ</td>
                    </tr>
                    <tr>
                        <td style="color: #666666;">Phí vận chuyển:</td>
                        <td class="text-right" style="font-weight: 500;">
                            {{ $order->shipping_fee > 0 ? number_format($order->shipping_fee, 0, ',', '.') . ' đ' : 'Miễn phí' }}
                        </td>
                    </tr>
                    @if($order->discount_amount > 0)
                    <tr>
                        <td style="color: #666666;">Giảm giá:</td>
                        <td class="text-right" style="color: #b91c1c; font-weight: 500;">-{{ number_format($order->discount_amount, 0, ',', '.') }} đ</td>
                    </tr>
                    @endif
                    <tr>
                        <td class="totals-total">Tổng thanh toán:</td>
                        <td class="text-right totals-total" style="color: #111111;">
                            {{ number_format($order->total_amount, 0, ',', '.') }} đ
                        </td>
                    </tr>
                </table>

                <!-- CTA XEM ĐƠN HÀNG -->
                <div class="cta-wrapper">
                    <a href="{{ $orderUrl }}" class="btn-cta" target="_blank">Xem Chi Tiết Đơn Hàng</a>
                </div>
            </div>

            <!-- FOOTER -->
            <div class="footer">
                <p style="margin: 0 0 6px 0;">
                    Nếu bạn có bất kỳ câu hỏi nào về đơn hàng, vui lòng liên hệ với bộ phận chăm sóc khách hàng của chúng tôi để được hỗ trợ.
                </p>
                <p style="margin: 0;">
                    &copy; {{ date('Y') }} {{ $brandName }}. All rights reserved.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
