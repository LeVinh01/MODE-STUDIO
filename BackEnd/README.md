# MODE STUDIO - Backend API

Hệ thống Backend API cho dự án thương mại điện tử thời trang **MODE STUDIO**.  
Xây dựng trên nền tảng **Laravel 13**, **PHP 8.4+**, **MySQL 8.0** và triển khai qua **Docker Compose**.

---

## 1. Yêu Cầu Môi Trường

- **Docker Desktop** (hỗ trợ Docker Compose v2+ / docker-compose).
- Cổng khả dụng trên máy host:
  - `8000`: Web Server (Nginx) phục vụ API.
  - `3306`: MySQL Database Server.
  - `8080`: Giao diện phpMyAdmin.

---

## 2. Hướng Dẫn Khởi Động Dự Án

### Bước 1: Khởi động hệ thống Docker Containers
Chạy lệnh sau tại thư mục `BackEnd/`:

```bash
docker compose up -d --build
```

### Bước 2: Cài đặt thư viện phụ thuộc (Composer)

> ⚡ **LƯU Ý VỀ HIỆU NĂNG**: Để tránh hiện tượng I/O chậm khi bind mount từ ổ đĩa host Windows, thư mục `vendor/` được lưu trong **Docker Named Volume (`app_vendor`)** nội bộ của Linux.  
> Do đó, **MỌI lệnh `composer` BẮT BUỘC phải chạy bên trong container `app`**, không chạy trực tiếp ngoài máy host:

```bash
docker compose exec app composer install
```

> **Khi clone dự án mới về máy:**
> 1. Chạy `docker compose up -d` để Docker tự động tạo volume `app_vendor`.
> 2. Chạy `docker compose exec app composer install` để nạp các thư viện từ `composer.lock` vào volume.
> 3. Nếu muốn cài lại từ đầu toàn bộ thư mục `vendor`:
>    ```bash
>    docker compose down
>    docker volume rm backend_app_vendor
>    docker compose up -d
>    docker compose exec app composer install
>    ```

### Bước 3: Tạo khóa ứng dụng (Application Key)
Nếu file `.env` chưa có `APP_KEY` hoặc muốn tạo mới:

```bash
docker compose exec app php artisan key:generate
```

---

## 3. LƯU Ý QUAN TRỌNG VỀ LỆNH ARTISAN & COMPOSER

> **QUAN TRỌNG**: Do cơ sở dữ liệu dùng mạng nội bộ Docker (`DB_HOST=mysql`) và `vendor/` nằm trong Docker named volume, **MỌI lệnh `artisan` và `composer` PHẢI được thực thi thông qua container `app`**:
>
> ```bash
> # Chạy lệnh artisan
> docker compose exec app php artisan <tên_lệnh>
>
> # Chạy lệnh composer (thêm package, cập nhật autoload...)
> docker compose exec app composer <tên_lệnh>
> ```
>
> **Ví dụ**:
> - Cài thêm package mới: `docker compose exec app composer require <package_name>`
> - Dump lại autoload: `docker compose exec app composer dump-autoload -o`
> - Chạy migration: `docker compose exec app php artisan migrate`
> - Chạy seeder: `docker compose exec app php artisan db:seed`
> - Làm mới CSDL: `docker compose exec app php artisan migrate:fresh`
> - Xóa cache cấu hình: `docker compose exec app php artisan config:clear`
> - Chạy test: `docker compose exec app php artisan test`

---

## 4. Danh Sách Cổng & Địa Chỉ Dịch Vụ

| Dịch vụ | Địa chỉ truy cập | Ghi chú |
| :--- | :--- | :--- |
| **API Backend (Nginx)** | `http://localhost:8000` | Cổng chính cho frontend kết nối |
| **Kiểm tra sức khỏe (Health Check)** | `http://localhost:8000/api/health` | Trả về JSON `{"status": "ok"}` |
| **phpMyAdmin** | `http://localhost:8080` | Quản trị CSDL giao diện Web |
| **MySQL Database** | `localhost:3306` | Kết nối từ DBeaver / Datagrip / Workbench |

