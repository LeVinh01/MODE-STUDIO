/**
 * Single Source of Truth for Brand Identity across FrontEnd.
 * Use BRAND_NAME everywhere the brand name is displayed to users.
 */
export const BRAND_NAME = 'OMBRE'
export const BRAND_TAGLINE = 'Modern Luxury & Editorial Fashion'

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
