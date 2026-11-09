/**
 * Global store policies and settings for MODE STUDIO
 * Centralized source of truth for business rules (shipping thresholds, return periods, etc.)
 */

export const STORE_POLICIES = {
  freeShippingThreshold: 2000000, // 2.000.000 VND
  standardShippingFee: 30000, // 30.000 VND (phí vận chuyển tiêu chuẩn dưới ngưỡng)
  returnPeriodDays: 14, // 14 ngày
  brandName: 'MODE STUDIO',
  slogan: 'Thời trang may đo & thiết kế tối giản',
} as const

export interface ServiceHighlight {
  id: string
  title: string
  description: string
  iconName: 'Truck' | 'RefreshCw' | 'ShieldCheck' | 'Sparkles'
}

export const STORE_SERVICE_HIGHLIGHTS: ServiceHighlight[] = [
  {
    id: 'shipping',
    title: 'Giao Hàng May Đo Toàn Quốc',
    description: `Miễn phí vận chuyển tiêu chuẩn cho mọi đơn hàng từ ${(
      STORE_POLICIES.freeShippingThreshold / 1000000
    ).toLocaleString('vi-VN')} triệu đồng.`,
    iconName: 'Truck',
  },
  {
    id: 'returns',
    title: `Đổi Trả Linh Hoạt Trong ${STORE_POLICIES.returnPeriodDays} Ngày`,
    description: 'Hỗ trợ đổi size tận nơi chu đáo, bảo đảm trang phục vừa vặn hoàn hảo.',
    iconName: 'RefreshCw',
  },
  {
    id: 'quality',
    title: 'Chất Lượng Thượng Hạng',
    description: '100% sợi tự nhiên cao cấp (Cashmere, Silk, Wool 130s) và may đo tinh xảo.',
    iconName: 'ShieldCheck',
  },
  {
    id: 'fitting',
    title: 'Dịch Vụ May Đo & Fitting Riêng',
    description: 'Chỉnh sửa theo số đo cá nhân nhằm tôn vinh đường nét hình thể riêng biệt.',
    iconName: 'Sparkles',
  },
]

