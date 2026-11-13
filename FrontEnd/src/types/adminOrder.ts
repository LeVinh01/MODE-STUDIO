import type { OrderItem, OrderStatus, PaymentMethod, PaymentStatus } from './order'
import type { ApiOrderItem } from './api'

/**
 * Thông tin khách hàng đặt đơn (User tài khoản)
 */
export interface AdminCustomerInfo {
  id: number
  fullName: string
  email: string
  phone: string | null
}

/**
 * Bản ghi lịch sử thay đổi trạng thái đơn hàng
 */
export interface AdminOrderStatusHistory {
  id: number
  fromStatus: OrderStatus | null
  toStatus: OrderStatus
  reason: string | null
  createdAt: string
  changedBy: {
    id: number
    fullName: string
    email: string
    role?: string
  } | null
}

/**
 * Dòng đơn hàng trong danh sách quản trị
 */
export interface AdminOrderListItem {
  orderCode: string
  status: OrderStatus | string
  paymentMethod: PaymentMethod | string
  paymentStatus: PaymentStatus | string
  recipientName: string
  recipientPhone: string
  shippingAddress: string
  carrier?: string | null
  trackingCode?: string | null
  subtotal: number
  shippingFee: number
  discountAmount: number
  totalAmount: number
  itemsCount: number
  createdAt: string
  customer: AdminCustomerInfo | null
}

/**
 * Chi tiết toàn diện đơn hàng trong quản trị
 */
export interface AdminOrderDetail extends AdminOrderListItem {
  note?: string | null
  cancelReason?: string | null
  cancelledAt?: string | null
  paidAt?: string | null
  items: OrderItem[]
  statusHistories: AdminOrderStatusHistory[]
}

/**
 * Tham số lọc và phân trang danh sách đơn hàng admin
 */
export interface AdminOrderFilterParams {
  status?: string
  payment_status?: string
  from?: string
  to?: string
  search?: string
  page?: number
  per_page?: number
}

/**
 * Payload cập nhật trạng thái đơn hàng phía admin
 */
export interface UpdateAdminOrderStatusPayload {
  status: OrderStatus
  reason?: string
  carrier?: string
  tracking_code?: string
}

// ----------------------------------------------------------------------
// Raw API DTOs (snake_case từ BackEnd Laravel)
// ----------------------------------------------------------------------

export interface ApiAdminCustomer {
  id: number
  full_name: string
  email: string
  phone: string | null
}

export interface ApiAdminOrderStatusHistory {
  id: number
  from_status: string | null
  to_status: string
  reason: string | null
  created_at: string
  changed_by: {
    id: number
    full_name: string
    email: string
    role?: string
  } | null
}

export interface ApiAdminOrderListItem {
  order_code: string
  status: string
  payment_method: string
  payment_status: string
  recipient_name: string
  recipient_phone: string
  shipping_address: string
  carrier?: string | null
  tracking_code?: string | null
  subtotal: number
  shipping_fee: number
  discount_amount: number
  total_amount: number
  items_count: number
  created_at: string
  customer: ApiAdminCustomer | null
}

export interface ApiAdminOrderDetail extends ApiAdminOrderListItem {
  note: string | null
  cancel_reason: string | null
  cancelled_at: string | null
  paid_at: string | null
  items?: ApiOrderItem[]
  status_histories?: ApiAdminOrderStatusHistory[]
}

export interface ApiAdminOrderShowResponse {
  order: ApiAdminOrderDetail
}

export interface ApiAdminOrderUpdateStatusResponse {
  message: string
  order: ApiAdminOrderDetail
}
