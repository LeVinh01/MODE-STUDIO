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
  categoryGrid: {
    type: 'category_grid',
    title: 'Tìm theo danh mục',
    ctaLabel: 'XEM TẤT CẢ DANH MỤC',
    ctaHref: '/products',
  },

  // Danh mục loại trừ khỏi tiles và rows (chưa có phụ kiện)
  hiddenCategorySlugs: ['accessories', 'bags', 'belts'],

  // 4 Hàng sản phẩm theo quyết định đã duyệt (hàng không có sản phẩm sẽ tự động ẩn)
  productRows: [
    {
      title: 'Áo khoác & áo ấm',
      categorySlugs: [
        'jackets-blazers',
        'women-coats',
        'women-sweaters',
        'men-jackets',
        'men-coats',
        'men-sweaters',
      ],
      viewAllHref:
        '/products?category=jackets-blazers,women-coats,women-sweaters,men-jackets,men-coats,men-sweaters',
    },
    {
      title: 'Cardigan & Blouse',
      categorySlugs: ['women-cardigans', 'women-blouses', 'men-cardigans'],
      viewAllHref: '/products?category=women-cardigans,women-blouses,men-cardigans',
    },
    {
      title: 'Jeans',
      categorySlugs: ['women-jeans', 'men-jeans'],
      viewAllHref: '/products?category=women-jeans,men-jeans',
    },
    {
      title: 'Quần',
      categorySlugs: ['women-pants', 'men-pants'],
      viewAllHref: '/products?category=women-pants,men-pants',
    },
  ],
}
