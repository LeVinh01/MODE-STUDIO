import type { ApiPaginationMeta } from '@/types/api'

export interface ApiAdminColorItem {
  id: number
  name: string
  hex_code: string
  variants_count: number
  images_count: number
  created_at: string
  updated_at: string
}

export interface AdminColorItem {
  id: number
  name: string
  hexCode: string
  variantsCount: number
  imagesCount: number
  createdAt: string
  updatedAt: string
}

export interface AdminColorStorePayload {
  name: string
  hex_code: string
}

export interface AdminColorUpdatePayload {
  name?: string
  hex_code?: string
}

export interface AdminColorFilterParams {
  search?: string
  sort?: 'id' | 'name' | 'variants_count' | 'created_at'
  direction?: 'asc' | 'desc'
  page?: number
  per_page?: number
  all?: boolean
}

export interface AdminColorListResponse {
  colors: AdminColorItem[]
  meta?: ApiPaginationMeta
}
