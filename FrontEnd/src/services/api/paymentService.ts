import apiClient from './client'
import type {
  ApiVnPayCreateUrlResponse,
  ApiVnPayVerifyResponse,
} from '@/types/api'

export const paymentService = {
  /**
   * Tạo URL thanh toán VNPay cho đơn hàng
   * POST /api/orders/{order_code}/payment/vnpay
   */
  async createVnPayPayment(
    orderCode: string,
    signal?: AbortSignal,
  ): Promise<ApiVnPayCreateUrlResponse> {
    const response = await apiClient.post<ApiVnPayCreateUrlResponse>(
      `/orders/${encodeURIComponent(orderCode)}/payment/vnpay`,
      {},
      { signal },
    )
    return response.data
  },

  /**
   * Xác thực kết quả giao dịch từ Return URL của VNPay (Public endpoint)
   * POST /api/payment/vnpay/verify
   * Gửi toàn bộ tham số vnp_* trong query string lên Backend
   */
  async verifyVnPayReturn(
    params: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<ApiVnPayVerifyResponse> {
    const response = await apiClient.post<ApiVnPayVerifyResponse>(
      '/payment/vnpay/verify',
      params,
      { signal },
    )
    return response.data
  },
}

export default paymentService
