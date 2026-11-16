import type { OrderStatus } from './order'

export interface AdminDashboardSummaryData {
  from: string
  to: string
  revenue: number
  delivered_orders_count: number
  average_order_value: number
  orders_count: number
  cancellation_rate: number
  orders_by_status: Record<OrderStatus, number>
  new_customers_count: number
  low_stock_variants_count: number
}

export interface AdminDashboardRevenueItem {
  date: string
  label: string
  revenue: number
  orders_count: number
}

export interface AdminDashboardRevenueData {
  from: string
  to: string
  group_by: 'day' | 'month'
  timeline: AdminDashboardRevenueItem[]
}

export interface AdminDashboardTopProductItem {
  product_id: number | null
  product_name: string
  image_url: string | null
  total_quantity: number
  total_revenue: number
}

export interface AdminDashboardFilterParams {
  from?: string
  to?: string
  group_by?: 'day' | 'month'
  limit?: number
}

export type DashboardPresetPeriod = '7days' | '30days' | 'this_month' | 'custom'
