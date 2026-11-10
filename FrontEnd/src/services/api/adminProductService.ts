import apiClient from './client'
import {
  mapApiAdminLookupsToAdminLookups,
  mapApiAdminProductDetailToAdminProductDetail,
  mapApiAdminProductListItemToAdminProductListItem,
} from './mappers'
import type {
  AdminLookups,
  AdminProductDetail,
  AdminProductFilterParams,
  AdminProductListItem,
  AdminProductStorePayload,
  AdminProductUpdatePayload,
  ApiAdminLookups,
  ApiAdminProductDetail,
  ApiAdminProductListItem,
} from '@/types/adminProduct'
import type { ApiPaginatedResponse, ApiPaginationMeta } from '@/types/api'

export const adminProductService = {
  /**
   * Lấy danh sách sản phẩm quản trị (hỗ trợ lọc, tìm kiếm và phân trang)
   */
  async getAdminProducts(
    params?: AdminProductFilterParams,
    signal?: AbortSignal,
  ): Promise<{ products: AdminProductListItem[]; meta: ApiPaginationMeta }> {
    const cleanParams: Record<string, string | number> = {}

    if (params) {
      if (params.status && params.status !== 'all') {
        cleanParams.status = params.status
      }
      if (params.category_id && params.category_id !== 'all') {
        cleanParams.category_id = Number(params.category_id)
      }
      if (params.brand_id && params.brand_id !== 'all') {
        cleanParams.brand_id = Number(params.brand_id)
      }
      if (params.search && params.search.trim()) {
        cleanParams.search = params.search.trim()
      }
      if (typeof params.page === 'number' && params.page >= 1) {
        cleanParams.page = params.page
      }
      if (typeof params.per_page === 'number' && params.per_page >= 1) {
        cleanParams.per_page = params.per_page
      }
    }

    const response = await apiClient.get<ApiPaginatedResponse<ApiAdminProductListItem>>(
      '/admin/products',
      {
        params: cleanParams,
        signal,
      },
    )

    const rawData = response.data.data || []
    return {
      products: rawData.map(mapApiAdminProductListItemToAdminProductListItem),
      meta: response.data.meta,
    }
  },

  /**
   * Lấy chi tiết sản phẩm theo ID
   */
  async getAdminProductDetail(
    id: number | string,
    signal?: AbortSignal,
  ): Promise<AdminProductDetail> {
    const response = await apiClient.get<{ data: ApiAdminProductDetail }>(
      `/admin/products/${id}`,
      { signal },
    )

    return mapApiAdminProductDetailToAdminProductDetail(response.data.data)
  },

  /**
   * Lấy dữ liệu lookups (danh mục, thương hiệu, màu sắc, size, giới tính, trạng thái)
   */
  async getAdminLookups(signal?: AbortSignal): Promise<AdminLookups> {
    const response = await apiClient.get<ApiAdminLookups>('/admin/lookups', {
      signal,
    })

    return mapApiAdminLookupsToAdminLookups(response.data)
  },

  /**
   * Tạo sản phẩm mới (chỉ admin)
   */
  async createAdminProduct(
    payload: AdminProductStorePayload,
  ): Promise<AdminProductDetail> {
    const response = await apiClient.post<{ data: ApiAdminProductDetail }>(
      '/admin/products',
      payload,
    )

    return mapApiAdminProductDetailToAdminProductDetail(response.data.data)
  },

  /**
   * Cập nhật thông tin cơ bản sản phẩm (chỉ admin)
   */
  async updateAdminProduct(
    id: number | string,
    payload: AdminProductUpdatePayload,
  ): Promise<AdminProductDetail> {
    const response = await apiClient.patch<{ data: ApiAdminProductDetail }>(
      `/admin/products/${id}`,
      payload,
    )

    return mapApiAdminProductDetailToAdminProductDetail(response.data.data)
  },

  /**
   * Xóa mềm sản phẩm (chỉ admin)
   */
  async deleteAdminProduct(id: number | string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `/admin/products/${id}`,
    )

    return response.data
  },
}
