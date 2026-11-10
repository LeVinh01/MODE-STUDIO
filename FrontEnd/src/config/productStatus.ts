import type { BadgeVariant } from '@/components/common/Badge/Badge'

export type ProductStatus = 'draft' | 'active' | 'archived'

export interface ProductStatusConfigItem {
  label: string
  variant: BadgeVariant
  description: string
}

/**
 * Nguồn chân lý duy nhất (Single Source of Truth) cho trạng thái sản phẩm tại MODE STUDIO
 */
export const PRODUCT_STATUS_CONFIG: Record<ProductStatus, ProductStatusConfigItem> = {
  draft: {
    label: 'Bản nháp',
    variant: 'default',
    description: 'Sản phẩm đang được soạn thảo nội bộ, chưa xuất hiện trên cửa hàng.',
  },
  active: {
    label: 'Đang hoạt động',
    variant: 'success',
    description: 'Sản phẩm đang được mở bán công khai trên cửa hàng.',
  },
  archived: {
    label: 'Lưu trữ',
    variant: 'outline',
    description: 'Sản phẩm đã ngừng kinh doanh và tạm ẩn khỏi cửa hàng.',
  },
}

/**
 * Helper lấy badge trạng thái sản phẩm an toàn (không làm vỡ trang nếu gặp giá trị lạ)
 */
export const getProductStatusBadge = (
  status?: string | null,
): { label: string; variant: BadgeVariant } => {
  if (!status) return { label: 'Không xác định', variant: 'default' }
  const config = PRODUCT_STATUS_CONFIG[status as ProductStatus]
  if (config) {
    return { label: config.label, variant: config.variant }
  }
  return { label: status, variant: 'default' }
}
