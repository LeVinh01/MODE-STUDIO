import { useNavigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { MainLayout } from '@/layouts/MainLayout/MainLayout'
import { Button } from '@/components/common/Button'
import { UserRoleBadge } from '@/components/auth/UserRoleBadge'
import { useAppSelector } from '@/store/hooks'
import { selectCurrentUser } from '@/store/slices/authSlice'
import type { UserRole } from '@/types/auth'
import styles from './ForbiddenPage.module.scss'

export interface ForbiddenPageProps {
  requiredRoles?: UserRole[]
}

export const ForbiddenPage = ({ requiredRoles }: ForbiddenPageProps = {}) => {
  const navigate = useNavigate()
  const user = useAppSelector(selectCurrentUser)

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.iconCircle}>
            <ShieldAlert size={36} className={styles.icon} />
          </div>

          <span className={styles.errorCode}>403 • TRUY CẬP BỊ TỪ CHỐI</span>
          <h1 className={styles.title}>Không Có Quyền Truy Cập</h1>

          {user && (
            <div className={styles.userInfoBox}>
              <div className={styles.userRow}>
                <span className={styles.userLabel}>Tài khoản hiện tại:</span>
                <span className={styles.userName}>{user.fullName}</span>
              </div>
              <div className={styles.userRow}>
                <span className={styles.userLabel}>Email:</span>
                <span className={styles.userEmail}>{user.email}</span>
              </div>
              <div className={styles.userRow}>
                <span className={styles.userLabel}>Vai trò:</span>
                <UserRoleBadge role={user.role} />
              </div>
            </div>
          )}

          <p className={styles.description}>
            Khu vực này yêu cầu quyền hạn cao hơn (
            {requiredRoles?.map((r) => (r === 'admin' ? 'Quản trị viên' : 'Vận hành viên')).join(', ') || 'Đặc quyền'}
            ). Bạn có thể bấm vào biểu tượng tài khoản trên thanh điều hướng để đăng xuất và chuyển sang tài khoản có thẩm quyền tương ứng.
          </p>

          <div className={styles.actions}>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => navigate(-1)}
            >
              Quay Lại
            </Button>
            <Button
              to="/"
              variant="primary"
              size="md"
            >
              Về Trang Chủ
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

export default ForbiddenPage