### Thông tin đăng nhập CSDL mặc định (theo `.env`):
- **Server / Host**: `mysql` (từ trong container) hoặc `127.0.0.1` (từ ngoài máy host).
- **Database**: `mode_studio`
- **Username**: `mode_user`
- **Password**: `secret_password`
- **Root Password**: `root_secret`

---

## 5. Seed Dữ Liệu Mẫu (Development)

### Bước 1: Cấu hình mật khẩu seed trong `.env`

> ⚠️ **Mật khẩu này CHỈ dùng cho môi trường dev. BẮT BUỘC phải đổi trước khi triển khai lên staging/production.**

Mở file `.env` và điền giá trị cho 3 biến sau (không để trống):

```dotenv
SEED_ADMIN_PASSWORD=<mật_khẩu_mạnh>
SEED_OPERATOR_PASSWORD=<mật_khẩu_mạnh>
SEED_CUSTOMER_PASSWORD=<mật_khẩu_mạnh>
```

Nếu bất kỳ biến nào bị bỏ trống, seeder sẽ báo lỗi rõ ràng và dừng lại.

### Bước 2: Chạy migration và seed

```bash
# Xóa toàn bộ dữ liệu và tạo lại từ đầu (dev)
docker compose exec app php artisan migrate:fresh --seed

# Hoặc chỉ seed mà không xóa dữ liệu
docker compose exec app php artisan db:seed
```

### Tài khoản mẫu sau khi seed

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | `admin@mode-studio.test` | Giá trị `SEED_ADMIN_PASSWORD` trong `.env` |
| Operator | `operator@mode-studio.test` | Giá trị `SEED_OPERATOR_PASSWORD` trong `.env` |
| Khách hàng | `customer@mode-studio.test` | Giá trị `SEED_CUSTOMER_PASSWORD` trong `.env` |

---

## 6. Lưu Ý Triển Khai Thực Tế (Production)

> ⚠️ **QUAN TRỌNG**:
> - Biến `APP_DEBUG` trong file `.env` **BẮT BUỘC phải được đặt là `false`** khi triển khai thật (staging/production) để tránh lộ thông tin nhạy cảm của hệ thống.
> - Các biến `SEED_*_PASSWORD` chỉ phục vụ mục đích seeding môi trường dev, phải xóa hoặc thay đổi mật khẩu quản trị thật sau khi khởi tạo.

---

## 8. API Xác Thực & Phân Quyền (Authentication & Authorization)

Hệ thống sử dụng **Laravel Sanctum** với cơ chế Personal Access Token. Token được cấp khi đăng ký hoặc đăng nhập thành công và gửi kèm trong các request tiếp theo qua header:
```http
Authorization: Bearer <TOKEN_CỦA_BẠN>
Accept: application/json
```

### Thời hạn Token (Token Expiration)
- Mặc định: **43200 phút (30 ngày)**, cấu hình linh hoạt qua biến môi trường `SANCTUM_EXPIRATION` trong file `.env`.
- Khi token hết hạn, Sanctum sẽ tự động từ chối và trả về mã lỗi HTTP `401 Unauthorized` dạng JSON.

### Danh sách Endpoint Xác Thực

#### 1. Đăng ký tài khoản (`POST /api/auth/register`)
- **Giới hạn tốc độ (Rate Limit)**: Tối đa 5 lần / phút theo địa chỉ IP.
- **Request Body (JSON)**:
  ```json
  {
    "full_name": "Nguyễn Văn A",
    "email": "user@example.com",
    "phone": "0901234567",
    "password": "Password123!",
    "password_confirmation": "Password123!"
  }
  ```
