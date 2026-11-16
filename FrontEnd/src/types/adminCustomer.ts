import type { OrderStatus, PaymentMethod, PaymentStatus } from './order'

export interface AdminCustomerListItem {
  id: number
  fullName: string
  email: string
  phone: string | null
  createdAt: string
  ordersCount: number
  totalSpent: number
  lastOrderAt: string | null
}

export interface AdminCustomerRecentOrder {
  id: number
  orderCode: string
  status: OrderStatus
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  totalAmount: number
  itemsCount: number
  carrier?: string | null
  trackingCode?: string | null
  createdAt: string
}

export interface AdminCustomerStats {
  ordersCount: number
  deliveredOrdersCount: number
  totalSpent: number
  lastOrderAt: string | null
}

export interface AdminCustomerDetail {
  customer: {
    id: number
    fullName: string
    email: string
    phone: string | null
    createdAt: string
  }
  stats: AdminCustomerStats
  recentOrders: AdminCustomerRecentOrder[]
}

export interface AdminCustomerFilterParams {
  search?: string
  page?: number
  per_page?: number
}

export interface ApiAdminCustomerListItem {
  id: number
  full_name: string
  email: string
  phone: string | null
  created_at: string
  orders_count: number
  total_spent: number
  last_order_at: string | null
}

export interface ApiAdminCustomerDetailResponse {
  customer: {
    id: number
    full_name: string
    email: string
    phone: string | null
    created_at: string
  }
  stats: {
    orders_count: number
    delivered_orders_count: number
    total_spent: number
    last_order_at: string | null
  }
  recent_orders: Array<{
    id: number
    order_code: string
    status: string
    payment_method: string
    payment_status: string
    total_amount: number
    items_count: number
    carrier?: string | null
    tracking_code?: string | null
    created_at: string
  }>
}
