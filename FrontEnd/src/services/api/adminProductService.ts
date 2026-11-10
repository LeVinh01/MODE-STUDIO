import apiClient from './client'
import {
  mapApiAdminImageItemToAdminImageItem,
  mapApiAdminLookupsToAdminLookups,
  mapApiAdminLowStockItemToAdminLowStockItem,
  mapApiAdminProductDetailToAdminProductDetail,
  mapApiAdminProductListItemToAdminProductListItem,
  mapApiAdminStockAdjustmentToAdminStockAdjustment,
  mapApiAdminVariantItemToAdminVariantItem,
} from './mappers'
import type {
  AdminImageItem,
  AdminLookups,
  AdminLowStockItem,
  AdminLowStockParams,
  AdminProductDetail,
  AdminProductFilterParams,
  AdminProductImageUpdatePayload,
  AdminProductListItem,
  AdminProductStorePayload,
  AdminProductUpdatePayload,
  AdminStockAdjustmentItem,
  AdminStockAdjustmentPayload,
  AdminVariantItem,
  AdminVariantStorePayload,
  AdminVariantUpdatePayload,
  ApiAdminImageItem,
  ApiAdminLookups,
  ApiAdminLowStockItem,
  ApiAdminProductDetail,
  ApiAdminProductListItem,
  ApiAdminStockAdjustment,
  ApiAdminVariantItem,
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

  /**
   * Thêm biến thể sản phẩm (hoặc khôi phục biến thể đã xóa mềm)
   */
  async createVariant(
    productId: number | string,
    payload: AdminVariantStorePayload,
  ): Promise<{ variant: AdminVariantItem; isRestored: boolean }> {
    const response = await apiClient.post<{ data: ApiAdminVariantItem }>(
      `/admin/products/${productId}/variants`,
      payload,
    )

    return {
      variant: mapApiAdminVariantItemToAdminVariantItem(response.data.data),
      isRestored: response.status === 200,
    }
  },

  /**
   * Cập nhật thông tin biến thể (SKU, ghi chú, trạng thái bật/tắt)
   */
  async updateVariant(
    variantId: number | string,
    payload: AdminVariantUpdatePayload,
  ): Promise<AdminVariantItem> {
    const response = await apiClient.patch<{ data: ApiAdminVariantItem }>(
      `/admin/variants/${variantId}`,
      payload,
    )

    return mapApiAdminVariantItemToAdminVariantItem(response.data.data)
  },

  /**
   * Xóa mềm biến thể
   */
  async deleteVariant(variantId: number | string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `/admin/variants/${variantId}`,
    )

    return response.data
  },

  /**
   * Điều chỉnh tồn kho biến thể (set / increment / decrement)
   */
  async adjustVariantStock(
    variantId: number | string,
    payload: AdminStockAdjustmentPayload,
  ): Promise<AdminStockAdjustmentItem> {
    const response = await apiClient.post<{ data: ApiAdminStockAdjustment }>(
      `/admin/variants/${variantId}/stock`,
      payload,
    )

    return mapApiAdminStockAdjustmentToAdminStockAdjustment(response.data.data)
  },

  /**
   * Xem lịch sử biến động tồn kho của biến thể
   */
  async getVariantStockAdjustments(
    variantId: number | string,
    params?: { page?: number; per_page?: number },
    signal?: AbortSignal,
  ): Promise<{ adjustments: AdminStockAdjustmentItem[]; meta: ApiPaginationMeta }> {
    const response = await apiClient.get<ApiPaginatedResponse<ApiAdminStockAdjustment>>(
      `/admin/variants/${variantId}/stock-adjustments`,
      {
        params,
        signal,
      },
    )

    const rawData = response.data.data || []
    return {
      adjustments: rawData.map(mapApiAdminStockAdjustmentToAdminStockAdjustment),
      meta: response.data.meta,
    }
  },

  /**
   * Tải hình ảnh sản phẩm lên
   */
  async uploadProductImage(
    productId: number | string,
    formData: FormData,
    signal?: AbortSignal,
  ): Promise<AdminImageItem> {
    const response = await apiClient.post<{ data: ApiAdminImageItem }>(
      `/admin/products/${productId}/images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal,
      },
    )

    return mapApiAdminImageItemToAdminImageItem(response.data.data)
  },

  /**
   * Cập nhật thông tin ảnh (is_main, color_id, alt_text, sort_order)
   */
  async updateProductImage(
    productId: number | string,
    imageId: number | string,
    payload: AdminProductImageUpdatePayload,
  ): Promise<AdminImageItem> {
    const response = await apiClient.patch<{ data: ApiAdminImageItem }>(
      `/admin/products/${productId}/images/${imageId}`,
      payload,
    )

    return mapApiAdminImageItemToAdminImageItem(response.data.data)
  },

  /**
   * Xóa ảnh sản phẩm
   */
  async deleteProductImage(
    productId: number | string,
    imageId: number | string,
  ): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `/admin/products/${productId}/images/${imageId}`,
    )

    return response.data
  },

  /**
   * Lấy danh sách biến thể tồn kho thấp / sắp hết hàng
   * GET /api/admin/stock/low
   */
  async getLowStockVariants(
    params?: AdminLowStockParams,
    signal?: AbortSignal,
  ): Promise<{ items: AdminLowStockItem[]; meta: ApiPaginationMeta }> {
    const cleanParams: Record<string, number> = {}
    if (params) {
      if (params.threshold !== undefined) {
        cleanParams.threshold = params.threshold
      }
      if (params.page !== undefined) {
        cleanParams.page = params.page
      }
      if (params.per_page !== undefined) {
        cleanParams.per_page = params.per_page
      }
    }

    const response = await apiClient.get<ApiPaginatedResponse<ApiAdminLowStockItem>>(
      '/admin/stock/low',
      {
        params: cleanParams,
        signal,
      },
    )

    return {
      items: (response.data.data || []).map(mapApiAdminLowStockItemToAdminLowStockItem),
      meta: response.data.meta,
    }
  },
}
