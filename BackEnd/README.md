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

## 9. Dừng Hệ Thống Docker

- Dừng containers:
  ```bash
  docker compose down
  ```
- Dừng containers và xóa volumes (chú ý: dữ liệu CSDL trong volume `mysql_data` sẽ bị xóa):
  ```bash
  docker compose down -v
  ```

