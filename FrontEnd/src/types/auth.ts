export type UserRole = 'customer' | 'operator' | 'admin'
export type UserStatus = 'active' | 'locked'

/**
 * Types cho Authentication DTOs từ API backend (snake_case)
 */
export interface ApiUser {
  id: number
  full_name: string
  email: string
  phone: string | null
  role: UserRole
  status: UserStatus
  email_verified_at: string | null
  last_login_at: string | null
}

export interface ApiAuthResponse {
  user: ApiUser
  token: string
}

/**
 * Types cho Frontend Domain (camelCase)
 */
export interface User {
  id: string
  fullName: string
  email: string
  phone?: string | null
  role: UserRole
  status: UserStatus
  emailVerifiedAt?: string | null
  lastLoginAt?: string | null
}

export interface AuthResult {
  user: User
  token: string
}

export interface RegisterPayload {
  fullName: string
  email: string
  phone?: string
  password: string
  passwordConfirmation: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface ApiValidationErrorResponse {
  message: string
  errors?: Record<string, string[]>
}
