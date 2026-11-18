import apiClient from './client'
import type {
  AdminCategoryFilterParams,
  AdminCategoryItem,
  AdminCategoryListResponse,
  AdminCategoryStorePayload,
  AdminCategoryUpdatePayload,
  ApiAdminCategoryItem,
} from '@/types/adminCategory'
import type { ApiPaginatedResponse } from '@/types/api'

const mapApiToAdminCategoryItem = (item: ApiAdminCategoryItem): AdminCategoryItem => ({
  id: item.id,
  name: item.name,
  slug: item.slug,
  parentId: item.parent_id,
  description: item.description,
  imageUrl: item.image_url,
  sortOrder: item.sort_order ?? 0,
  isActive: Boolean(item.is_active),
  productsCount: item.products_count ?? 0,
  childrenCount: item.children_count ?? 0,
  parent: item.parent
    ? {
        id: item.parent.id,
        name: item.parent.name,
        slug: item.parent.slug,
      }
    : null,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
})

export const adminCategoryService = {
  /**
   * Lấy danh sách danh mục (hỗ trợ tìm kiếm, lọc parent, lấy toàn bộ)
   */
  async getCategories(
    params?: AdminCategoryFilterParams,
    signal?: AbortSignal,
  ): Promise<AdminCategoryListResponse> {
    const cleanParams: Record<string, string | number | boolean> = {}

    if (params) {
      if (params.search && params.search.trim()) {
        cleanParams.search = params.search.trim()
      }
      if (params.parent_id !== undefined && params.parent_id !== '') {
        cleanParams.parent_id = params.parent_id
      }
      if (params.all) {
        cleanParams.all = 1
      }
      if (params.page) {
        cleanParams.page = params.page
      }
      if (params.per_page) {
        cleanParams.per_page = params.per_page
      }
    } else {
      cleanParams.all = 1
    }

    const res = await apiClient.get<ApiPaginatedResponse<ApiAdminCategoryItem>>(
      '/admin/categories',
      {
        params: cleanParams,
        signal,
      },
    )

    const categories = (res.data.data || []).map(mapApiToAdminCategoryItem)

    return {
      categories,
      meta: res.data.meta,
    }
  },

  /**
   * Xem chi tiết một danh mục
   */
  async getCategory(id: number, signal?: AbortSignal): Promise<AdminCategoryItem> {
    const res = await apiClient.get<{ data: ApiAdminCategoryItem }>(
      `/admin/categories/${id}`,
      { signal },
    )
    return mapApiToAdminCategoryItem(res.data.data)
  },

  /**
   * Tạo danh mục mới
   */
  async createCategory(
    payload: AdminCategoryStorePayload,
  ): Promise<AdminCategoryItem> {
    const res = await apiClient.post<{ data: ApiAdminCategoryItem }>(
      '/admin/categories',
      payload,
    )
    return mapApiToAdminCategoryItem(res.data.data)
  },

  /**
   * Cập nhật danh mục
   */
  async updateCategory(
    id: number,
    payload: AdminCategoryUpdatePayload,
  ): Promise<AdminCategoryItem> {
    const res = await apiClient.put<{ data: ApiAdminCategoryItem }>(
      `/admin/categories/${id}`,
      payload,
    )
    return mapApiToAdminCategoryItem(res.data.data)
  },

  /**
   * Tải lên / thay thế ảnh đại diện cho danh mục
   */
  async uploadImage(id: number, file: File): Promise<AdminCategoryItem> {
    const formData = new FormData()
    formData.append('image', file)

    const res = await apiClient.post<{ data: ApiAdminCategoryItem }>(
      `/admin/categories/${id}/image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    )
    return mapApiToAdminCategoryItem(res.data.data)
  },

  /**
   * Xóa ảnh đại diện của danh mục
   */
  async removeImage(id: number): Promise<AdminCategoryItem> {
    const res = await apiClient.delete<{ data: ApiAdminCategoryItem }>(
      `/admin/categories/${id}/image`,
    )
    return mapApiToAdminCategoryItem(res.data.data)
  },
}
