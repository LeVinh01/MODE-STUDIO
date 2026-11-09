import type { OrderStatus } from '@/types/order'
import type { BadgeVariant } from '@/components/common/Badge/Badge'

export interface OrderStatusConfigItem {
  label: string
  variant: BadgeVariant
  step?: number
  description: string
}

/**
 * Nguồn chân lý duy nhất (Single Source of Truth) cho trạng thái đơn hàng tại MODE STUDIO
 */
export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusConfigItem> = {
  pending: {
    label: 'Chờ xác nhận',
    variant: 'warning',
    step: 1,
    description: 'Đơn hàng đang chờ bộ phận chăm sóc khách hàng của MODE STUDIO tiếp nhận và xác nhận.',
  },
  confirmed: {
    label: 'Đã xác nhận',
    variant: 'info',
    step: 2,
    description: 'Đơn hàng đã được xác nhận và đang được đóng gói cẩn trọng tại xưởng.',
  },
  shipping: {
    label: 'Đang vận chuyển',
    variant: 'info',
    step: 3,
    description: 'Đơn hàng đã được bàn giao cho đối tác vận chuyển để giao tới quý khách.',
  },
  delivered: {
    label: 'Đã giao thành công',
    variant: 'success',
    step: 4,
    description: 'Kiện hàng đã được giao thành công tới địa chỉ nhận hàng của quý khách.',
  },
  cancelled: {
    label: 'Đã hủy',
    variant: 'error',
    description: 'Đơn hàng đã bị hủy. Số lượng sản phẩm đã được tự động hoàn lại kho hàng.',
  },
}

export interface OrderFilterTab {
  id: string
  label: string
  status?: OrderStatus
}

export const ORDER_FILTER_TABS: OrderFilterTab[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ xác nhận', status: 'pending' },
  { id: 'confirmed', label: 'Đã xác nhận', status: 'confirmed' },
  { id: 'shipping', label: 'Đang vận chuyển', status: 'shipping' },
  { id: 'delivered', label: 'Đã giao', status: 'delivered' },
  { id: 'cancelled', label: 'Đã hủy', status: 'cancelled' },
]

export const ORDER_PROGRESS_STEPS: Array<{
  status: OrderStatus
  label: string
  step: number
}> = [
  { status: 'pending', label: 'Chờ xác nhận', step: 1 },
  { status: 'confirmed', label: 'Đã xác nhận', step: 2 },
  { status: 'shipping', label: 'Đang vận chuyển', step: 3 },
  { status: 'delivered', label: 'Đã giao thành công', step: 4 },
]
