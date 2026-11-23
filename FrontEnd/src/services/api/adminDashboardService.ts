import apiClient from './client'
import type {
  AdminDashboardFilterParams,
  AdminDashboardRevenueData,
  AdminDashboardSummaryData,
  AdminDashboardTopProductItem,
  AdminUnifiedDashboardData,
  DashboardRange,
  ItemPerformanceData,
  ItemPerformanceQueryParams,
} from '@/types/adminDashboard'
import type { ApiSingleResponse } from '@/types/api'

export const adminDashboardService = {
  /**
   * Lấy toàn bộ dữ liệu bảng điều khiển tổng hợp (Unified Dashboard Redesign)
   * GET /api/admin/dashboard?range=7d|30d|90d|this_month|this_quarter|this_year|custom
   */
  async getDashboard(
    range: DashboardRange = '30d',
    from?: string,
    to?: string,
    signal?: AbortSignal,
  ): Promise<AdminUnifiedDashboardData> {
    const params: Record<string, string> = { range }
    if (range === 'custom') {
      if (from) params.from = from
      if (to) params.to = to
    }

    const response = await apiClient.get<ApiSingleResponse<AdminUnifiedDashboardData>>(
      '/admin/dashboard',
      {
        params,
        signal,
      },
    )
    return response.data.data
  },

  /**
   * Lấy hiệu suất theo mặt hàng (Product / Category Performance Panel)
   * GET /api/admin/dashboard/item-performance
   */
  async getItemPerformance(
    params: ItemPerformanceQueryParams,
    signal?: AbortSignal,
  ): Promise<ItemPerformanceData> {
    const query: Record<string, string | number> = {
      target_type: params.target_type,
      target_id: params.target_id,
    }
    if (params.range) query.range = params.range
    if (params.from) query.from = params.from
    if (params.to) query.to = params.to
    if (params.granularity && params.granularity !== 'auto') query.granularity = params.granularity

    const response = await apiClient.get<ApiSingleResponse<ItemPerformanceData>>(
      '/admin/dashboard/item-performance',
      {
        params: query,
        signal,
      },
    )
    return response.data.data
  },

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
