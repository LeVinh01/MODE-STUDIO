<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[{{ $brandName }}] Hướng dẫn đặt lại mật khẩu</title>
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
        .message-p {
            font-size: 14px;
            line-height: 1.6;
            color: #444444;
            margin-bottom: 24px;
        }
        .notice-box {
            background-color: #fafafa;
            border-left: 3px solid #111111;
            padding: 14px 18px;
            margin-bottom: 28px;
            font-size: 13px;
            line-height: 1.6;
            color: #555555;
        }
        .cta-wrapper {
            text-align: center;
            margin: 32px 0;
        }
        .btn-cta {
            display: inline-block;
            background-color: #111111;
            color: #ffffff !important;
            padding: 14px 32px;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            border-radius: 2px;
        }
        .fallback-box {
            margin-top: 28px;
            padding-top: 20px;
            border-top: 1px solid #eeeeee;
            font-size: 12px;
            color: #777777;
            line-height: 1.6;
        }
        .fallback-link {
            color: #111111;
            word-break: break-all;
            text-decoration: underline;
        }
        .footer {
            background-color: #fafafa;
            border-top: 1px solid #eeeeee;
            padding: 24px 32px;
            text-align: center;
            font-size: 12px;
            color: #888888;
            line-height: 1.5;
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

            <!-- NỘI DUNG -->
            <div class="content">
                <p class="greeting">
                    Xin chào <strong>{{ $user->full_name }}</strong>,
                </p>

                <p class="message-p">
                    Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email <strong>{{ $user->email }}</strong> tại {{ $brandName }}. Vui lòng bấm vào nút bên dưới để tiến hành thiết lập mật khẩu mới:
                </p>

                <!-- NÚT BẤM ĐẶT LẠI MẬT KHẨU -->
                <div class="cta-wrapper">
                    <a href="{{ $resetUrl }}" class="btn-cta" target="_blank">ĐẶT LẠI MẬT KHẨU</a>
                </div>

                <!-- LƯU Ý THỜI HẠN VÀ BẢO MẬT -->
                <div class="notice-box">
                    <strong>Lưu ý quan trọng:</strong><br>
                    &bull; Liên kết này chỉ có hiệu lực trong vòng <strong>60 phút</strong> kể từ thời điểm gửi.<br>
                    &bull; Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email. Mật khẩu hiện tại của bạn vẫn được giữ an toàn tuyệt đối.
                </div>

                <!-- DỰ PHÒNG LIÊN KẾT DẠNG VĂN BẢN -->
                <div class="fallback-box">
                    <p style="margin: 0 0 8px 0;">Nếu nút bấm trên không hoạt động, bạn có thể sao chép và dán trực tiếp liên kết dưới đây vào trình duyệt:</p>
                    <a href="{{ $resetUrl }}" class="fallback-link" target="_blank">{{ $resetUrl }}</a>
                </div>
            </div>

            <!-- FOOTER -->
            <div class="footer">
                <p style="margin: 0 0 6px 0;">
                    Email này được gửi tự động từ hệ thống của {{ $brandName }}. Vui lòng không trả lời trực tiếp email này.
                </p>
                <p style="margin: 0;">
                    &copy; {{ date('Y') }} {{ $brandName }}. All rights reserved.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
