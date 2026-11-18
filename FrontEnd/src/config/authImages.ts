/**
 * CẤU HÌNH HÌNH ẢNH XÁC THỰC (ĐĂNG NHẬP / ĐĂNG KÝ)
 *
 * Hình ảnh chính thức được đặt trong thư mục public/images/auth/.
 * Cấu hình bao gồm: đường dẫn (src), văn bản thay thế (alt) và tiêu điểm (objectPosition)
 * giúp ảnh luôn giữ trọn vẹn khuôn mặt người mẫu trên mọi kích thước màn hình desktop.
 */

export interface AuthImageData {
  src: string
  alt: string
  objectPosition: string
}

export const AUTH_IMAGES = {
  login: {
    src: '/images/auth/login.webp',
    alt: 'Bốn người mẫu OMBRE trong trang phục áo khoác dạ dáng dài tông đen thanh lịch',
    objectPosition: '50% 15%',
  },
  register: {
    src: '/images/auth/register.webp',
    alt: 'Người mẫu nam OMBRE ngồi trên ghế tựa studio trong trang phục áo khoác da lộn và quần âu',
    objectPosition: '50% 25%',
  },
} as const
