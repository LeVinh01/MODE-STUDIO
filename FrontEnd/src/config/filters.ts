/**
 * CẤU HÌNH BẢNG TRA CỨU BỘ LỌC CỐ ĐỊNH (MÀU SẮC, KÍCH CỠ, GIỚI TÍNH, SẮP XẾP)
 *
 * LƯU Ý QUAN TRỌNG:
 * Các giá trị `id` trong file này BẮT BUỘC phải khớp chính xác với dữ liệu seed trong
 * database backend (MySQL). Nếu cơ sở dữ liệu thay đổi hoặc re-seed với ID khác,
 * BẮT BUỘC phải cập nhật lại file cấu hình này để tính năng lọc hoạt động chính xác.
 */

export interface FilterColorOption {
  id: string
  name: string
  hex: string
}

export interface FilterSizeOption {
  id: string
  name: string
}

export interface FilterGenderOption {
  label: string
  value: '' | 'women' | 'men' | 'unisex'
}

export interface FilterPriceRangeOption {
  id: string
  label: string
  minPrice?: number
  maxPrice?: number
}

export interface SortOption {
  label: string
  value: 'newest' | 'price_asc' | 'price_desc'
}

/**
 * 13 màu chuẩn từ Database Seed
 */
export const FILTER_COLORS: FilterColorOption[] = [
  { id: '1', name: 'Đen Tuyệt Đối', hex: '#111111' },
  { id: '2', name: 'Đen Nhám', hex: '#1a1816' },
  { id: '3', name: 'Kem Sữa', hex: '#f5f3ef' },
  { id: '4', name: 'Be Cát', hex: '#efece6' },
  { id: '5', name: 'Xám Than', hex: '#2c2824' },
  { id: '6', name: 'Xanh Đêm', hex: '#1d2a3a' },
  { id: '7', name: 'Trắng Tinh Khiết', hex: '#ffffff' },
  { id: '8', name: 'Xanh Khói Nhạt', hex: '#d8e2dc' },
  { id: '9', name: 'Taupe Ấm', hex: '#d8d1c5' },
  { id: '10', name: 'Nâu Da Bò', hex: '#8b5a2b' },
  { id: '11', name: 'Nâu Lạc Đà', hex: '#c19a6b' },
  { id: '12', name: 'Xám Đá', hex: '#7d766c' },
  { id: '13', name: 'Nâu Cổ Điển', hex: '#5c4033' },
]

/**
 * 5 kích thước (size) chuẩn từ Database Seed
 */
export const FILTER_SIZES: FilterSizeOption[] = [
  { id: '1', name: 'S' },
  { id: '2', name: 'M' },
  { id: '3', name: 'L' },
  { id: '4', name: 'XL' },
  { id: '5', name: 'One Size' },
]

/**
 * Tùy chọn lọc giới tính (chỉ chọn MỘT giá trị)
 */
export const FILTER_GENDERS: FilterGenderOption[] = [
  { label: 'Tất Cả', value: '' },
  { label: 'Thời Trang Nữ', value: 'women' },
  { label: 'Thời Trang Nam', value: 'men' },
  { label: 'Unisex', value: 'unisex' },
]

/**
 * Khoảng giá gợi ý
 */
export const FILTER_PRICE_RANGES: FilterPriceRangeOption[] = [
  { id: 'all', label: 'Tất Cả Mức Giá' },
  { id: 'under-1500', label: 'Dưới 1.500.000 đ', maxPrice: 1500000 },
  { id: '1500-3000', label: '1.500.000 đ - 3.000.000 đ', minPrice: 1500000, maxPrice: 3000000 },
  { id: '3000-5000', label: '3.000.000 đ - 5.000.000 đ', minPrice: 3000000, maxPrice: 5000000 },
  { id: 'over-5000', label: 'Trên 5.000.000 đ', minPrice: 5000000 },
]

/**
 * Tùy chọn sắp xếp khớp với Backend API
 */
export const SORT_OPTIONS: SortOption[] = [
  { label: 'Mới Nhất', value: 'newest' },
  { label: 'Giá: Thấp Đến Cao', value: 'price_asc' },
  { label: 'Giá: Cao Đến Thấp', value: 'price_desc' },
]

export const DEFAULT_PER_PAGE = 12
