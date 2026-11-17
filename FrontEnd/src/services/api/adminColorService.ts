import apiClient from './client'
import type {
  AdminColorFilterParams,
  AdminColorItem,
  AdminColorListResponse,
  AdminColorStorePayload,
  AdminColorUpdatePayload,
  ApiAdminColorItem,
} from '@/types/adminColor'
import type { ApiPaginatedResponse } from '@/types/api'

const mapApiToAdminColorItem = (item: ApiAdminColorItem): AdminColorItem => ({
  id: item.id,
  name: item.name,
  hexCode: item.hex_code,
  variantsCount: item.variants_count ?? 0,
  imagesCount: item.images_count ?? 0,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
})

export const adminColorService = {
  /**
   * Lấy danh sách màu sắc (có hỗ trợ tìm kiếm, sắp xếp và phân trang)
   */
  async getColors(
    params?: AdminColorFilterParams,
    signal?: AbortSignal,
  ): Promise<AdminColorListResponse> {
    const cleanParams: Record<string, string | number | boolean> = {}

    if (params) {
      if (params.search && params.search.trim()) {
        cleanParams.search = params.search.trim()
      }
      if (params.sort) {
        cleanParams.sort = params.sort
      }
      if (params.direction) {
        cleanParams.direction = params.direction
      }
      if (params.all) {
        cleanParams.all = 1
      } else {
        if (typeof params.page === 'number' && params.page >= 1) {
          cleanParams.page = params.page
        }
        if (typeof params.per_page === 'number' && params.per_page >= 1) {
          cleanParams.per_page = params.per_page
        }
      }
    }

    const res = await apiClient.get<ApiPaginatedResponse<ApiAdminColorItem>>(
      '/admin/colors',
      {
        params: cleanParams,
        signal,
      },
    )

    const colors = (res.data.data || []).map(mapApiToAdminColorItem)

    return {
      colors,
      meta: res.data.meta,
    }
  },

  /**
   * Xem chi tiết một màu sắc
   */
  async getColor(id: number, signal?: AbortSignal): Promise<AdminColorItem> {
    const res = await apiClient.get<{ data: ApiAdminColorItem }>(
      `/admin/colors/${id}`,
      { signal },
    )
    return mapApiToAdminColorItem(res.data.data)
  },

  /**
   * Tạo mới màu sắc
   */
  async createColor(
    payload: AdminColorStorePayload,
  ): Promise<AdminColorItem> {
    const res = await apiClient.post<{ data: ApiAdminColorItem }>(
      '/admin/colors',
      payload,
    )
    return mapApiToAdminColorItem(res.data.data)
  },

  /**
   * Cập nhật màu sắc
   */
  async updateColor(
    id: number,
    payload: AdminColorUpdatePayload,
  ): Promise<AdminColorItem> {
    const res = await apiClient.put<{ data: ApiAdminColorItem }>(
      `/admin/colors/${id}`,
      payload,
    )
    return mapApiToAdminColorItem(res.data.data)
  },

  /**
   * Xóa màu sắc (sẽ thất bại với 422 nếu màu đang gắn với biến thể hoặc ảnh)
   */
  async deleteColor(id: number): Promise<{ message: string }> {
    const res = await apiClient.delete<{ message: string }>(`/admin/colors/${id}`)
    return res.data
  },
}
