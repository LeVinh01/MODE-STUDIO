// =============================================================================
// OMBRE ADMIN DASHBOARD - TECHNICAL DESIGN TOKENS & HELPERS
// Restrained Technical Palette: Monochrome neutral greys, red only for cancelled.
// =============================================================================

export const DASHBOARD_THEME = {
  // Monochrome Accents
  accent: '#18181B',
  accentDark: '#FAFAFA',

  // Neutrals
  textPrimary: '#111113',
  textSecondary: '#52525B',
  textMuted: '#71717A',
  bgPage: '#F4F4F6',
  cardBg: '#FFFFFF',
  border: '#E4E4E7',
  borderSubtle: '#F4F4F5',

  // Semantics
  success: '#16A34A',
  warning: '#B45309',
  danger: '#DC2626',
  neutral: '#71717A',

  // Order Status Colors (Restored original semantic colors)
  // Contrast-checked for both Light and Dark themes
  status: {
    pending: '#D97706',   // Amber (Chờ xử lý)
    confirmed: '#2563EB', // Blue (Đã xác nhận)
    shipping: '#6366F1',  // Indigo (Đang giao)
    delivered: '#16A34A', // Green (Đã giao)
    cancelled: '#DC2626', // Red (Đã hủy)
  },
} as const

export const RANGE_OPTIONS = [
  { value: '7d', label: '7 ngày qua', periodText: '7 ngày trước' },
  { value: '30d', label: '30 ngày qua', periodText: '30 ngày trước' },
  { value: '90d', label: '90 ngày qua', periodText: '90 ngày trước' },
  { value: 'this_month', label: 'Tháng này', periodText: 'tháng trước' },
  { value: 'this_quarter', label: 'Quý này', periodText: 'quý trước' },
  { value: 'this_year', label: 'Năm nay', periodText: 'năm trước' },
  { value: 'custom', label: 'Tùy chọn', periodText: 'kỳ trước' },
] as const

export interface DeltaDisplayInfo {
  arrow: string
  text: string
  trendClass: 'positive' | 'negative' | 'neutral'
  screenReaderText: string
}

/**
 * Tính toán hiển thị biến động so với kỳ trước.
 * Hỗ trợ isPoints (điểm phần trăm cho tỷ lệ hủy đơn) và fallback 'Chưa có kỳ trước để so sánh'.
 */
export function getDeltaDisplay(
  delta: number | null,
  periodText: string,
  inverted = false,
  isPoints = false,
): DeltaDisplayInfo {
  if (delta === null || delta === undefined) {
    return {
      arrow: '―',
      text: 'Chưa có kỳ trước để so sánh',
      trendClass: 'neutral',
      screenReaderText: 'Chưa có dữ liệu kỳ trước',
    }
  }

  const unit = isPoints ? ' điểm %' : '%'

  if (delta === 0) {
    return {
      arrow: '―',
      text: `0.0${unit} so với ${periodText}`,
      trendClass: 'neutral',
      screenReaderText: `Không đổi so với ${periodText}`,
    }
  }

  const isPositiveNumber = delta > 0
  const formattedVal = `${Math.abs(delta).toFixed(1)}${unit}`

  if (isPositiveNumber) {
    const isGood = !inverted
    return {
      arrow: '▲',
      text: `${formattedVal} so với ${periodText}`,
      trendClass: isGood ? 'positive' : 'negative',
      screenReaderText: `Tăng ${formattedVal} so với ${periodText}`,
    }
  } else {
    const isGood = inverted
    return {
      arrow: '▼',
      text: `${formattedVal} so với ${periodText}`,
      trendClass: isGood ? 'positive' : 'negative',
      screenReaderText: `Giảm ${formattedVal} so với ${periodText}`,
    }
  }
}
