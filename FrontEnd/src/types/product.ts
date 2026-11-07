import type { PaginationMeta } from './common'

export interface ProductCategory {
  id: string
  name: string
  slug: string
  description?: string
  imageUrl?: string | null
  sortOrder?: number
  children?: ProductCategory[]
}

export interface ProductBrand {
  id: string
  name: string
  slug: string
}

export interface ProductColor {
  id: string
  name: string
  hexCode?: string
}

export interface ProductImage {
  id: string
  url: string
  altText?: string
  isMain?: boolean
  sortOrder?: number
  colorId?: number | null
}

export interface ProductVariant {
  id: string
  productId: string
  sku: string
  color: string
  colorHex?: string
  size: string
  price: number
  originalPrice?: number
  stock: number
  images?: string[]
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  category: ProductCategory
  brand?: ProductBrand | null
  basePrice: number
  compareAtPrice?: number | null
  variants?: ProductVariant[]
  isPublished?: boolean
  isFeatured?: boolean
  inStock?: boolean
  publishedAt?: string | null
  featuredImage?: string
  mainImage?: { url: string; altText?: string } | null
  images?: ProductImage[]
  availableColors?: ProductColor[]
  material?: string | null
  gender?: 'women' | 'men' | 'unisex' | null
  isNew?: boolean
  isOutOfStock?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface PaginatedProducts {
  items: Product[]
  meta: PaginationMeta
}
