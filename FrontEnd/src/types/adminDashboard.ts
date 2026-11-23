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

// =============================================================================
// Unified Dashboard Redesign Types
// =============================================================================

export type DashboardRange =
  | '7d'
  | '30d'
  | '90d'
  | 'this_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom'

export interface DashboardPeriodInfo {
  from: string
  to: string
  duration_days: number
}

export interface DashboardKpis {
  revenue: number
  orders_count: number
  total_orders_count: number
  delivered_orders_count: number
  cancelled_orders_count: number
  average_order_value: number
  cancellation_rate: number
}

export interface DashboardDeltaPercent {
  revenue: number | null
  orders_count: number | null
  average_order_value: number | null
  cancellation_rate: number | null
}

export interface DashboardTimeSeriesPoint {
  date: string
  label: string
  revenue: number
}

export interface DashboardTimeSeries {
  granularity: 'day' | 'week' | 'month'
  timeline: DashboardTimeSeriesPoint[]
}

export interface DashboardTopProductItem {
  product_id: number | null
  product_name: string
  image_url: string | null
  total_quantity: number
  total_revenue: number
}

export interface DashboardTopProducts {
  by_quantity: DashboardTopProductItem[]
  by_revenue: DashboardTopProductItem[]
}

export interface DashboardCategoryRevenueRow {
  rank: number
  category_id: number | null
  category_name: string
  units_sold: number
  revenue: number
  percent: number
}

export interface DashboardCategoryRevenueData {
  root_groups: DashboardCategoryRevenueRow[]
  leaf_categories: DashboardCategoryRevenueRow[]
  total_delivered_revenue: number
  total_units_sold: number
}

export interface DashboardOrderStatusItem {
  status: string
  label: string
  count: number
  percent: number
}

export interface DashboardOrderStatusBreakdown {
  total_orders: number
  items: DashboardOrderStatusItem[]
}

export interface DashboardPaymentMethodItem {
  method: string
  label: string
  orders_count: number
  total_amount: number
  percent: number
}

export interface DashboardAlertItem {
  id: string
  title: string
  count: number
  description: string
  severity: 'warning' | 'danger' | 'neutral'
  link: string
  link_text: string
}

export interface AdminUnifiedDashboardData {
  range: DashboardRange
  current_period: DashboardPeriodInfo
  previous_period: DashboardPeriodInfo
  current: DashboardKpis
  previous: DashboardKpis
  delta_percent: DashboardDeltaPercent
  revenue_time_series: DashboardTimeSeries
  top_products: DashboardTopProducts
  revenue_by_category: DashboardCategoryRevenueData
  order_status_breakdown: DashboardOrderStatusBreakdown
  payment_method_split: DashboardPaymentMethodItem[]
  alerts: DashboardAlertItem[]
}

// =============================================================================
// Product / Category Performance Panel Types (Phase 4)
// =============================================================================

export type ItemPerformanceTargetType = 'product' | 'category'

export interface ItemPerformanceSummary {
  units_sold: number
  revenue: number
  share_of_total_revenue: number
  total_delivered_revenue: number
}

export interface ItemPerformanceDelta {
  units_sold: number | null
  revenue: number | null
  share_of_total_revenue: number | null
}

export interface ItemPerformanceTimelinePoint {
  date: string
  label: string
  units_sold: number
  revenue: number
}

export interface ItemPerformanceData {
  target_type: ItemPerformanceTargetType
  target_id: number
  target_name: string
  target_image: string | null
  range: string
  current_period: DashboardPeriodInfo
  previous_period: DashboardPeriodInfo
  granularity: 'day' | 'week' | 'month'
  summary: ItemPerformanceSummary
  previous_summary: ItemPerformanceSummary
  delta: ItemPerformanceDelta
  timeline: ItemPerformanceTimelinePoint[]
}

export interface ItemPerformanceQueryParams {
  target_type: ItemPerformanceTargetType
  target_id: number
  range?: DashboardRange
  from?: string
  to?: string
  granularity?: 'auto' | 'day' | 'week' | 'month'
}
