import { apiClient } from './client'
import type {
  ApiAuthResponse,
  AuthResult,
  LoginPayload,
  RegisterPayload,
  User,
} from '@/types/auth'
import { mapApiUserToUser } from './mappers'

export const authService = {
  /**
   * Đăng ký tài khoản khách hàng mới
   */
  async register(
    payload: RegisterPayload,
    signal?: AbortSignal,
  ): Promise<AuthResult> {
    const response = await apiClient.post<ApiAuthResponse>(
      '/auth/register',
      {
        full_name: payload.fullName,
        email: payload.email,
        phone: payload.phone || undefined,
        password: payload.password,
        password_confirmation: payload.passwordConfirmation,
      },
      { signal },
    )

    const { user, token } = response.data
    localStorage.setItem('mode_studio_token', token)

    return {
      user: mapApiUserToUser(user),
      token,
    }
  },

  /**
   * Đăng nhập người dùng bằng email và mật khẩu
   */
  async login(
    payload: LoginPayload,
    signal?: AbortSignal,
  ): Promise<AuthResult> {
    const response = await apiClient.post<ApiAuthResponse>(
      '/auth/login',
      {
        email: payload.email,
        password: payload.password,
      },
      { signal },
    )

    const { user, token } = response.data
    localStorage.setItem('mode_studio_token', token)

    return {
      user: mapApiUserToUser(user),
      token,
    }
  },

  /**
   * Đăng xuất và xóa token
   * Gọi API khi token còn tồn tại, luôn xóa token ở khối finally
   */
  async logout(signal?: AbortSignal): Promise<void> {
    const token = localStorage.getItem('mode_studio_token')
    try {
      if (token) {
        await apiClient.post('/auth/logout', {}, { signal })
      }
    } finally {
      localStorage.removeItem('mode_studio_token')
    }
  },

  /**
   * Lấy thông tin tài khoản hiện tại từ token Bearer
   */
  async getCurrentUser(signal?: AbortSignal): Promise<User> {
    const response = await apiClient.get<{ user: ApiAuthResponse['user'] }>(
      '/auth/me',
      { signal },
    )

    return mapApiUserToUser(response.data.user)
  },
}

export default authService
