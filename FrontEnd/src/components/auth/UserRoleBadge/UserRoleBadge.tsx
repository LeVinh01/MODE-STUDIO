import { Badge } from '@/components/common/Badge'
import type { UserRole } from '@/types/auth'

export interface UserRoleBadgeProps {
  role: UserRole
  className?: string
}

export const UserRoleBadge = ({ role, className }: UserRoleBadgeProps) => {
  switch (role) {
    case 'admin':
      return (
        <Badge variant="luxury" size="sm" className={className}>
          Quản trị viên
        </Badge>
      )
    case 'operator':
      return (
        <Badge variant="warning" size="sm" className={className}>
          Vận hành viên
        </Badge>
      )
    case 'customer':
    default:
      return (
        <Badge variant="outline" size="sm" className={className}>
          Khách hàng
        </Badge>
      )
  }
}

export default UserRoleBadge
