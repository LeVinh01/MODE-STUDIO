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