- **Response (HTTP 201)**:
  ```json
  {
    "user": {
      "id": 4,
      "full_name": "Nguyễn Văn A",
      "email": "user@example.com",
      "phone": "0901234567",
      "role": "customer",
      "status": "active",
      "email_verified_at": null,
      "last_login_at": null
    },
    "token": "..."
  }
  ```

#### 2. Đăng nhập (`POST /api/auth/login`)
- **Giới hạn tốc độ (Rate Limit)**: Tối đa 5 lần / phút theo cặp Email + IP (chống dò mật khẩu brute-force).
- **Request Body (JSON)**:
  ```json
  {
    "email": "customer@mode-studio.test",
    "password": "Password123!"
  }
  ```
- **Response (HTTP 200)**:
  ```json
  {
    "user": {
      "id": 3,
      "full_name": "Khách Hàng Mẫu",
      "email": "customer@mode-studio.test",
      "phone": null,
      "role": "customer",
      "status": "active",
      "email_verified_at": null,
      "last_login_at": "..."
    },
    "token": "..."
  }
  ```

#### 3. Lấy thông tin tài khoản (`GET /api/auth/me`)
- **Yêu cầu**: Cần gửi kèm Bearer token hợp lệ.
- **Header**:
  ```http
  Authorization: Bearer <TOKEN_CỦA_BẠN>
  Accept: application/json
  ```
- **Response (HTTP 200)**:
  ```json
  {
    "user": {
      "id": 3,
      "full_name": "Khách Hàng Mẫu",
      "email": "customer@mode-studio.test",
      "phone": null,
      "role": "customer",
      "status": "active",
      "email_verified_at": null,
      "last_login_at": "..."
    }
  }
  ```

#### 4. Đăng xuất (`POST /api/auth/logout`)
- **Yêu cầu**: Cần gửi kèm Bearer token hợp lệ.
- **Xử lý**: Xóa đúng token hiện đang dùng khỏi cơ sở dữ liệu.
- **Response (HTTP 200)**:
  ```json
  {
    "message": "Đăng xuất thành công."
  }
  ```

### Middleware Phân Quyền (Role-based Authorization)
- Đăng ký alias `role` trong `bootstrap/app.php`: `role:admin`, `role:operator,admin`, `role:customer`.
- Khi người dùng không đủ quyền hoặc tài khoản bị khóa (`status=locked`), API luôn trả về HTTP 403 Forbidden JSON kèm thông điệp tiếng Việt.

---

## 9. API Giỏ Hàng (Cart API)

Quản lý giỏ hàng trực tuyến cho khách hàng đã đăng nhập và hỗ trợ khách vãng lai (Guest Cart). Mỗi khách hàng đăng nhập sở hữu một giỏ hàng duy nhất lưu trữ trong bảng `cart_items`.

### Chính sách và giới hạn:
- **Số lượng tối đa mỗi sản phẩm trong giỏ**: 20 sản phẩm (`config('shop.cart.max_item_quantity')`).
- **Khách vãng lai (Guest Cart)**: Giỏ hàng được lưu tạm phía client (chỉ lưu `variant_id` và `quantity`). Phía client gọi `POST /api/cart/quote` để lấy giá, tồn kho và trạng thái khả dụng thực tế từ cơ sở dữ liệu.
- **Gộp giỏ hàng sau đăng nhập (`POST /api/cart/merge`)**: Khi khách đăng nhập, frontend gửi danh sách món từ giỏ khách kèm mã `merge_token` dạng UUID để gộp vào giỏ tài khoản.
- **Cơ chế Idempotency chống gộp trùng**: Sử dụng `Cache::add` với khóa `cart_merge:{user_id}:{merge_token}` (TTL 24 giờ). Nếu quá trình giao dịch gặp lỗi (deadlock, lỗi DB, ngoại lệ hệ thống), token sẽ được giải phóng ngay lập tức (`Cache::forget`) để khách hàng có thể thử lại an toàn mà không làm mất dữ liệu giỏ hàng. Chỉ khi giao dịch hoàn tất thành công, token mới được duy trì. Nếu token đã được xử lý trước đó, hệ thống trả về HTTP 200 kèm `already_merged: true` và giỏ hàng hiện tại, không cộng dồn thêm.
- **Kiểm soát cạnh tranh (Concurrency Control)**: Trong quá trình gộp giỏ, transaction khóa các dòng giỏ hàng hiện tại của người dùng (`lockForUpdate`), sau đó khóa các biến thể sản phẩm theo thứ tự `id` tăng dần (`orderBy('id', 'asc')`) nhằm hạn chế rủi ro deadlock.
- **Cơ chế phân loại mục bị bỏ qua (`skipped`) và điều chỉnh (`adjusted`)**:
  - `skipped[]`: Chứa các biến thể không thể thêm vào giỏ (biến thể không tồn tại, sản phẩm nháp / đã xóa mềm / ẩn, biến thể tạm ngừng bán, hoặc hết hàng) kèm lý do cụ thể.
  - `adjusted[]`: Chứa các biến thể bị giới hạn số lượng theo `min(tồn kho, 20)` kèm số lượng yêu cầu ban đầu (`requested`), số lượng được duyệt (`final`) và lý do điều chỉnh.

