import axios from 'axios'
import apiClient from './client'
import { mapApiCartItemToCartItem, mapApiCartToCart } from './mappers'
import type {
  ApiCartItemActionResponse,
  ApiCartMergeResponse,
  ApiCartQuoteResponse,
  ApiCartResponse,
} from '@/types/api'
import type { Cart, CartItem } from '@/types/cart'

/**
 * Gửi tín hiệu timestamp sang các tab khác qua localStorage (không ghi dữ liệu cá nhân hay dữ liệu giỏ)
 */
export const notifyCartUpdated = (): void => {
  try {
    localStorage.setItem('mode_studio_cart_sync', Date.now().toString())
  } catch {
    // Bỏ qua nếu môi trường chặn truy cập storage
  }
}

let quoteDebounceTimer: ReturnType<typeof setTimeout> | null = null
let activeQuoteAbortController: AbortController | null = null

export const cartService = {
  /**
   * Lấy giỏ hàng của người dùng hiện tại từ máy chủ
   */
  async getCart(signal?: AbortSignal): Promise<Cart> {
    try {
      const response = await apiClient.get<ApiCartResponse>('/cart', { signal })
      return mapApiCartToCart(response.data)
    } catch (error) {
      if (signal?.aborted || axios.isCancel(error)) {
        throw error
      }
      throw error
    }
  },

  /**
   * Thêm sản phẩm vào giỏ hàng
   */
  async addItem(
    variantId: number,
    quantity: number,
    signal?: AbortSignal,
  ): Promise<{ message?: string; item: CartItem }> {
    try {
      const response = await apiClient.post<ApiCartItemActionResponse>(
        '/cart/items',
        {
          variant_id: variantId,
          quantity,
        },
        { signal },
      )

      notifyCartUpdated()

      return {
        message: response.data.message,
        item: mapApiCartItemToCartItem(response.data.item),
      }
    } catch (error) {
      if (signal?.aborted || axios.isCancel(error)) {
        throw error
      }
      throw error
    }
  },

  /**
   * Cập nhật số lượng của một dòng sản phẩm trong giỏ
   */
  async updateItem(
    id: string | number,
    quantity: number,
    signal?: AbortSignal,
  ): Promise<{ message?: string; item: CartItem }> {
    try {
      const response = await apiClient.patch<ApiCartItemActionResponse>(
        `/cart/items/${id}`,
        { quantity },
        { signal },
      )

      notifyCartUpdated()

      return {
        message: response.data.message,
        item: mapApiCartItemToCartItem(response.data.item),
      }
    } catch (error) {
      if (signal?.aborted || axios.isCancel(error)) {
        throw error
      }
      throw error
    }
  },

  /**
   * Xóa một dòng sản phẩm khỏi giỏ hàng
   */
  async removeItem(
    id: string | number,
    signal?: AbortSignal,
  ): Promise<{ message?: string }> {
    try {
      const response = await apiClient.delete<{ message?: string }>(
        `/cart/items/${id}`,
        { signal },
      )

      notifyCartUpdated()

      return response.data
    } catch (error) {
      if (signal?.aborted || axios.isCancel(error)) {
        throw error
      }
      throw error
    }
  },

  /**
   * Xóa sạch toàn bộ giỏ hàng
   */
  async clearCart(signal?: AbortSignal): Promise<{ message?: string }> {
    try {
      const response = await apiClient.delete<{ message?: string }>('/cart', {
        signal,
      })

      notifyCartUpdated()

      return response.data
    } catch (error) {
      if (signal?.aborted || axios.isCancel(error)) {
        throw error
      }
      throw error
    }
  },

  /**
   * Báo giá và kiểm tra trạng thái khả dụng cho giỏ hàng khách vãng lai
   * Debounce 300ms để gộp các thao tác bấm liên tiếp, chống spam và tránh đụng trần 60 req/phút
   */
  async quoteCart(
    items: Array<{ variant_id: number; quantity: number }>,
    signal?: AbortSignal,
  ): Promise<ApiCartQuoteResponse> {
    if (quoteDebounceTimer) {
      clearTimeout(quoteDebounceTimer)
      quoteDebounceTimer = null
    }

    if (activeQuoteAbortController) {
      activeQuoteAbortController.abort()
      activeQuoteAbortController = null
    }

    return new Promise((resolve, reject) => {
      const controller = new AbortController()
      activeQuoteAbortController = controller

      const handleAbort = () => {
        if (quoteDebounceTimer) {
          clearTimeout(quoteDebounceTimer)
          quoteDebounceTimer = null
        }
        controller.abort()
        reject(new axios.CanceledError('Thao tác báo giá giỏ hàng đã bị hủy.'))
      }

      if (signal) {
        if (signal.aborted) {
          return handleAbort()
        }
        signal.addEventListener('abort', handleAbort, { once: true })
      }

      quoteDebounceTimer = setTimeout(async () => {
        quoteDebounceTimer = null
        activeQuoteAbortController = null

        if (signal) {
          signal.removeEventListener('abort', handleAbort)
        }

        try {
          const response = await apiClient.post<ApiCartQuoteResponse>(
            '/cart/quote',
            { items },
            { signal: controller.signal },
          )
          resolve(response.data)
        } catch (error) {
          if (controller.signal.aborted || (signal && signal.aborted) || axios.isCancel(error)) {
            reject(new axios.CanceledError('Thao tác báo giá giỏ hàng đã bị hủy.'))
          } else {
            reject(error)
          }
        }
      }, 300)
    })
  },

  /**
   * Gộp giỏ hàng khách vãng lai vào tài khoản sau đăng nhập
   */
  async mergeCart(
    mergeToken: string,
    items: Array<{ variant_id: number; quantity: number }>,
    signal?: AbortSignal,
  ): Promise<ApiCartMergeResponse> {
    try {
      const response = await apiClient.post<ApiCartMergeResponse>(
        '/cart/merge',
        {
          merge_token: mergeToken,
          items,
        },
        { signal },
      )
      return response.data
    } catch (error) {
      if (signal?.aborted || axios.isCancel(error)) {
        throw error
      }
      throw error
    }
  },
}

export default cartService
