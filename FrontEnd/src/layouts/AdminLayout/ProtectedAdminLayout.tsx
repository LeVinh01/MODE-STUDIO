import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AdminLayout } from './AdminLayout'

/**
 * LƯU Ý BẢO MẬT:
 * ProtectedAdminLayout bảo vệ tuyến /admin ở tầng FrontEnd để nâng cao trải nghiệm người dùng (UX).
 * Cơ chế kiểm soát quyền thực tế và an toàn tuyệt đối do backend quyết định (Laravel middleware: role:admin, role:operator).
 */
export const ProtectedAdminLayout = () => {
  return (
    <ProtectedRoute allowedRoles={['admin', 'operator']}>
      <AdminLayout />
    </ProtectedRoute>
  )
}

export default ProtectedAdminLayout
