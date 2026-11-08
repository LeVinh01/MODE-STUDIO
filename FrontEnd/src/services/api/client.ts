import axios, { AxiosHeaders } from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Request interceptor: attach bearer token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mode_studio_token')
    if (token) {
      if (!config.headers) {
        config.headers = new AxiosHeaders()
      }
      config.headers.set('Authorization', `Bearer ${token}`)
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor: handle 401 and 403
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const url = error.config?.url || ''
    const headers = error.config?.headers
      ? AxiosHeaders.from(error.config.headers)
      : null
    const authHeader = headers?.get('Authorization')

    // Bỏ qua cả /auth/login lẫn /auth/register
    const isAuthBypass =
      url.includes('/auth/login') || url.includes('/auth/register')

    if (!isAuthBypass && authHeader) {
      // 1. 401 có gửi kèm token -> token sai hoặc hết hạn -> xóa phiên
      if (status === 401) {
        localStorage.removeItem('mode_studio_token')
        window.dispatchEvent(new Event('auth:unauthorized'))
      }

      // 2. 403 từ /auth/me -> tài khoản bị khóa -> xóa phiên
      else if (status === 403 && url.includes('/auth/me')) {
        localStorage.removeItem('mode_studio_token')
        window.dispatchEvent(new Event('auth:unauthorized'))
      }

      // 3. 403 từ endpoint khác (có thể chỉ sai vai trò) -> KHÔNG xóa phiên ngay
      // mà gọi lại /auth/me để xác nhận tài khoản. Nếu /auth/me trả 401 hoặc 403 thì mới xóa.
      else if (status === 403) {
        try {
          await apiClient.get('/auth/me')
        } catch (meError: unknown) {
          const meStatus = (meError as { response?: { status?: number } })
            ?.response?.status
          if (meStatus === 401 || meStatus === 403) {
            localStorage.removeItem('mode_studio_token')
            window.dispatchEvent(new Event('auth:unauthorized'))
          }
        }
      }
    }

    return Promise.reject(error)
  },
)

export default apiClient