### Danh sách Endpoint Giỏ Hàng:

#### 1. Báo giá giỏ hàng khách vãng lai (`POST /api/cart/quote`)
- **Phân quyền**: Công khai (không yêu cầu Bearer token).
- **Giới hạn tốc độ (Rate Limit)**: Cấu hình qua `shop.cart.quote_throttle` (mặc định 60 lần / phút theo địa chỉ IP).
- **Quy tắc nghiệp vụ & bảo mật**:
  - Nhận tối đa 50 phần tử trong mảng `items`.
  - Tự động gộp các phần tử trùng `variant_id` trong payload (giới hạn tối đa 20).
  - Các `variant_id` không tồn tại trong hệ thống được liệt kê trong mảng `missing_variant_ids`.
  - Không để lộ thông tin của sản phẩm nháp, sản phẩm bị ẩn hoặc đã xóa mềm: trả về `is_purchasable: false`, `unpurchasable_reason: "Sản phẩm đã ngừng kinh doanh"`, đồng thời ẩn tên, hình ảnh và đưa đơn giá về `0`.
- **Request Body (JSON)**:
  ```json
  {
    "items": [
      {
        "variant_id": 1,
        "quantity": 2
      }
    ]
  }
  ```
- **Response (HTTP 200)**:
  ```json
  {
    "items": [
      {
        "id": null,
        "variant": {
          "id": 1,
          "sku": "AO-THUN-DEN-M",
          "color": { "id": 1, "name": "Đen", "hex_code": "#000000" },
          "size": { "id": 2, "name": "M" },
          "stock_quantity": 15,
          "is_active": true
        },
        "product": {
          "id": 1,
          "name": "Áo Thun Cotton Compact",
          "slug": "ao-thun-cotton-compact",
          "status": "active",
          "main_image": { "url": "https://...", "alt_text": "..." }
        },
        "unit_price": 350000,
        "quantity": 2,
        "line_total": 700000,
        "is_purchasable": true,
        "unpurchasable_reason": null
      }
    ],
    "subtotal": 700000,
    "total_quantity": 2,
    "items_count": 1,
    "has_unpurchasable_items": false,
    "missing_variant_ids": []
  }
  ```

#### 2. Gộp giỏ hàng khách vào tài khoản (`POST /api/cart/merge`)
- **Phân quyền**: Yêu cầu `auth:sanctum` và tài khoản `active`.
- **Request Body (JSON)**:
  ```json
  {
    "merge_token": "c4b12345-6789-4abc-def0-123456789abc",
    "items": [
      {
        "variant_id": 1,
        "quantity": 2
      }
    ]
  }
  ```
