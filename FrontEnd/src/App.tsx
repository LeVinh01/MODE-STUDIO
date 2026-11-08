import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import axios from 'axios'
import router from '@/routes'
import { useAppDispatch } from '@/store/hooks'
import { resetAuth, setInitialized, setUser } from '@/store/slices/authSlice'
import { authService } from '@/services/api/authService'
import { useCartSync } from '@/hooks/useCartSync'

export function App() {
  const dispatch = useAppDispatch()

  // Tự động đồng bộ giỏ hàng với máy chủ và giữa các tab
  useCartSync()

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    const initAuth = async () => {
      const token = localStorage.getItem('mode_studio_token')
      if (!token) {
        dispatch(setInitialized(true))
        return
      }

      try {
        const user = await authService.getCurrentUser(signal)
        dispatch(setUser(user))
        dispatch(setInitialized(true))
      } catch (err: unknown) {
        // Request bị hủy (kể cả do React StrictMode gọi hiệu ứng hai lần) phải bị bỏ qua hoàn toàn
        if (signal.aborted || axios.isCancel(err)) {
          return
        }

        // Chỉ khi lỗi thật từ server mới xử lý
        const status = (err as { response?: { status?: number } })?.response
          ?.status
        if (status === 401 || status === 403) {
          localStorage.removeItem('mode_studio_token')
          dispatch(resetAuth())
        }
        dispatch(setInitialized(true))
      }
    }

    initAuth()

    // Listener cho sự kiện reset phiên đăng ký duy nhất một nơi
    const handleUnauthorized = () => {
      dispatch(resetAuth())
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)

    return () => {
      controller.abort()
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }
  }, [dispatch])

  return <RouterProvider router={router} />
}

export default App
