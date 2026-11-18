import type { ApiPaginationMeta } from '@/types/api'

export interface ApiAdminCategoryParent {
  id: number
  name: string
  slug: string
}

export interface ApiAdminCategoryItem {
  id: number
  name: string
  slug: string
  parent_id: number | null
  description: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  products_count: number
  children_count: number
  parent?: ApiAdminCategoryParent | null
  created_at?: string
  updated_at?: string
}

export interface AdminCategoryParent {
  id: number
  name: string
  slug: string
}

export interface AdminCategoryItem {
  id: number
  name: string
  slug: string
  parentId: number | null
  description: string | null
  imageUrl: string | null
  sortOrder: number
  isActive: boolean
  productsCount: number
  childrenCount: number
  parent: AdminCategoryParent | null
  createdAt?: string
  updatedAt?: string
}

export interface AdminCategoryStorePayload {
  name: string
  slug?: string
  parent_id?: number | null
  description?: string | null
  sort_order?: number
  is_active?: boolean
}

export interface AdminCategoryUpdatePayload {
  name?: string
  slug?: string
  parent_id?: number | null
  description?: string | null
  sort_order?: number
  is_active?: boolean
}

export interface AdminCategoryFilterParams {
  search?: string
  parent_id?: number | string
  all?: boolean
  page?: number
  per_page?: number
}

export interface AdminCategoryListResponse {
  categories: AdminCategoryItem[]
  meta?: ApiPaginationMeta
}
