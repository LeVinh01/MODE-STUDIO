import { STORE_POLICIES } from './store'

export interface NavItem {
  label: string
  to: string
  badge?: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export interface SocialLink {
  label: string
  href: string
  target: string
  rel: string
}

export const ANNOUNCEMENT_CONFIG = {
  storageKey: 'mode_studio_announcement_dismissed',
  text: `MIỄN PHÍ VẬN CHUYỂN TOÀN QUỐC CHO ĐƠN TỪ ${(
    STORE_POLICIES.freeShippingThreshold
  ).toLocaleString('vi-VN')} Đ • KHÁM PHÁ BỘ SƯU TẬP MỚI`,
  shortText: `MIỄN PHÍ VẬN CHUYỂN TỪ ${(
    STORE_POLICIES.freeShippingThreshold / 1000000
  ).toLocaleString('vi-VN')} TRIỆU`,
  linkText: 'XEM NGAY',
  linkTo: '/products',
}

export const MAIN_NAVIGATION: NavItem[] = [
  { label: 'Bộ Sưu Tập', to: '/products' },
  { label: 'Nữ', to: '/products?category=women' },
  { label: 'Nam', to: '/products?category=men' },
  { label: 'Phụ Kiện', to: '/products?category=accessories' },
]

export const FOOTER_SECTIONS: NavSection[] = [
  {
    title: 'Mua Sắm',
    items: [
      { label: 'Bộ Sưu Tập Mới', to: '/products' },
      { label: 'Thời Trang Nữ', to: '/products?category=women' },
      { label: 'Thời Trang Nam', to: '/products?category=men' },
      { label: 'Phụ Kiện Tinh Tuyển', to: '/products?category=accessories' },
    ],
  },
  {
    title: 'Dịch Vụ Khách Hàng',
    items: [
      { label: 'Chính Sách Đổi Trả', to: '/policy/returns' },
      { label: 'Hướng Dẫn Chọn Size', to: '/size-guide' },
      { label: 'Giao Hàng & Vận Chuyển', to: '/shipping' },
      { label: 'Câu Hỏi Thường Gặp (FAQ)', to: '/faq' },
    ],
  },
  {
    title: 'Về MODE STUDIO',
    items: [
      { label: 'Câu Chuyện Thương Hiệu', to: '/about' },
      { label: 'Triết Lý Thiết Kế', to: '/editorial' },
      { label: 'Hệ Thống Showroom', to: '/stores' },
      { label: 'Liên Hệ Hợp Tác', to: '/contact' },
    ],
  },
]

/**
 * Liên kết mạng xã hội chính thức
 * Quy tắc: Chỉ hiển thị các mạng xã hội có URL khác rỗng (href.trim() !== '').
 * Mặc định để chuỗi rỗng '' để ẩn đi khi chưa có kênh chính thức.
 */
export const SOCIAL_LINKS: SocialLink[] = [
  {
    label: 'Instagram',
    href: '', // Để trống để ẩn; điền URL ví dụ: 'https://instagram.com/modestudio'
    target: '_blank',
    rel: 'noopener noreferrer',
  },
  {
    label: 'Facebook',
    href: '', // Để trống để ẩn; điền URL ví dụ: 'https://facebook.com/modestudio'
    target: '_blank',
    rel: 'noopener noreferrer',
  },
  {
    label: 'Pinterest',
    href: '', // Để trống để ẩn
    target: '_blank',
    rel: 'noopener noreferrer',
  },
  {
    label: 'TikTok',
    href: '', // Để trống để ẩn
    target: '_blank',
    rel: 'noopener noreferrer',
  },
]

