import type { ReactNode } from 'react'
import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import {
  selectCurrentUser,
  selectIsAuthInitialized,
} from '@/store/slices/authSlice'
import type { UserRole } from '@/types/auth'
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen'
import { ForbiddenPage } from '@/pages/ForbiddenPage'

export interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
  children?: ReactNode
}

/**
 * LƯU Ý BẢO MẬT QUAN TRỌNG:
 * ProtectedRoute bảo vệ luồng điều hướng ở tầng FrontEnd để đảm bảo trải nghiệm người dùng (UX).
 * Cơ chế phân quyền và kiểm soát bảo mật tuyệt đối nằm ở tầng Backend API (Laravel middleware: role:admin, role:operator).
 */
export const ProtectedRoute = ({
  allowedRoles,
  children,
}: ProtectedRouteProps) => {
  const isInitialized = useAppSelector(selectIsAuthInitialized)
  const user = useAppSelector(selectCurrentUser)
  const location = useLocation()

  // 1. Chờ khôi phục phiên từ localStorage và API /auth/me
  if (!isInitialized) {
    return <AuthLoadingScreen />
  }

  // 2. Chưa đăng nhập: Chuyển hướng sang /login và nhớ trang định vào
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 3. Sai vai trò: Hiển thị trang Không có quyền truy cập, KHÔNG chuyển hướng âm thầm và KHÔNG xóa phiên
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <ForbiddenPage requiredRoles={allowedRoles} />
  }

  // 4. Hợp lệ: Render component con hoặc Outlet
  return children ? <>{children}</> : <Outlet />
}

export default ProtectedRoute
