/**
 * Chuyển đổi chuỗi tiếng Việt có dấu thành slug không dấu chuẩn URL
 * Ví dụ: "Áo Polo Thể Thao Nam Cao Cấp!" -> "ao-polo-the-thao-nam-cao-cap"
 */
export const slugify = (str: string): string => {
  if (!str) return ''

  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Bỏ các dấu thanh
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '') // Bỏ ký tự đặc biệt
    .trim()
    .replace(/[\s_]+/g, '-') // Thay khoảng trắng hoặc gạch dưới bằng gạch nối
    .replace(/-+/g, '-') // Bỏ các gạch nối liên tiếp
    .replace(/^-+|-+$/g, '') // Bỏ gạch nối ở đầu/cuối
}
