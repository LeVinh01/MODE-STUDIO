import apiClient from './client'
import { mapApiOrderToOrder } from './mappers'
import type {
  ApiOrder,
  ApiOrderCancelPayload,
  ApiOrderCancelResponse,
  ApiOrderIndexParams,
  ApiOrderShowResponse,
  ApiOrderStoreResponse,
  ApiPaginatedResponse,
  ApiPaginationMeta,
} from '@/types/api'
import type { CreateOrderPayload, Order } from '@/types/order'

export const orderService = {
  /**
   * Lấy danh sách đơn hàng của người dùng hiện tại (kèm lọc và phân trang)
   */
  async getOrders(
    params?: ApiOrderIndexParams,
    signal?: AbortSignal,
  ): Promise<{ orders: Order[]; meta: ApiPaginationMeta }> {
    const response = await apiClient.get<ApiPaginatedResponse<ApiOrder>>(
      '/orders',
      {
        params,
        signal,
      },
    )
    return {
      orders: response.data.data.map(mapApiOrderToOrder),
      meta: response.data.meta,
    }
  },

  /**
   * Tạo đơn hàng mới từ giỏ hàng hiện tại (Checkout COD)
   */
  async createOrder(
    payload: CreateOrderPayload,
    signal?: AbortSignal,
  ): Promise<{ message: string; order: Order }> {
    const response = await apiClient.post<ApiOrderStoreResponse>(
      '/orders',
      payload,
      { signal },
    )
    return {
      message: response.data.message,
      order: mapApiOrderToOrder(response.data.order),
    }
  },

  /**
   * Lấy chi tiết đơn hàng của người dùng theo order_code
   */
  async getOrderByCode(
    orderCode: string,
    signal?: AbortSignal,
  ): Promise<Order> {
    const response = await apiClient.get<ApiOrderShowResponse>(
      `/orders/${encodeURIComponent(orderCode)}`,
      { signal },
    )
    return mapApiOrderToOrder(response.data.order)
  },

  /**
   * Hủy đơn hàng đang ở trạng thái pending
   * Quy tắc: Nếu lý do rỗng thì không gửi trường reason hoặc gửi null
   */
  async cancelOrder(
    orderCode: string,
    payload?: ApiOrderCancelPayload,
    signal?: AbortSignal,
  ): Promise<{ message: string; order: Order }> {
    const body: ApiOrderCancelPayload = {}
    if (payload?.reason && payload.reason.trim()) {
      body.reason = payload.reason.trim()
    }

    const response = await apiClient.post<ApiOrderCancelResponse>(
      `/orders/${encodeURIComponent(orderCode)}/cancel`,
      body,
      { signal },
    )
    return {
      message: response.data.message,
      order: mapApiOrderToOrder(response.data.order),
    }
  },
}

export default orderService
