import type { OrderStatus, PaymentStatus } from '@/types/order'
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

/**
 * Helper lấy badge trạng thái đơn hàng an toàn (không làm vỡ trang nếu gặp giá trị lạ)
 */
export const getOrderStatusBadge = (
  status?: string | null,
): { label: string; variant: BadgeVariant } => {
  if (!status) return { label: 'Không xác định', variant: 'default' }
  const config = ORDER_STATUS_CONFIG[status as OrderStatus]
  if (config) {
    return { label: config.label, variant: config.variant }
  }
  return { label: status, variant: 'default' }
}

export interface PaymentStatusConfigItem {
  label: string
  variant: BadgeVariant
}

/**
 * Cấu hình hiển thị trạng thái thanh toán tập trung
 */
export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, PaymentStatusConfigItem> = {
  unpaid: {
    label: 'Chưa thanh toán',
    variant: 'warning',
  },
  paid: {
    label: 'Đã thanh toán',
    variant: 'success',
  },
  failed: {
    label: 'Thanh toán thất bại',
    variant: 'error',
  },
  refunded: {
    label: 'Đã hoàn tiền',
    variant: 'info',
  },
}

/**
 * Helper lấy badge trạng thái thanh toán an toàn (không làm vỡ trang nếu gặp giá trị lạ)
 */
export const getPaymentStatusBadge = (
  status?: string | null,
): { label: string; variant: BadgeVariant } => {
  if (!status) return { label: 'Chưa thanh toán', variant: 'warning' }
  const config = PAYMENT_STATUS_CONFIG[status as PaymentStatus]
  if (config) {
    return { label: config.label, variant: config.variant }
  }
  return { label: status, variant: 'default' }
}

/**
 * Cấu hình phương thức thanh toán
 */
export const PAYMENT_METHOD_CONFIG: Record<string, string> = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  vnpay: 'VNPAY',
}

export const getPaymentMethodLabel = (method?: string | null): string => {
  if (!method) return 'Chưa chọn'
  return PAYMENT_METHOD_CONFIG[method.toLowerCase()] || method
}

export interface AdminOrderActionItem {
  targetStatus: OrderStatus
  label: string
  variant: 'primary' | 'secondary'
  modalTitle: string
  modalDescription: string
  isCancel?: boolean
}

/**
 * Máy trạng thái nghiệp vụ cho các nút thao tác phía Admin
 */
export const ADMIN_ORDER_ACTIONS: Partial<Record<OrderStatus, AdminOrderActionItem[]>> = {
  pending: [
    {
      targetStatus: 'confirmed',
      label: 'Xác nhận đơn',
      variant: 'primary',
      modalTitle: 'Xác nhận đơn hàng',
      modalDescription:
        'Bạn có chắc chắn muốn xác nhận đơn hàng này để chuẩn bị đóng gói và xuất xưởng?',
    },
    {
      targetStatus: 'cancelled',
      label: 'Hủy đơn',
      variant: 'secondary',
      modalTitle: 'Hủy đơn hàng',
      modalDescription:
        'Vui lòng nhập lý do hủy đơn. Số lượng sản phẩm trong đơn hàng sẽ được tự động hoàn lại kho hàng.',
      isCancel: true,
    },
  ],
  confirmed: [
    {
      targetStatus: 'shipping',
      label: 'Bắt đầu giao hàng',
      variant: 'primary',
      modalTitle: 'Bắt đầu giao hàng',
      modalDescription:
        'Xác nhận bàn giao kiện hàng cho đối tác vận chuyển?',
    },
    {
      targetStatus: 'cancelled',
      label: 'Hủy đơn',
      variant: 'secondary',
      modalTitle: 'Hủy đơn hàng',
      modalDescription:
        'Vui lòng nhập lý do hủy đơn. Số lượng sản phẩm trong đơn hàng sẽ được tự động hoàn lại kho hàng.',
      isCancel: true,
    },
  ],
  shipping: [
    {
      targetStatus: 'delivered',
      label: 'Xác nhận đã giao',
      variant: 'primary',
      modalTitle: 'Xác nhận đã giao hàng thành công',
      modalDescription:
        'Xác nhận khách hàng đã nhận được kiện hàng đầy đủ. Với đơn hàng thanh toán khi nhận hàng (COD), hệ thống sẽ tự động cập nhật trạng thái thanh toán sang "Đã thanh toán".',
    },
  ],
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
