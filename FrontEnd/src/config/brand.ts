/**
 * Single Source of Truth for Brand Identity across FrontEnd.
 * Use BRAND_NAME everywhere the brand name is displayed to users.
 */
export const BRAND_NAME = 'OMBRE'
export const BRAND_TAGLINE = 'Modern Luxury & Editorial Fashion'

export const BRAND_LOGOS = {
  cream: '/images/brand/ombre-logo-cream.png',
  burgundy: '/images/brand/ombre-logo-burgundy.png',
  width: 791,
  height: 501,
} as const

/**
 * Helper to format document title consistently:
 * e.g. "Tìm kiếm | OMBRE" or "OMBRE | Modern Luxury & Editorial Fashion"
 */
export const formatPageTitle = (pageTitle?: string): string => {
  if (!pageTitle || pageTitle.trim() === '') {
    return `${BRAND_NAME} | ${BRAND_TAGLINE}`
  }
  return `${pageTitle} | ${BRAND_NAME}`
}
