/**
 * Configuration for HomePage Section-based Layout
 * Single source of truth for home sections, banners, copy, and category mapping.
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
  categorySlug: 'jackets-blazers' | 'dresses' | 'men' | 'accessories' | string
  title: string
  description: string
  bannerImage: string
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

export interface HomeConfig {
  hero: HeroSectionConfig
  categoryGrid: CategoryGridSectionConfig
  featuredCategories: PromoCategorySectionConfig[]
  closingBanner: ClosingBannerSectionConfig
}

export const HOME_CONFIG: HomeConfig = {
  // S1: Hero Video Banner
  hero: {
    type: 'hero',
    videoSrc: '/videos/hero.mp4',
    poster: '/images/hero-poster.jpg',
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

  // S3 & S4: 4 Featured Categories in explicit order
  featuredCategories: [
    {
      type: 'promo_category',
      categorySlug: 'jackets-blazers',
      title: 'Áo Khoác & Blazer May Đo',
      description:
        'Phom dáng sắc sảo, cấu trúc vai chuẩn mực cùng chất liệu len cao cấp cho trang phục thường nhật và công sở.',
      bannerImage: '/images/banners/jackets-blazers-banner.jpg',
      ctaHref: '/products?category=jackets-blazers',
    },
    {
      type: 'promo_category',
      categorySlug: 'dresses',
      title: 'Đầm & Váy Thanh Lịch',
      description:
        'Đường cắt tối giản, chất liệu lụa và sợi dệt tự nhiên tôn vinh nét đẹp thanh tao vượt thời gian.',
      bannerImage: '/images/banners/dresses-banner.jpg',
      ctaHref: '/products?category=dresses',
    },
    {
      type: 'promo_category',
      categorySlug: 'men',
      title: 'Thời Trang Nam Chuẩn Mực',
      description:
        'Trang phục may đo quý ông hiện đại với các thiết kế tối giản, sắc sảo từ chất liệu chọn lọc.',
      bannerImage: '/images/banners/men-banner.jpg',
      ctaHref: '/products?category=men',
    },
    {
      type: 'promo_category',
      categorySlug: 'accessories',
      title: 'Phụ Kiện Da & Thủ Công',
      description:
        'Túi xách và thắt lưng da chế tác tỉ mỉ, điểm nhấn hoàn thiện bộ trang phục tinh tế.',
      bannerImage: '/images/banners/accessories-banner.jpg',
      ctaHref: '/products?category=accessories',
    },
  ],

  // S5: Closing Banner
  closingBanner: {
    type: 'closing_banner',
    title: 'HÀNH TRÌNH TÌM KIẾM PHONG CÁCH BỀN VỮNG',
    subtitle: 'Khám phá toàn bộ các thiết kế may đo cao cấp của MODE STUDIO',
    image: '/images/banners/closing-banner.jpg',
    ctaLabel: 'Khám phá thêm',
    ctaHref: '/products',
  },
}
