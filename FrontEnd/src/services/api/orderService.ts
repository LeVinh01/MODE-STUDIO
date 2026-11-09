import apiClient from './client'
import { mapApiOrderToOrder } from './mappers'
import type { ApiOrderShowResponse, ApiOrderStoreResponse } from '@/types/api'
import type { CreateOrderPayload, Order } from '@/types/order'

export const orderService = {
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
}

export default orderService
