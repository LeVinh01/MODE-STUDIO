import apiClient from './client'
import { mapApiOrderItemToOrderItem, mapApiPaymentDetailsToPaymentDetails } from './mappers'
import type {
  AdminCustomerInfo,
  AdminOrderDetail,
  AdminOrderFilterParams,
  AdminOrderListItem,
  AdminOrderStatusHistory,
  ApiAdminCustomer,
  ApiAdminOrderDetail,
  ApiAdminOrderListItem,
  ApiAdminOrderStatusHistory,
  ApiAdminOrderShowResponse,
  ApiAdminOrderUpdateStatusResponse,
  ConfirmRefundPayload,
  UpdateAdminOrderStatusPayload,
} from '@/types/adminOrder'
import type { ApiPaginatedResponse, ApiPaginationMeta } from '@/types/api'
import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/types/order'

/**
 * Mappers chuyển đổi dữ liệu từ Backend sang Domain Types phía Admin
 */
const mapCustomer = (c: ApiAdminCustomer | null | undefined): AdminCustomerInfo | null => {
  if (!c) return null
  return {
    id: c.id,
    fullName: c.full_name,
    email: c.email,
    phone: c.phone ?? null,
  }
}

const mapStatusHistory = (h: ApiAdminOrderStatusHistory): AdminOrderStatusHistory => {
  return {
    id: h.id,
    fromStatus: (h.from_status as OrderStatus) || null,
    toStatus: h.to_status as OrderStatus,
    reason: h.reason ?? null,
    createdAt: h.created_at,
    changedBy: h.changed_by
      ? {
          id: h.changed_by.id,
          fullName: h.changed_by.full_name,
          email: h.changed_by.email,
          role: h.changed_by.role,
        }
      : null,
  }
}

export const mapApiAdminOrderListItemToAdminOrderListItem = (
  item: ApiAdminOrderListItem,
): AdminOrderListItem => {
  return {
    orderCode: item.order_code,
    status: item.status as OrderStatus,
    paymentMethod: item.payment_method as PaymentMethod,
    paymentStatus: item.payment_status as PaymentStatus,
    recipientName: item.recipient_name,
    recipientPhone: item.recipient_phone,
    shippingAddress: item.shipping_address,
    carrier: item.carrier ?? null,
    trackingCode: item.tracking_code ?? null,
    subtotal: item.subtotal,
    shippingFee: item.shipping_fee,
    discountAmount: item.discount_amount,
    totalAmount: item.total_amount,
    itemsCount: item.items_count,
    createdAt: item.created_at,
    customer: mapCustomer(item.customer),
  }
}

export const mapApiAdminOrderDetailToAdminOrderDetail = (
  item: ApiAdminOrderDetail,
): AdminOrderDetail => {
  return {
    ...mapApiAdminOrderListItemToAdminOrderListItem(item),
    note: item.note ?? null,
    cancelReason: item.cancel_reason ?? null,
    cancelledAt: item.cancelled_at ?? null,
    paidAt: item.paid_at ?? null,
    refundRequestedAt: item.refund_requested_at ?? null,
    refundedAt: item.refunded_at ?? null,
    refundNote: item.refund_note ?? null,
    paymentDetails: mapApiPaymentDetailsToPaymentDetails(item.payment_details),
    items: (item.items || []).map(mapApiOrderItemToOrderItem),
    statusHistories: (item.status_histories || []).map(mapStatusHistory),
  }
}

export const adminOrderService = {
  /**
   * Lấy danh sách đơn hàng cho admin/operator (hỗ trợ lọc, tìm kiếm và phân trang)
   */
  async getAdminOrders(
    params?: AdminOrderFilterParams,
    signal?: AbortSignal,
  ): Promise<{ orders: AdminOrderListItem[]; meta: ApiPaginationMeta }> {
    // Làm sạch params: loại bỏ chuỗi rỗng và giá trị mặc định 'all'
    const cleanParams: Record<string, string | number> = {}

    if (params) {
      if (params.status && params.status !== 'all') {
        cleanParams.status = params.status
      }
      if (params.payment_status && params.payment_status !== 'all') {
        cleanParams.payment_status = params.payment_status
      }
      if (params.from && params.from.trim()) {
        cleanParams.from = params.from.trim()
      }
      if (params.to && params.to.trim()) {
        cleanParams.to = params.to.trim()
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

    const response = await apiClient.get<ApiPaginatedResponse<ApiAdminOrderListItem>>(
      '/admin/orders',
      {
        params: cleanParams,
        signal,
      },
    )

    return {
      orders: response.data.data.map(mapApiAdminOrderListItemToAdminOrderListItem),
      meta: response.data.meta,
    }
  },

  /**
   * Lấy chi tiết đơn hàng cho admin/operator theo mã đơn
   */
  async getAdminOrder(
    orderCode: string,
    signal?: AbortSignal,
  ): Promise<AdminOrderDetail> {
    const response = await apiClient.get<ApiAdminOrderShowResponse>(
      `/admin/orders/${encodeURIComponent(orderCode)}`,
      { signal },
    )
    return mapApiAdminOrderDetailToAdminOrderDetail(response.data.order)
  },

  /**
   * Cập nhật trạng thái đơn hàng theo máy trạng thái nghiệp vụ
   */
  async updateAdminOrderStatus(
    orderCode: string,
    payload: UpdateAdminOrderStatusPayload,
    signal?: AbortSignal,
  ): Promise<{ message: string; order: AdminOrderDetail }> {
    const body: {
      status: string
      reason?: string
      carrier?: string
      tracking_code?: string
    } = {
      status: payload.status,
    }
    if (payload.reason !== undefined && payload.reason.trim()) {
      body.reason = payload.reason.trim()
    }
    if (payload.carrier !== undefined && payload.carrier.trim()) {
      body.carrier = payload.carrier.trim()
    }
    if (payload.tracking_code !== undefined && payload.tracking_code.trim()) {
      body.tracking_code = payload.tracking_code.trim()
    }

    const response = await apiClient.patch<ApiAdminOrderUpdateStatusResponse>(
      `/admin/orders/${encodeURIComponent(orderCode)}/status`,
      body,
      { signal },
    )

    return {
      message: response.data.message,
      order: mapApiAdminOrderDetailToAdminOrderDetail(response.data.order),
    }
  },

  /**
   * Xác nhận hoàn tiền thủ công cho đơn hàng (chỉ dành cho role Admin)
   * POST /api/admin/orders/{order_code}/refund
   */
  async confirmRefund(
    orderCode: string,
    payload?: ConfirmRefundPayload,
    signal?: AbortSignal,
  ): Promise<{ message: string; order: AdminOrderDetail }> {
    const response = await apiClient.post<{ message: string; order: ApiAdminOrderDetail }>(
      `/admin/orders/${encodeURIComponent(orderCode)}/refund`,
      payload ?? {},
      { signal },
    )

    return {
      message: response.data.message,
      order: mapApiAdminOrderDetailToAdminOrderDetail(response.data.order),
    }
  },
}

export default adminOrderService
