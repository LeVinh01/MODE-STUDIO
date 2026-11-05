export type UserRole = 'admin' | 'staff' | 'customer'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl?: string
  createdAt?: string
  updatedAt?: string
}

