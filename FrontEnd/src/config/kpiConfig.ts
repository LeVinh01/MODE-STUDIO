import React from 'react'
import {
  TrendingUp,
  PackageCheck,
  Receipt,
  XCircle,
  Users,
  AlertTriangle,
} from 'lucide-react'
import type { AdminDashboardSummaryData } from '@/types/adminDashboard'
import { formatCurrency } from '@/utils/formatters'

export interface KpiCardDefinition {
  id: string
  title: string
  definition: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  getValue: (summary: AdminDashboardSummaryData) => string
  getFooter: (summary: AdminDashboardSummaryData) => string
  isWarning?: (summary: AdminDashboardSummaryData) => boolean
  link?: {
    to: string
    text: string
  }
}

export const KPI_CARDS_CONFIG: KpiCardDefinition[] = [
  {
    id: 'revenue',
    title: 'Doanh thu',
    definition: 'Tổng giá trị các đơn hàng đã giao thành công trong kỳ (căn cứ thời điểm giao hàng).',
    icon: TrendingUp,
    getValue: (s) => formatCurrency(s.revenue),
    getFooter: () => 'Đơn đã giao trong kỳ',
  },
  {
    id: 'delivered_orders',
    title: 'Đơn đã giao',
    definition: 'Số đơn hàng đã giao thành công / Tổng số đơn phát sinh trong kỳ.',
    icon: PackageCheck,
    getValue: (s) => s.delivered_orders_count.toLocaleString('vi-VN'),
    getFooter: (s) => `Tổng đặt: ${s.orders_count.toLocaleString('vi-VN')} đơn`,
  },
  {
    id: 'average_order_value',
    title: 'Giá trị đơn TB',
    definition: 'Doanh thu chia cho số đơn đã giao thành công (AOV).',
    icon: Receipt,
    getValue: (s) => formatCurrency(s.average_order_value),
    getFooter: () => 'Doanh thu / đơn đã giao',
  },
  {
    id: 'cancellation_rate',
    title: 'Tỷ lệ hủy đơn',
    definition: 'Tỷ lệ số đơn bị hủy trên tổng số đơn hàng phát sinh trong kỳ (theo ngày tạo).',
    icon: XCircle,
    getValue: (s) => `${(s.cancellation_rate ?? 0).toLocaleString('vi-VN')}%`,
    getFooter: (s) => `Đã hủy: ${(s.orders_by_status?.cancelled ?? 0).toLocaleString('vi-VN')} đơn`,
    isWarning: (s) => (s.cancellation_rate ?? 0) > 15,
  },
  {
    id: 'new_customers',
    title: 'Khách hàng mới',
    definition: 'Số lượng tài khoản khách hàng đăng ký mới trong kỳ.',
    icon: Users,
    getValue: (s) => s.new_customers_count.toLocaleString('vi-VN'),
    getFooter: () => 'Đăng ký mới trong kỳ',
  },
  {
    id: 'low_stock',
    title: 'Sắp hết hàng',
    definition: 'Số biến thể sản phẩm có số lượng tồn kho nhỏ hơn hoặc bằng ngưỡng cảnh báo.',
    icon: AlertTriangle,
    getValue: (s) => s.low_stock_variants_count.toLocaleString('vi-VN'),
    getFooter: () => '≤ ngưỡng tồn',
    isWarning: (s) => s.low_stock_variants_count > 0,
    link: {
      to: '/admin/inventory',
      text: 'Xem kho',
    },
  },
]
