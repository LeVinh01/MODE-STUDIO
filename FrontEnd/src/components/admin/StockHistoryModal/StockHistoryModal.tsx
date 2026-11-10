import { useState, useEffect, useCallback } from 'react'
import { adminProductService } from '@/services/api/adminProductService'
import type {
  AdminStockAdjustmentItem,
  AdminVariantItem,
} from '@/types/adminProduct'
import type { ApiPaginationMeta } from '@/types/api'
import { formatDateTime } from '@/utils/formatters'
import { Button } from '@/components/common'
import { Modal, Spinner, EmptyState } from '@/components/feedback'
import { Pagination } from '@/components/navigation'
import styles from './StockHistoryModal.module.scss'

export interface StockHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  variant: AdminVariantItem | null
}

export const StockHistoryModal = ({
  isOpen,
  onClose,
  variant,
}: StockHistoryModalProps) => {
  const [adjustments, setAdjustments] = useState<AdminStockAdjustmentItem[]>([])
  const [meta, setMeta] = useState<ApiPaginationMeta | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Hàm tải dữ liệu khi chuyển trang (tương tác người dùng)
  const handlePageChange = useCallback(
    async (page: number) => {
      if (!variant) return
      setIsLoading(true)
      setError(null)
      try {
        const res = await adminProductService.getVariantStockAdjustments(variant.id, {
          page,
          per_page: 8,
        })
        setAdjustments(res.adjustments)
        setMeta(res.meta)
        setCurrentPage(page)
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Không thể tải lịch sử tồn kho. Vui lòng thử lại.'
        setError(msg)
      } finally {
        setIsLoading(false)
      }
    },
    [variant],
  )

  // Tải dữ liệu ban đầu khi mở modal mà không gọi setState đồng bộ trong effect body
  useEffect(() => {
    if (!isOpen || !variant) return

    let isMounted = true

    adminProductService
      .getVariantStockAdjustments(variant.id, {
        page: 1,
        per_page: 8,
      })
      .then((res) => {
        if (!isMounted) return
        setAdjustments(res.adjustments)
        setMeta(res.meta)
        setCurrentPage(1)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Không thể tải lịch sử tồn kho. Vui lòng thử lại.'
        setError(msg)
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, variant])

  if (!variant) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lịch sử biến động tồn kho"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <div className={styles.container}>
        <div className={styles.variantHeader}>
          <span
            className={styles.swatch}
            style={{ backgroundColor: variant.color?.hexCode || '#ccc' }}
            title={variant.color?.name || 'Màu'}
          />
          <span className={styles.variantName}>
            {variant.color?.name || 'Màu'} / {variant.size?.name || 'Size'}
          </span>
          <span className={styles.sku}>SKU: {variant.sku}</span>
          <span className={styles.currentStock}>
            Tồn kho hiện tại: <strong>{variant.stockQuantity}</strong>
          </span>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}

        {isLoading ? (
          <div className={styles.loadingContainer}>
            <Spinner size="md" />
            <span>Đang tải lịch sử...</span>
          </div>
        ) : adjustments.length === 0 ? (
          <EmptyState
            title="Chưa có dữ liệu"
            description="Biến thể này chưa có lần điều chỉnh tồn kho nào."
          />
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Trước</th>
                    <th>Biến động</th>
                    <th>Sau</th>
                    <th>Lý do</th>
                    <th>Người thực hiện</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((item) => (
                    <tr key={item.id}>
                      <td className={styles.timeCell}>
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td>{item.quantityBefore}</td>
                      <td>
                        <span
                          className={`${styles.deltaBadge} ${
                            item.delta > 0
                              ? styles.positive
                              : item.delta < 0
                                ? styles.negative
                                : styles.neutral
                          }`}
                        >
                          {item.delta > 0
                            ? `+${item.delta}`
                            : item.delta < 0
                              ? item.delta
                              : '0'}
                        </span>
                      </td>
                      <td className={styles.afterCell}>{item.quantityAfter}</td>
                      <td className={styles.reasonCell} title={item.reason}>
                        {item.reason}
                      </td>
                      <td className={styles.userCell}>
                        {item.changedBy?.fullName ||
                          item.changedBy?.email ||
                          'Hệ thống'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta && meta.last_page > 1 && (
              <div className={styles.paginationWrapper}>
                <Pagination
                  page={currentPage}
                  totalPages={meta.last_page}
                  onChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
