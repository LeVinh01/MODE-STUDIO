/**
 * Utility functions for formatting values across MODE STUDIO
 */

/**
 * Format a numeric amount into Vietnamese Dong (VND) currency string
 * e.g., 2500000 -> "2.500.000 ₫"
 */
export const formatCurrency = (amount: number): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0 ₫'
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

/**
 * Format an ISO date string into Vietnamese locale format
 * e.g., "2026-11-09T08:30:00Z" -> "09/11/2026 15:30"
 */
export const formatDateTime = (dateString?: string): string => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  } catch {
    return dateString
  }
}

/**
 * Format date string into "DD/MM/YYYY" (or "MM/YYYY" if input is "YYYY-MM")
 */
export const formatDate = (dateString?: string): string => {
  if (!dateString) return ''
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-')
      return `${day}/${month}/${year}`
    }
    if (/^\d{4}-\d{2}$/.test(dateString)) {
      const [year, month] = dateString.split('-')
      return `${month}/${year}`
    }
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  } catch {
    return dateString
  }
}

/**
 * Lấy chuỗi ngày YYYY-MM-DD theo múi giờ Việt Nam (Asia/Ho_Chi_Minh)
 */
export const getVnDateString = (date: Date = new Date()): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(date)
}

/**
 * Ngày hôm nay theo giờ Việt Nam (YYYY-MM-DD)
 */
export const getTodayVn = (): string => {
  return getVnDateString(new Date())
}

/**
 * Ngày cách đây N ngày theo giờ Việt Nam (YYYY-MM-DD)
 */
export const getDaysAgoVn = (days: number): string => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return getVnDateString(d)
}

/**
 * Ngày đầu tháng hiện tại theo giờ Việt Nam (YYYY-MM-01)
 */
export const getStartOfMonthVn = (): string => {
  const todayStr = getTodayVn()
  const [year, month] = todayStr.split('-')
  return `${year}-${month}-01`
}