- **Response (HTTP 200)**:
  ```json
  {
    "message": "Đã đồng bộ giỏ hàng thành công.",
    "already_merged": false,
    "cart": {
      "items": [ ... ],
      "subtotal": 700000,
      "total_quantity": 2,
      "items_count": 1,
      "has_unpurchasable_items": false
    },
    "skipped": [],
    "adjusted": []
  }
  ```

#### 3. Lấy thông tin giỏ hàng (`GET /api/cart`)
- **Header**: `Authorization: Bearer <TOKEN>`
- **Response (HTTP 200)**: Trả về danh sách món trong giỏ của người dùng, `items_count`, `subtotal`, `total_quantity` và cờ `is_purchasable` của từng sản phẩm.

#### 4. Thêm sản phẩm vào giỏ (`POST /api/cart/items`)
- **Body**: `{"variant_id": 1, "quantity": 2}`
- **Xử lý**: Cộng dồn số lượng nếu đã có trong giỏ; kiểm tra tồn kho và giới hạn tối đa 20. Bọc transaction và khóa dòng để xử lý tranh chấp khi có nhiều yêu cầu thêm cùng lúc.

#### 5. Cập nhật số lượng (`PATCH /api/cart/items/{id}`)
- **Body**: `{"quantity": 3}`
- **Response (HTTP 200)**: Cập nhật số lượng món hàng, từ chối 422 nếu vượt tồn hoặc vượt 20.

#### 6. Xóa một món khỏi giỏ (`DELETE /api/cart/items/{id}`)
- Xóa đúng món hàng của user hiện tại, trả về 200 kèm thông báo thành công.

#### 7. Xóa toàn bộ giỏ hàng (`DELETE /api/cart`)
- Xóa tất cả các dòng giỏ hàng của user hiện tại.

---

## 10. API Đơn Hàng (Orders API)

Quản lý chu trình đặt hàng COD, danh sách đơn hàng, chi tiết đơn hàng và hủy đơn phía khách hàng. Tất cả các endpoint yêu cầu xác thực `auth:sanctum` và tài khoản hoạt động (`active`).

### Chính sách phí vận chuyển:
- **Miễn phí vận chuyển**: Khi giá trị đơn hàng `subtotal >= 2.000.000 đ`.
- **Phí tiêu chuẩn**: `30.000 đ` (đây là giả định thiết kế ban đầu trong cấu hình hệ thống, chờ xác nhận thêm từ nghiệp vụ).

### Cơ chế chống đụng độ & chống đua (Concurrency Control):
- **Tạo đơn hàng (`POST /api/orders`)**: 
  - Đọc và khóa các dòng giỏ hàng của user (`lockForUpdate`) bên trong transaction để ngăn ngừa việc tạo trùng đơn khi người dùng thao tác bấm đặt hàng nhiều lần liên tiếp.
  - Khóa các biến thể sản phẩm theo thứ tự `id` tăng dần (`orderBy('id', 'asc')`) nhằm tránh deadlock giữa các giao dịch đồng thời.
  - Kiểm tra lại tính hợp lệ của sản phẩm (chưa bị xóa, đang active, đủ tồn kho) trước khi trừ tồn kho và tạo bản ghi chi tiết đơn hàng (snapshot: tên, sku, màu sắc, kích thước, ảnh đại diện, đơn giá tại thời điểm mua).
  - Sinh mã đơn hàng duy nhất với tiền tố `MS` kèm ngày và chuỗi ngẫu nhiên, tự động thử lại tối đa 5 lần nếu phát hiện trùng mã.
