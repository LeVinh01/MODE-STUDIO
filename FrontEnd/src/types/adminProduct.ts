import type { ProductStatus } from '@/config/productStatus'

export type { ProductStatus }

export type ProductGender = 'women' | 'men' | 'unisex'

/**
 * Types cho DTO Backend trả về (snake_case)
 */
export interface ApiAdminProductCategory {
  id: number
  name: string
  slug: string
  parent_id?: number | null
}

export interface ApiAdminProductBrand {
  id: number
  name: string
  slug: string
}

export interface ApiAdminProductMainImage {
  id: number
  image_url: string
  alt_text: string | null
}

export interface ApiAdminProductListItem {
  id: number
  name: string
  slug: string
  gender: ProductGender
  base_price: number
  compare_at_price: number | null
  status: ProductStatus
  is_featured: boolean
  variants_count: number
  total_stock: number
  published_at: string | null
  created_at: string
  updated_at: string
  category: ApiAdminProductCategory | null
  brand: ApiAdminProductBrand | null
  main_image: ApiAdminProductMainImage | null
}

export interface ApiAdminVariantItem {
  id: number
  product_id: number
  color_id: number
  size_id: number
  sku: string
  stock_quantity: number
  is_active: boolean
  note: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  color?: { id: number; name: string; hex_code: string } | null
  size?: { id: number; name: string } | null
}

export interface ApiAdminImageItem {
  id: number
  product_id: number
  color_id: number | null
  image_url: string
  alt_text: string | null
  is_main: boolean
  sort_order: number
  color?: { id: number; name: string; hex_code: string } | null
  created_at?: string
  updated_at?: string
}

export interface ApiAdminProductDetail extends ApiAdminProductListItem {
  description: string | null
  material: string | null
  variants?: ApiAdminVariantItem[]
  images?: ApiAdminImageItem[]
}

export interface ApiAdminLookupColor {
  id: number
  name: string
  hex_code: string
}

export interface ApiAdminLookupSize {
  id: number
  name: string
  sort_order: number
}

export interface ApiAdminLookupGender {
  value: ProductGender
  label: string
}

export interface ApiAdminLookupStatus {
  value: ProductStatus
  label: string
}

export interface ApiAdminLookups {
  categories: ApiAdminProductCategory[]
  brands: ApiAdminProductBrand[]
  colors: ApiAdminLookupColor[]
  sizes: ApiAdminLookupSize[]
  genders: ApiAdminLookupGender[]
  statuses: ApiAdminLookupStatus[]
}

/**
 * Types cho Frontend Domain (camelCase)
 */
export interface AdminProductCategory {
  id: number
  name: string
  slug: string
  parentId?: number | null
}

export interface AdminProductBrand {
  id: number
  name: string
  slug: string
}

export interface AdminProductMainImage {
  id: number
  imageUrl: string
  altText: string | null
}

export interface AdminProductListItem {
  id: number
  name: string
  slug: string
  gender: ProductGender
  basePrice: number
  compareAtPrice: number | null
  status: ProductStatus
  isFeatured: boolean
  variantsCount: number
  totalStock: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  category: AdminProductCategory | null
  brand: AdminProductBrand | null
  mainImage: AdminProductMainImage | null
}

export interface AdminProductDetail extends AdminProductListItem {
  description: string | null
  material: string | null
  variants: ApiAdminVariantItem[]
  images: ApiAdminImageItem[]
}

export interface AdminLookups {
  categories: AdminProductCategory[]
  brands: AdminProductBrand[]
  colors: ApiAdminLookupColor[]
  sizes: ApiAdminLookupSize[]
  genders: ApiAdminLookupGender[]
  statuses: ApiAdminLookupStatus[]
}

/**
 * Params lọc danh sách sản phẩm admin
 */
export interface AdminProductFilterParams {
  search?: string
  status?: string
  category_id?: number | string
  brand_id?: number | string
  page?: number
  per_page?: number
}

/**
 * Payload gửi lên Backend (snake_case)
 */
export interface AdminProductStorePayload {
  name: string
  slug?: string | null
  description?: string | null
  material?: string | null
  gender: ProductGender
  category_id: number
  brand_id: number
  base_price: number
  compare_at_price?: number | null
  status?: ProductStatus
  is_featured?: boolean
  published_at?: string | null
}

export type AdminProductUpdatePayload = Partial<AdminProductStorePayload>

/**
 * Form values dùng trong component ProductForm
 */
export interface ProductFormValues {
  name: string
  slug: string
  description: string
  material: string
  gender: ProductGender | ''
  categoryId: number | ''
  brandId: number | ''
  basePrice: string
  compareAtPrice: string
  isFeatured: boolean
  status: ProductStatus
}
