import type { ProductStatus } from '@/config/productStatus'

export type { ProductStatus }

export type ProductGender = 'women' | 'men' | 'unisex'

export type ProductFormTab = 'basic' | 'variants' | 'images'

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

export interface ApiAdminStockAdjustmentUser {
  id: number
  full_name: string
  email: string
  role: string
}

export interface ApiAdminStockAdjustment {
  id: number
  variant_id: number
  quantity_before: number
  delta: number
  quantity_after: number
  reason: string
  changed_by?: ApiAdminStockAdjustmentUser | null
  created_at: string
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

export interface AdminVariantColor {
  id: number
  name: string
  hexCode: string
}

export interface AdminVariantSize {
  id: number
  name: string
}

export interface AdminVariantItem {
  id: number
  productId: number
  colorId: number
  sizeId: number
  sku: string
  stockQuantity: number
  isActive: boolean
  note: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  color: AdminVariantColor | null
  size: AdminVariantSize | null
}

export interface AdminImageItem {
  id: number
  productId: number
  colorId: number | null
  imageUrl: string
  altText: string | null
  isMain: boolean
  sortOrder: number
  color: AdminVariantColor | null
  createdAt?: string
  updatedAt?: string
}

export interface AdminStockAdjustmentUser {
  id: number
  fullName: string
  email: string
  role: string
}

export interface AdminStockAdjustmentItem {
  id: number
  variantId: number
  quantityBefore: number
  delta: number
  quantityAfter: number
  reason: string
  changedBy: AdminStockAdjustmentUser | null
  createdAt: string
}

export interface AdminProductDetail extends AdminProductListItem {
  description: string | null
  material: string | null
  variants: AdminVariantItem[]
  images: AdminImageItem[]
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

export interface AdminVariantStorePayload {
  color_id: number
  size_id: number
  sku?: string | null
  stock_quantity: number
  is_active?: boolean
  note?: string | null
}

export interface AdminVariantUpdatePayload {
  color_id?: number
  size_id?: number
  sku?: string | null
  is_active?: boolean
  note?: string | null
}

export type StockAdjustmentType = 'set' | 'increment' | 'decrement'

export interface AdminStockAdjustmentPayload {
  type: StockAdjustmentType
  quantity: number
  reason: string
}

export interface AdminProductImageUpdatePayload {
  color_id?: number | null
  alt_text?: string | null
  is_main?: boolean
  sort_order?: number
}

/**
 * Form values dùng trong component ProductForm (Tab Thông tin cơ bản)
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
