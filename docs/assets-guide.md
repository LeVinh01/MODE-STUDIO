# Hướng Dẫn Quản Lý Tài Nguyên Ảnh Nguồn Sản Phẩm - OMBRE

Tài liệu này hướng dẫn quy trình tổ chức thư mục làm việc nguồn (Working Directory) bên ngoài kho lưu trữ Git và các bước tải ảnh sản phẩm lên hệ thống thông qua giao diện Quản trị viên (Admin Panel).

---

## 1. Thư mục làm việc nguồn bên ngoài Repo (Working Folder Outside Repo)

Để giữ cho kho lưu trữ Git (`MODE-STUDIO`) luôn nhẹ, tinh gọn và tránh phình to kích thước bởi các tập tin nhị phân dung lượng lớn (ảnh gốc chất lượng cao, file thiết kế PSD/TIFF), đội ngũ biên tập hình ảnh nên lưu trữ toàn bộ ảnh nguồn tại một thư mục làm việc riêng biệt bên ngoài repository.

### Đường dẫn khuyến nghị:
```
D:\MODE-STUDIO-assets\products\<product-slug>\<color-slug>\01.jpg, 02.jpg, ...
```

*(Lưu ý: Thư mục này nằm hoàn toàn ngoài mã nguồn dự án, không commit lên Git).*

### Cấu trúc chi tiết:
```
D:\MODE-STUDIO-assets\
└── products/
    ├── ao-blazer-len-cashmere-may-do/
    │   ├── den-tuyet-doi/
    │   │   ├── 01.jpg     # Ảnh chính góc nhìn trực diện (Front View / Main Image)
    │   │   ├── 02.jpg     # Góc nhìn nghiêng hoặc phía sau (Side / Back View)
    │   │   └── 03.jpg     # Cận cảnh chi tiết chất liệu, ve áo, khuy cài (Detail Fabric)
    │   └── kem-sua/
    │       ├── 01.jpg
    │       └── 02.jpg
    └── dam-suong-lua-to-tam-thuong-hang/
        ├── be-cat/
        │   ├── 01.jpg
        │   └── 02.jpg
        └── den-nham/
            ├── 01.jpg
            └── 02.jpg
```

---

## 2. Quy chuẩn tập tin ảnh nguồn

- **Quy tắc đặt tên thứ tự**:
  - `01.jpg`: Luôn là ảnh đại diện chính (chụp thẳng toàn thân hoặc 3/4 thân trên, làm ảnh bìa thumbnail sản phẩm).
  - `02.jpg`, `03.jpg`, `04.jpg`: Các góc nhìn bổ trợ, dáng di chuyển (movement), và cận cảnh chất liệu.
- **Tỷ lệ khung hình (Aspect Ratio)**: Chuẩn **4:5** (đồng bộ với toàn bộ giao diện Product Card, Gallery và Lightbox trên storefront).
- **Độ phân giải khuyến nghị**: `800 x 1000 px` hoặc `1200 x 1500 px`.
- **Dung lượng**: Xuất file định dạng `JPG` (chất lượng 82-85%) hoặc `WebP`, dung lượng dao động từ **150 KB – 300 KB** mỗi ảnh. Không tải lên ảnh gốc chưa nén nặng vài MB.

---

## 3. Quy trình tải ảnh lên hệ thống qua Admin Panel

Quản trị viên tải ảnh sản phẩm theo các bước sau:

1. **Đăng nhập vào trang quản trị**: Truy cập hệ thống quản trị tại `/admin` với tài khoản Quản trị viên (`admin@mode.vn`).
2. **Truy cập danh sách sản phẩm**: Chọn menu **Sản phẩm** (`/admin/products`) từ thanh điều hướng bên trái.
3. **Mở trang chỉnh sửa sản phẩm**: Tìm sản phẩm cần cập nhật hình ảnh theo tên hoặc SKU, nhấp vào biểu tượng chỉnh sửa hoặc liên kết chi tiết sản phẩm.
4. **Quản lý album ảnh theo màu**:
   - Trong khu vực **Hình ảnh sản phẩm (Product Images)**, chọn biến thể màu sắc tương ứng (`color_id`).
   - Nhấp **Tải ảnh lên** và chọn ảnh từ thư mục nguồn cục bộ (ví dụ: `D:\MODE-STUDIO-assets\products\ao-blazer-len-cashmere-may-do\den-tuyet-doi\01.jpg`).
   - Đặt ảnh `01.jpg` làm ảnh đại diện chính (`is_main = true`).
   - Tiếp tục tải lên các góc nhìn `02.jpg`, `03.jpg` cho biến thể đó.
5. **Cơ chế lưu trữ tự động của Backend**:
   - Backend Laravel sẽ tiếp nhận file qua endpoint `POST /api/v1/admin/products/{id}/images`.
   - File được lưu vào đĩa lưu trữ công khai: `BackEnd/storage/app/public/products/{productId}/{hash}.jpg`.
   - Hệ thống tự động tạo URL phân phối qua symlink: `http://localhost:8000/storage/products/{productId}/{hash}.jpg`.
6. **Kiểm tra hiển thị Storefront**: Mở trang chi tiết sản phẩm trên Storefront (`/products/{product-slug}`) để xác nhận:
   - Ảnh đại diện hiển thị đúng tỷ lệ 4:5.
   - Khi chuyển đổi giữa các màu sắc, bộ sưu tập ảnh chuyển đúng theo màu đã chọn.
   - Nhấp vào ảnh để mở album Lightbox toàn màn hình kiểm tra độ sắc nét.
