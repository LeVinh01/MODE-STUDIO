import { useEffect, useRef } from 'react'
import axios from 'axios'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  selectCurrentUser,
  selectIsAuthInitialized,
} from '@/store/slices/authSlice'
import {
  fetchCart,
  setCart,
  setIsMerging,
  setNoticeMessage,
} from '@/store/slices/cartSlice'
import { cartService, notifyCartUpdated } from '@/services/api/cartService'
import { mapApiCartToCart } from '@/services/api/mappers'
import * as guestCartStorage from '@/utils/guestCartStorage'

const GUEST_MERGE_TOKEN_KEY = 'mode_studio_guest_merge_token'

/**
 * Sinh UUID v4 hợp lệ theo tiêu chuẩn RFC 4122
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Hook duy nhất xử lý gộp giỏ hàng khách vào tài khoản sau đăng nhập
 * Sử dụng Web Locks API để chống đa tab gộp đồng thời và Idempotency token để chống trùng lặp
 */
export function useGuestCartMerge(): void {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectCurrentUser)
  const isAuthInitialized = useAppSelector(selectIsAuthInitialized)

  const isMergingRef = useRef(false)

  useEffect(() => {
    // Chỉ chạy khi đã nạp xong trạng thái xác thực và người dùng đã đăng nhập
    if (!isAuthInitialized || !user) return

    const token = localStorage.getItem('mode_studio_token')
    if (!token) return

    const guestItems = guestCartStorage.getGuestCart()
    if (guestItems.length === 0) return

    if (isMergingRef.current) return
    isMergingRef.current = true
    dispatch(setIsMerging(true))

    const executeMerge = async () => {
      // Đọc lại giỏ khách bên trong lock để đảm bảo tab khác chưa xử lý xong
      const currentGuestItems = guestCartStorage.getGuestCart()
      if (currentGuestItems.length === 0) {
        return
      }

      // Lấy hoặc tạo merge_token đang chờ trong localStorage
      let mergeToken = ''
      try {
        mergeToken = localStorage.getItem(GUEST_MERGE_TOKEN_KEY) || ''
      } catch {
        // Bỏ qua
      }

      if (!mergeToken) {
        mergeToken = generateUUID()
        try {
          localStorage.setItem(GUEST_MERGE_TOKEN_KEY, mergeToken)
        } catch {
          // Bỏ qua
        }
      }

      const payloadItems = currentGuestItems.map((item) => ({
        variant_id: item.variantId,
        quantity: item.quantity,
      }))

      try {
        const response = await cartService.mergeCart(mergeToken, payloadItems)

        // THÀNH CÔNG 200 (kể cả already_merged === true)
        // 1. Xóa giỏ khách và xóa token chờ
        guestCartStorage.clearGuestCart()
        try {
          localStorage.removeItem(GUEST_MERGE_TOKEN_KEY)
        } catch {
          // Bỏ qua
        }

        // 2. Cập nhật state giỏ hàng từ response.cart ngay lập tức
        const mappedCart = mapApiCartToCart(response.cart)
        dispatch(setCart(mappedCart))

        // 3. Dispatch fetchCart() thêm một lần nữa để đồng bộ hoàn toàn với server
        dispatch(fetchCart())

        // 4. Tạo thông báo tóm tắt nếu có sản phẩm bị bỏ qua hoặc điều chỉnh số lượng
        const notices: string[] = []
        if (response.skipped && response.skipped.length > 0) {
          notices.push(`${response.skipped.length} sản phẩm không thể thêm vào giỏ`)
        }
        if (response.adjusted && response.adjusted.length > 0) {
          notices.push(
            `${response.adjusted.length} sản phẩm đã được điều chỉnh số lượng theo tồn kho thực tế`,
          )
        }

        if (notices.length > 0) {
          dispatch(setNoticeMessage(notices.join('. ') + '.'))
        }

        // 5. Đồng bộ sang các tab khác
        notifyCartUpdated()
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status

          if (status === 401) {
            // Lỗi 401: dừng lại, không xóa gì
            return
          }

          if (status === 422) {
            // Lỗi 422: xóa token chờ, giữ giỏ khách, hiện thông báo lỗi
            try {
              localStorage.removeItem(GUEST_MERGE_TOKEN_KEY)
            } catch {
              // Bỏ qua
            }
            const msg =
              err.response?.data?.message ||
              'Dữ liệu giỏ hàng chưa thể đồng bộ vào tài khoản.'
            dispatch(setNoticeMessage(msg))
            return
          }

          // Lỗi mạng hoặc 5xx: giữ cả giỏ khách và token chờ để lần sau gửi lại cùng token
          const msg =
            err.response?.data?.message ||
            'Không thể kết nối máy chủ để gộp giỏ hàng. Giỏ hàng của quý khách vẫn được lưu an toàn.'
          dispatch(setNoticeMessage(msg))
        } else {
          dispatch(
            setNoticeMessage(
              'Có lỗi xảy ra khi gộp giỏ hàng. Giỏ hàng của quý khách vẫn được bảo lưu.',
            ),
          )
        }
      } finally {
        isMergingRef.current = false
        dispatch(setIsMerging(false))
      }
    }

    const runWithLock = async () => {
      if (
        typeof navigator !== 'undefined' &&
        'locks' in navigator &&
        typeof navigator.locks?.request === 'function'
      ) {
        await navigator.locks.request('mode_studio_cart_merge', executeMerge)
      } else {
        await executeMerge()
      }
    }

    runWithLock()
  }, [user, isAuthInitialized, dispatch])
}