- **Hủy đơn hàng (`POST /api/orders/{order_code}/cancel`)**:
  - Thực hiện trong transaction có khóa dòng đơn hàng (`lockForUpdate`).
  - Chỉ cho phép hủy khi đơn hàng đang ở trạng thái chờ xử lý (`pending`). Nếu đơn đã xác nhận hoặc đã hủy trước đó, giao dịch trả về mã lỗi HTTP 422 và không cộng lại tồn kho.
  - Khóa các biến thể theo thứ tự `id` tăng dần và hoàn lại tồn kho (`increment('stock_quantity')`) tương ứng số lượng đã đặt.
  - Lưu thời điểm hủy (`cancelled_at`) và lý do hủy (`cancel_reason`), mặc định là "Khách hàng tự hủy đơn" nếu khách không nhập lý do.
  - *Lưu ý*: Thiết kế khóa dòng bi quan này nhằm giảm thiểu rủi ro bán vượt tồn kho và hủy trùng trong các kịch bản tương tranh; các bài test đã được thiết lập để mô phỏng tuần tự các kịch bản cạnh tranh tài nguyên.

### Danh sách Endpoint Đơn Hàng:

#### 1. Đặt hàng COD (`POST /api/orders`)
- **Body (JSON)**:
  ```json
  {
    "recipient_name": "Nguyễn Văn A",
    "recipient_phone": "0912345678",
    "shipping_address": "Số 123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    "note": "Giao giờ hành chính",
    "payment_method": "cod"
  }
  ```
- **Phương thức thanh toán hỗ trợ**: Chỉ chấp nhận `cod`. Phương thức `vnpay` được từ chối tại tầng validation với mã lỗi 422 (thông báo đang phát triển).
- **Response (HTTP 201)**: Trả về đơn hàng vừa tạo kèm snapshot items và xóa sạch giỏ hàng của khách.

#### 2. Danh sách đơn hàng (`GET /api/orders`)
- **Tham số truy vấn (Query Parameters)**:
  - `status`: Lọc theo trạng thái đơn hàng (`pending`, `confirmed`, `shipping`, `delivered`, `cancelled`). Trả về 422 nếu trạng thái không hợp lệ.
  - `per_page`: Số lượng đơn hàng mỗi trang, mặc định là `10`, tối đa là `50` (vượt quá 50 trả về 422).
  - `page`: Số trang cần xem (số nguyên $\ge 1$).
- **Đặc điểm**: Danh sách được cách ly chặt chẽ theo `user_id` (người dùng chỉ xem được đơn hàng của chính mình); nạp sẵn `items` để tối ưu truy vấn.
- **Response (HTTP 200)**: Cấu trúc phân trang chuẩn của Resource Collection (`data`, `links`, `meta`).

#### 3. Chi tiết đơn hàng (`GET /api/orders/{order_code}`)
- **Đặc điểm**: Tra cứu theo mã đơn hàng `order_code`. Nếu đơn không tồn tại hoặc thuộc về người dùng khác, API trả về chung mã lỗi HTTP 404 với thông điệp `"Đơn hàng không tồn tại."` để bảo mật thông tin.
- **Response (HTTP 200)**: Chứa toàn bộ thông tin đơn hàng và danh sách snapshot sản phẩm trong đơn.

#### 4. Hủy đơn hàng (`POST /api/orders/{order_code}/cancel`)
- **Body (JSON)**:
  ```json
  {
    "reason": "Tôi muốn đổi địa chỉ giao hàng"
  }
  ```
  *(Trường `reason` là tùy chọn, tối đa 500 ký tự. Nếu để trống, hệ thống tự động ghi nhận lý do là `"Khách hàng tự hủy đơn"`).*
- **Response (HTTP 200)**:
  ```json
  {
    "message": "Hủy đơn hàng thành công.",
    "order": {
      "order_code": "MS261108ABCD12",
      "status": "cancelled",
      "cancel_reason": "Tôi muốn đổi địa chỉ giao hàng",
      "cancelled_at": "2026-11-08T10:30:00.000000Z",
      ...
    }
  }
  ```

---

## 11. Dừng Hệ Thống Docker

- Dừng containers:
  ```bash
  docker compose down
  ```
- Dừng containers và xóa volumes (chú ý: dữ liệu CSDL trong volume `mysql_data` sẽ bị xóa):
  ```bash
  docker compose down -v
  ```

