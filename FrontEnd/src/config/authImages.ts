/**
 * CẤU HÌNH ĐƯỜNG DẪN HÌNH ẢNH XÁC THỰC (ĐĂNG NHẬP / ĐĂNG KÝ)
 *
 * Hình ảnh chính thức được đặt trong thư mục public/images/auth/.
 * Khi chưa có hình ảnh hoặc hình ảnh lỗi tải, AuthLayout tự động
 * hiển thị khung màu kem thương hiệu + chữ MODE STUDIO chuẩn tối giản.
 */
export const AUTH_IMAGES = {
  login: '/images/auth/login.jpg',
  register: '/images/auth/register.jpg',
} as const
