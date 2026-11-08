import { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  selectCurrentUser,
  selectIsAuthInitialized,
  resetAuth,
} from '@/store/slices/authSlice'
import { fetchCart, resetCart } from '@/store/slices/cartSlice'

/**
 * Quản lý vòng đời và đồng bộ giỏ hàng với máy chủ:
 * 1. Nạp giỏ khi người dùng đăng nhập hoặc khi khởi động xong ứng dụng.
 * 2. Hủy các request giỏ đang chạy khi đăng xuất / đổi phiên và xóa sạch state.
 * 3. Lắng nghe sự kiện storage từ tab khác để cập nhật giỏ (không ghi thêm timestamp để tránh vòng lặp).
 * 4. Kiểm tra lại giỏ khi chuyển tab quay lại (visibilitychange), có throttle 10 giây để tránh gọi dồn dập.
 */
export function useCartSync(): void {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectCurrentUser)
  const isAuthInitialized = useAppSelector(selectIsAuthInitialized)

  const activeAbortControllerRef = useRef<AbortController | null>(null)
  const lastVisibilityFetchRef = useRef<number>(0)
  const previousUserIdRef = useRef<string | null>(null)

  // 1. Đồng bộ khi user thay đổi (đăng nhập / đăng xuất / đổi tài khoản)
  useEffect(() => {
    if (!isAuthInitialized) return

    const currentUserId = user?.id ?? null

    // Nếu chuyển từ có user sang null (đăng xuất)
    if (!currentUserId) {
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort()
        activeAbortControllerRef.current = null
      }
      dispatch(resetCart())
      previousUserIdRef.current = null
      return
    }

    // Nếu đổi sang một tài khoản khác hoặc vừa mới đăng nhập
    if (currentUserId !== previousUserIdRef.current) {
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort()
      }
      const controller = new AbortController()
      activeAbortControllerRef.current = controller
      previousUserIdRef.current = currentUserId

      dispatch(fetchCart())
    }
  }, [user, isAuthInitialized, dispatch])

  // 2. Đồng bộ đa tab qua sự kiện storage và sự kiện visibilitychange
  useEffect(() => {
    // Lắng nghe thay đổi từ tab khác
    const handleStorageChange = (e: StorageEvent) => {
      // Khi tab khác đăng xuất (xóa token)
      if (e.key === 'mode_studio_token' && !e.newValue) {
        if (activeAbortControllerRef.current) {
          activeAbortControllerRef.current.abort()
          activeAbortControllerRef.current = null
        }
        dispatch(resetAuth())
        dispatch(resetCart())
        return
      }

      // Khi tab khác vừa cập nhật giỏ hàng (nhận timestamp)
      if (e.key === 'mode_studio_cart_sync') {
        const token = localStorage.getItem('mode_studio_token')
        if (token && user) {
          dispatch(fetchCart())
        }
      }
    }

    // Khi người dùng quay trở lại tab hiện tại
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return

      const token = localStorage.getItem('mode_studio_token')
      if (!token || !user) return

      const now = Date.now()
      // Giới hạn tần suất: tối đa 1 lần mỗi 10 giây
      if (now - lastVisibilityFetchRef.current > 10000) {
        lastVisibilityFetchRef.current = now
        dispatch(fetchCart())
      }
    }

    window.addEventListener('storage', handleStorageChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort()
        activeAbortControllerRef.current = null
      }
    }
  }, [user, dispatch])
}
