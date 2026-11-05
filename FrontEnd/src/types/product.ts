export interface ProductCategory {
  id: string
  name: string
  slug: string
  description?: string
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
  basePrice: number
  variants: ProductVariant[]
  isPublished: boolean
  featuredImage?: string
  isNew?: boolean
  isOutOfStock?: boolean
  createdAt?: string
  updatedAt?: string
}

