/**
 * Types cho dữ liệu thô từ Backend API (snake_case)
 */

export interface ApiPaginationMeta {
  current_page: number
  from: number | null
  last_page: number
  links?: Array<{ url: string | null; label: string; active: boolean; page?: number | null }>
  path: string
  per_page: number
  to: number | null
  total: number
}

export interface ApiPaginationLinks {
  first: string | null
  last: string | null
  prev: string | null
  next: string | null
}

export interface ApiPaginatedResponse<T> {
  data: T[]
  links: ApiPaginationLinks
  meta: ApiPaginationMeta
}

export interface ApiSingleResponse<T> {
  data: T
}

export interface ApiCategoryItem {
  id: number
  name: string
  slug: string
  description: string | null
  image_url: string | null
  sort_order: number
  children?: ApiCategoryItem[]
}

export interface ApiProductListItem {
  id: number
  name: string
  slug: string
  base_price: number
  compare_at_price: number | null
  is_featured: boolean
  in_stock: boolean
  published_at: string | null
  category: {
    id: number
    name: string
    slug: string
  }
  brand: {
    id: number
    name: string
    slug: string
  } | null
  main_image: {
    url: string
    alt_text: string | null
  } | null
  available_colors: Array<{
    id: number
    name: string
    hex_code: string | null
  }>
}

export interface ApiProductVariantItem {
  id: number
  sku: string
  stock_quantity: number
  is_active: boolean
  color: {
    id: number
    name: string
    hex_code: string | null
  }
  size: {
    id: number
    name: string
    sort_order: number
  }
}

export interface ApiProductImageItem {
  id: number
  url: string
  alt_text: string | null
  is_main: boolean
  sort_order: number
  color_id: number | null
}

export interface ApiProductDetailItem {
  id: number
  name: string
  slug: string
  description: string | null
  material: string | null
  gender: 'women' | 'men' | 'unisex' | null
  base_price: number
  compare_at_price: number | null
  is_featured: boolean
  in_stock: boolean
  published_at: string | null
  category: {
    id: number
    name: string
    slug: string
  }
  brand: {
    id: number
    name: string
    slug: string
  } | null
  images: ApiProductImageItem[]
  variants: ApiProductVariantItem[]
}

/**
 * Tham số query gọi từ Frontend (chuẩn camelCase)
 */
export interface ProductQueryFilter {
  category?: string
  brand?: string
  color?: string | number[]
  size?: string | number[]
  minPrice?: number
  maxPrice?: number
  gender?: 'women' | 'men' | 'unisex'
  q?: string
  featured?: boolean
  sort?: 'newest' | 'price_asc' | 'price_desc'
  perPage?: number
  page?: number
}
