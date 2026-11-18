/**
 * Configuration for HomePage Section-based Layout
 * Single source of truth for home sections, category mapping, and hidden categories.
 */

export interface HeroSectionConfig {
  type: 'hero'
  videoSrc: string
  poster: string
  title: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
}

export interface CategoryGridSectionConfig {
  type: 'category_grid'
  title: string
  ctaLabel: string
  ctaHref: string
}

export interface PromoCategorySectionConfig {
  type: 'promo_category'
  title: string
  subtitle?: string
  description?: string
  categorySlug: string
  bannerImage?: string
  image?: string
  ctaLabel?: string
  ctaHref: string
}

export interface ClosingBannerSectionConfig {
  type: 'closing_banner'
  title: string
  subtitle?: string
  image: string
  ctaLabel: string
  ctaHref: string
}

export interface HomeProductRowConfig {
  title: string
  categorySlugs: string[]
  viewAllHref: string
}

export type HomeGender = 'women' | 'men'

export interface HomeGenderConfig {
  categoryGrid: CategoryGridSectionConfig
  productRows: HomeProductRowConfig[]
}

export const GENDER_HOME_CONFIG: Record<HomeGender, HomeGenderConfig> = {
  women: {
    categoryGrid: {
      type: 'category_grid',
      title: 'Tìm theo danh mục',
      ctaLabel: 'XEM TẤT CẢ DANH MỤC NỮ',
      ctaHref: '/products?category=women',
    },
    productRows: [
      {
        title: 'Áo khoác & áo ấm',
        categorySlugs: ['jackets-blazers', 'women-coats', 'women-sweaters'],
        viewAllHref: '/products?category=jackets-blazers,women-coats,women-sweaters',
      },
      {
        title: 'Cardigan & Blouse',
        categorySlugs: ['women-cardigans', 'women-blouses'],
        viewAllHref: '/products?category=women-cardigans,women-blouses',
      },
      {
        title: 'Jeans',
        categorySlugs: ['women-jeans'],
        viewAllHref: '/products?category=women-jeans',
      },
      {
        title: 'Quần',
        categorySlugs: ['women-pants'],
        viewAllHref: '/products?category=women-pants',
      },
    ],
  },
  men: {
    categoryGrid: {
      type: 'category_grid',
      title: 'Tìm theo danh mục',
      ctaLabel: 'XEM TẤT CẢ DANH MỤC NAM',
      ctaHref: '/products?category=men',
    },
    productRows: [
      {
        title: 'Áo khoác & áo ấm',
        categorySlugs: ['men-jackets', 'men-coats', 'men-sweaters'],
        viewAllHref: '/products?category=men-jackets,men-coats,men-sweaters',
      },
      {
        title: 'Cardigan & Sơ mi',
        categorySlugs: ['men-cardigans', 'men-shirts'],
        viewAllHref: '/products?category=men-cardigans,men-shirts',
      },
      {
        title: 'Jeans',
        categorySlugs: ['men-jeans'],
        viewAllHref: '/products?category=men-jeans',
      },
      {
        title: 'Quần',
        categorySlugs: ['men-pants'],
        viewAllHref: '/products?category=men-pants',
      },
    ],
  },
}

export interface HomeConfig {
  hero: HeroSectionConfig
  categoryGrid: CategoryGridSectionConfig
  hiddenCategorySlugs: string[]
  productRows: HomeProductRowConfig[]
}

export const HOME_CONFIG: HomeConfig = {
  // S1: Hero Video Banner
  hero: {
    type: 'hero',
    videoSrc: '/videos/hero.mp4',
    poster: '/images/home/hero-poster.jpg',
    title: 'NGHỆ THUẬT MAY ĐO HIỆN ĐẠI',
    subtitle: 'Bộ sưu tập tối giản chế tác từ sợi len và chất liệu tự nhiên thượng hạng',
    ctaLabel: 'KHÁM PHÁ BỘ SƯU TẬP',
    ctaHref: '/products',
  },

  // S2: Category Icon Grid
  categoryGrid: GENDER_HOME_CONFIG.women.categoryGrid,

  // Danh mục loại trừ khỏi tiles và rows (chưa có phụ kiện)
  hiddenCategorySlugs: ['accessories', 'bags', 'belts'],

  // 4 Hàng sản phẩm mặc định (nữ)
  productRows: GENDER_HOME_CONFIG.women.productRows,
}
