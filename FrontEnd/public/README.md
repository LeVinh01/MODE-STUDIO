# Cấu trúc và Quy chuẩn Tài nguyên Tĩnh (Static Media Assets) - MODE STUDIO

Tài liệu hướng dẫn cấu trúc thư mục, quy tắc đặt tên và thông số kỹ thuật khuyến nghị cho các tài nguyên đa phương tiện tĩnh (hình ảnh, biểu ngữ, video) tại thư mục `FrontEnd/public`.

---

## 1. Cấu trúc thư mục (Target Directory Structure)

```
FrontEnd/public/
├── favicon.svg             # Biểu tượng tab trình duyệt (Favicon)
├── icons.svg               # SVG sprite hệ thống biểu tượng
├── README.md               # Tài liệu quy chuẩn này
├── videos/                 # Video tĩnh trình chiếu trên storefront
│   ├── hero.mp4            # Video nền chính cho Hero Video Banner
│   └── hero.webm           # (Tùy chọn) Định dạng WebM tối ưu cho trình duyệt hiện đại
└── images/
    ├── placeholder.jpg     # Ảnh giữ chỗ dự phòng chung khi ảnh sản phẩm gặp sự cố tải
    ├── home/               # Hình ảnh phục vụ riêng cho trang chủ
    │   ├── hero-poster.jpg # Ảnh tĩnh poster của hero video (hiển thị khi chưa phát hoặc tải lỗi)
    │   └── ...             # Các ảnh editorial, lookbook trang chủ
    ├── banners/            # Banner quảng bá, banner danh mục nổi bật và banner chân trang
    │   ├── jackets-blazers-banner.jpg
    │   ├── dresses-banner.jpg
    │   ├── men-banner.jpg
    │   ├── accessories-banner.jpg
    │   └── closing-banner.jpg
    └── categories/         # Ảnh đại diện của các danh mục sản phẩm (Category Tiles)
        ├── jackets-blazers.jpg
        ├── dresses.jpg
        ├── men.jpg
        ├── women.jpg
        ├── accessories.jpg
        └── bags.jpg
```

---

## 2. Quy tắc đặt tên tập tin (Naming Conventions)

- **Chữ thường (lowercase)**: Toàn bộ tên file và thư mục sử dụng chữ thường, không viết hoa.
- **Không dấu tiếng Việt (no accents)**: Không sử dụng dấu thanh, ký tự unicode tiếng Việt có dấu.
- **Ký tự nối gạch ngang (kebab-case)**: Phân tách các từ bằng dấu gạch ngang (`-`), không dùng khoảng trắng hay ký tự đặc biệt (`_`, `@`, `%`, ...).
- **Trùng khớp Slug danh mục (Category Slugs)**: 
  - Ảnh trong `images/categories/` phải đặt tên chính xác theo `slug` của danh mục tương ứng trong cơ sở dữ liệu.
  - Ví dụ: Danh mục *Áo Khoác & Blazer* có slug `jackets-blazers` → Tên file: `jackets-blazers.jpg`.
- **Phần mở rộng tập tin**: Viết thường (`.jpg`, `.png`, `.webp`, `.mp4`, `.webm`).

---

## 3. Thông số kỹ thuật khuyến nghị (Recommended Asset Specs)

### A. Hình ảnh sản phẩm (Product Images) - Tham khảo
*(Lưu ý: Đọc thêm mục 4 để biết nơi lưu trữ ảnh sản phẩm)*
- **Tỷ lệ khung hình (Aspect Ratio)**: Chuẩn thời trang may đo cao cấp **4:5**.
- **Độ phân giải khuyến nghị**:
  - Tiêu chuẩn: `800 x 1000 px`.
  - Chất lượng cao (Hi-DPI / Retina): `1200 x 1500 px`.
- **Định dạng**: `JPG` (mức nén 80-85%) hoặc `WebP`.
- **Dung lượng tối ưu**: Khoảng `150 KB – 300 KB` mỗi ảnh để đảm bảo tải trang tức thì.

### B. Biểu ngữ khuyến mãi & Danh mục (Banners)
- **Chiều rộng**: `1920 px` (chiều cao linh hoạt từ `600 px – 800 px` tùy vị trí).
- **Định dạng**: `JPG` hoặc `WebP`.
- **Dung lượng tối đa**: **Dưới 400 KB**. Tối ưu hóa nén ảnh trước khi đưa vào thư mục để tránh ảnh hưởng chỉ số LCP (Largest Contentful Paint).

### C. Video Hero trang chủ (Hero Video)
- **Định dạng & Codec**: `MP4` (chuẩn mã hóa video `H.264`, âm thanh tắt/muted). Có thể bổ sung thêm file `hero.webm` (VP9) để tối ưu dung lượng cho Chrome/Edge/Firefox.
- **Độ phân giải**: `1280 x 720 px` (720p) hoặc `1920 x 1080 px` (1080p).
- **Thuộc tính bắt buộc**:
  - Chạy lặp vô tận (`loop`).
  - Tắt âm thanh mặc định (`muted`).
  - Hỗ trợ phát nội tuyến trên di động (`playsInline`).
- **Dung lượng**: Tối ưu trong khoảng **5 MB – 8 MB** (không vượt quá 10 MB để tránh áp lực băng thông và kích thước repository git).
- **Yêu cầu Poster bắt buộc**: Luôn phải đi kèm ảnh tĩnh poster (`/images/home/hero-poster.jpg`) để hiển thị ngay lập tức khi video đang tải, hoặc khi người dùng bật chế độ tiết kiệm dữ liệu / giảm hiệu ứng chuyển động (`prefers-reduced-motion`).

---

## 4. Lưu ý quan trọng về Ảnh Sản Phẩm (Product Images Storage)

> [!IMPORTANT]
> **Ảnh sản phẩm KHÔNG được lưu trữ trong thư mục `FrontEnd/public/` này.**
> 
> - **Cơ chế lưu trữ**: Ảnh sản phẩm được quản trị viên tải lên trực tiếp thông qua giao diện Quản lý sản phẩm (Admin Panel). Backend Laravel sẽ tiếp nhận và lưu trữ tại đĩa `public`: `BackEnd/storage/app/public/products/{productId}/{filename}.jpg`.
> - **Cơ chế phân phối (Serving)**: Nhờ symlink `php artisan storage:link`, các ảnh này được máy chủ phục vụ trực tiếp tại URL `/storage/products/{productId}/{filename}.jpg`.
> - **Dữ liệu mẫu (Seed Data)**: Khi chạy seeder mặc định (`php artisan db:seed`), hệ thống sinh URL placeholder tự động từ dịch vụ ngoài: `https://placehold.co/800x1000/{hexClean}/{textColor}`.
> - Xem hướng dẫn chuẩn bị ảnh nguồn và quy trình upload tại: `docs/assets-guide.md`.
