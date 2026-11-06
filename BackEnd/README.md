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
Chạy Composer install trực tiếp bên trong container `app`:

```bash
docker compose exec app composer install
```

### Bước 3: Tạo khóa ứng dụng (Application Key)
Nếu file `.env` chưa có `APP_KEY` hoặc muốn tạo mới:

```bash
docker compose exec app php artisan key:generate
```

---

## 3. LƯU Ý QUAN TRỌNG VỀ LỆNH ARTISAN

> **QUAN TRỌNG**: Do cấu hình cơ sở dữ liệu sử dụng mạng nội bộ Docker (`DB_HOST=mysql`), **MỌI lệnh `artisan` hoặc CLI PHẢI được thực thi thông qua container `app`**:
>
> ```bash
> docker compose exec app php artisan <tên_lệnh>
> ```
>
> **Ví dụ**:
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

## 5. Dừng Hệ Thống Docker

- Dừng containers:
  ```bash
  docker compose down
  ```
- Dừng containers và xóa volumes (chú ý: dữ liệu CSDL trong volume `mysql_data` sẽ bị xóa):
  ```bash
  docker compose down -v
  ```
