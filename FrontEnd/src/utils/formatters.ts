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

