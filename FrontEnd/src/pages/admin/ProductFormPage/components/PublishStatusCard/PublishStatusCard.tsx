import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import type { AdminProductDetail } from '@/types/adminProduct'
import { getProductStatusBadge } from '@/config/productStatus'
import { formatDateTime } from '@/utils/formatters'
import { Button, Badge } from '@/components/common'
import styles from './PublishStatusCard.module.scss'

export interface PublishStatusCardProps {
  product: AdminProductDetail
  isAdmin: boolean
  isFormDirty: boolean
  isPublishing: boolean
  onPublish: () => void
  onSavePrompt: () => void
}

export const PublishStatusCard = ({
  product,
  isAdmin,
  isFormDirty,
  isPublishing,
  onPublish,
  onSavePrompt,
}: PublishStatusCardProps) => {
  const statusBadge = getProductStatusBadge(product.status)
  const [mountedTime] = useState(() => Date.now())

  // 1. Kiểm tra biến thể đang bán (không tính đã xóa mềm)
  const activeVariantsCount = useMemo(() => {
    return product.variants.filter((v) => v.isActive && !v.deletedAt).length
  }, [product.variants])

  const hasActiveVariant = activeVariantsCount >= 1

  // 2. Kiểm tra hình ảnh
  const imagesCount = product.images.length
  const hasImage = imagesCount >= 1

  const isEligibleToPublish = hasActiveVariant && hasImage

  // 3. Kiểm tra hiển thị nút "Xem trên cửa hàng"
  // Chỉ hiện khi status = active VÀ published_at không ở tương lai
  const isLiveOnStore = useMemo(() => {
    if (product.status !== 'active' || !product.publishedAt) return false
    const pubTime = new Date(product.publishedAt).getTime()
    return !isNaN(pubTime) && pubTime <= mountedTime
  }, [product.status, product.publishedAt, mountedTime])

  const handlePublishClick = () => {
    if (isFormDirty) {
      onSavePrompt()
      return
    }
    onPublish()
  }

  return (
    <div className={styles.publishCard}>
      <div className={styles.header}>
        <div className={styles.statusGroup}>
          <span className={styles.label}>Trạng thái hiện tại:</span>
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          {product.publishedAt && (
            <span className={styles.publishedAt}>
              (Đã xuất bản: {formatDateTime(product.publishedAt)})
            </span>
          )}
        </div>

        <div className={styles.actions}>
          {isLiveOnStore && (
            <a
              href={`/products/${product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.storeLink}
              title="Mở trang sản phẩm ngoài cửa hàng"
            >
              <span>Xem trên cửa hàng</span>
              <ExternalLink size={16} />
            </a>
          )}

          {isAdmin && product.status !== 'active' && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!isEligibleToPublish || isPublishing}
              onClick={handlePublishClick}
              leftIcon={<Sparkles size={16} />}
            >
              {isPublishing ? 'Đang xuất bản...' : 'Xuất bản sản phẩm'}
            </Button>
          )}
        </div>
      </div>

      <div className={styles.checklist}>
        <h4 className={styles.checklistTitle}>Điều kiện để xuất bản:</h4>
        <div className={styles.checklistItems}>
          <div
            className={`${styles.checkItem} ${hasActiveVariant ? styles.passed : styles.failed}`}
          >
            {hasActiveVariant ? (
              <CheckCircle2 size={16} className={styles.checkIcon} />
            ) : (
              <AlertCircle size={16} className={styles.checkIcon} />
            )}
            <span>
              Có ít nhất 1 biến thể đang bán (Hiện có: <strong>{activeVariantsCount}</strong>)
            </span>
          </div>

          <div
            className={`${styles.checkItem} ${hasImage ? styles.passed : styles.failed}`}
          >
            {hasImage ? (
              <CheckCircle2 size={16} className={styles.checkIcon} />
            ) : (
              <AlertCircle size={16} className={styles.checkIcon} />
            )}
            <span>
              Có ít nhất 1 hình ảnh sản phẩm (Hiện có: <strong>{imagesCount}</strong>)
            </span>
          </div>
        </div>

        {product.status !== 'active' && !isEligibleToPublish && (
          <p className={styles.hint}>
            Vui lòng thêm ít nhất một biến thể đang bật bán và tải lên ít nhất một hình ảnh trước khi xuất bản.
          </p>
        )}

        {product.status !== 'active' && isEligibleToPublish && isFormDirty && (
          <p className={styles.dirtyHint}>
            Biểu mẫu thông tin cơ bản có thay đổi chưa lưu. Hãy lưu trước khi bấm Xuất bản.
          </p>
        )}
      </div>
    </div>
  )
}
