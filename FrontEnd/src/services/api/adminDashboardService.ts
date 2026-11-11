import apiClient from './client'
import type {
  AdminDashboardFilterParams,
  AdminDashboardRevenueData,
  AdminDashboardSummaryData,
  AdminDashboardTopProductItem,
} from '@/types/adminDashboard'
import type { ApiSingleResponse } from '@/types/api'

export const adminDashboardService = {
  /**
   * Lấy tổng quan chỉ số KPI và phân bổ trạng thái đơn hàng
   * GET /api/admin/dashboard/summary
   */
  async getSummary(
    params?: AdminDashboardFilterParams,
    signal?: AbortSignal,
  ): Promise<AdminDashboardSummaryData> {
    const response = await apiClient.get<ApiSingleResponse<AdminDashboardSummaryData>>(
      '/admin/dashboard/summary',
      {
        params,
        signal,
      },
    )
    return response.data.data
  },

  /**
   * Lấy xu hướng doanh thu và số đơn theo ngày/tháng
   * GET /api/admin/dashboard/revenue
   */
  async getRevenue(
    params?: AdminDashboardFilterParams,
    signal?: AbortSignal,
  ): Promise<AdminDashboardRevenueData> {
    const response = await apiClient.get<ApiSingleResponse<AdminDashboardRevenueData>>(
      '/admin/dashboard/revenue',
      {
        params,
        signal,
      },
    )
    return response.data.data
  },

  /**
   * Lấy danh sách sản phẩm bán chạy nhất
   * GET /api/admin/dashboard/top-products
   */
  async getTopProducts(
    params?: AdminDashboardFilterParams,
    signal?: AbortSignal,
  ): Promise<AdminDashboardTopProductItem[]> {
    const response = await apiClient.get<ApiSingleResponse<AdminDashboardTopProductItem[]>>(
      '/admin/dashboard/top-products',
      {
        params,
        signal,
      },
    )
    return response.data.data
  },
}

export default adminDashboardService
