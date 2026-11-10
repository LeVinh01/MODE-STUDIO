import { useState, useMemo } from 'react'
import { adminProductService } from '@/services/api/adminProductService'
import type {
  AdminStockAdjustmentItem,
  AdminStockAdjustmentPayload,
  AdminVariantItem,
  StockAdjustmentType,
} from '@/types/adminProduct'
import { Input, Textarea, Button } from '@/components/common'
import { Modal, Spinner } from '@/components/feedback'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils'
import styles from './StockAdjustmentModal.module.scss'

export interface StockAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  variant: AdminVariantItem | null
  onSuccess: (
    variantId: number,
    quantityAfter: number,
    adjustment: AdminStockAdjustmentItem,
  ) => void
}

export const StockAdjustmentModal = ({
  isOpen,
  onClose,
  variant,
  onSuccess,
}: StockAdjustmentModalProps) => {
  const [type, setType] = useState<StockAdjustmentType>('increment')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentStock = variant?.stockQuantity ?? 0

  // Tính toán tồn kho sau khi điều chỉnh
  const parsedQty = parseInt(quantity, 10)
  const isQtyValidNumber = !isNaN(parsedQty) && parsedQty >= 0

  const previewAfter = useMemo(() => {
    if (!isQtyValidNumber) return currentStock
    if (type === 'set') return parsedQty
    if (type === 'increment') return currentStock + parsedQty
    if (type === 'decrement') return currentStock - parsedQty
    return currentStock
  }, [type, parsedQty, isQtyValidNumber, currentStock])

  // Cảnh báo sớm nếu trừ vượt quá tồn kho hiện tại (client-side early warning)
  const isDecrementOverStock =
    type === 'decrement' && isQtyValidNumber && parsedQty > currentStock

  const handleCloseModal = () => {
    setType('increment')
    setQuantity('1')
    setReason('')
    setFieldErrors({})
    setGeneralError(null)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!variant) return

    setFieldErrors({})
    setGeneralError(null)

    const errors: Record<string, string> = {}

    if (isNaN(parsedQty)) {
      errors.quantity = 'Vui lòng nhập số lượng hợp lệ.'
    } else if (type === 'set' && parsedQty < 0) {
      errors.quantity = 'Số lượng đặt lại không được âm.'
    } else if ((type === 'increment' || type === 'decrement') && parsedQty < 1) {
      errors.quantity = 'Số lượng điều chỉnh phải lớn hơn 0.'
    }

    if (!reason.trim()) {
      errors.reason = 'Vui lòng nhập lý do điều chỉnh tồn kho.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsSubmitting(true)

    try {
      const payload: AdminStockAdjustmentPayload = {
        type,
        quantity: parsedQty,
        reason: reason.trim(),
      }

      const res = await adminProductService.adjustVariantStock(variant.id, payload)
      // Dùng ngay quantityAfter từ response để cập nhật local state trước
      onSuccess(variant.id, res.quantityAfter, res)
      handleCloseModal()
    } catch (err: unknown) {
      const beErrors = getApiFieldErrors(err)
      if (Object.keys(beErrors).length > 0) {
        setFieldErrors(beErrors)
      }
      setGeneralError(
        getApiErrorMessage(
          err,
          'Không thể điều chỉnh tồn kho. Vui lòng kiểm tra lại thông tin.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!variant) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCloseModal}
      title="Điều chỉnh tồn kho"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={handleCloseModal}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            form="stock-adjust-form"
            variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" />
                <span>Đang lưu...</span>
              </>
            ) : (
              'Xác nhận điều chỉnh'
            )}
          </Button>
        </>
      }
    >
      <form id="stock-adjust-form" onSubmit={handleSubmit} noValidate>
        {generalError && (
          <div className={styles.errorAlert} role="alert">
            <AlertCircle size={16} />
            <span>{generalError}</span>
          </div>
        )}

        <div className={styles.variantSummary}>
          <div className={styles.variantInfo}>
            <span
              className={styles.swatch}
              style={{ backgroundColor: variant.color?.hexCode || '#ccc' }}
              title={variant.color?.name || 'Màu'}
            />
            <span className={styles.variantName}>
              {variant.color?.name || 'Màu'} / {variant.size?.name || 'Size'}
            </span>
            <span className={styles.sku}>SKU: {variant.sku}</span>
          </div>
          <div className={styles.currentStockBox}>
            <span className={styles.stockLabel}>Tồn kho hiện tại:</span>
            <span className={styles.stockValue}>{currentStock}</span>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.fieldLabel}>Loại điều chỉnh *</label>
          <div className={styles.typeOptions}>
            <label
              className={`${styles.typeOption} ${type === 'increment' ? styles.selected : ''}`}
            >
              <input
                type="radio"
                name="adjustType"
                value="increment"
                checked={type === 'increment'}
                onChange={() => setType('increment')}
                disabled={isSubmitting}
              />
              <div className={styles.typeText}>
                <strong>Nhập thêm hàng (+)</strong>
                <span>Cộng thêm số lượng vào kho hiện tại</span>
              </div>
            </label>

            <label
              className={`${styles.typeOption} ${type === 'decrement' ? styles.selected : ''}`}
            >
              <input
                type="radio"
                name="adjustType"
                value="decrement"
                checked={type === 'decrement'}
                onChange={() => setType('decrement')}
                disabled={isSubmitting}
              />
              <div className={styles.typeText}>
                <strong>Xuất bớt hàng (-)</strong>
                <span>Trừ bớt số lượng do hỏng, trả hàng...</span>
              </div>
            </label>

            <label
              className={`${styles.typeOption} ${type === 'set' ? styles.selected : ''}`}
            >
              <input
                type="radio"
                name="adjustType"
                value="set"
                checked={type === 'set'}
                onChange={() => setType('set')}
                disabled={isSubmitting}
              />
              <div className={styles.typeText}>
                <strong>Đặt lại tồn kho (=)</strong>
                <span>Kiểm kê và gán lại số lượng tồn chính xác</span>
              </div>
            </label>
          </div>

          <Input
            label="Số lượng *"
            type="number"
            min={type === 'set' ? '0' : '1'}
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value)
              if (fieldErrors.quantity) {
                setFieldErrors((prev) => {
                  const next = { ...prev }
                  delete next.quantity
                  return next
                })
              }
            }}
            errorMessage={fieldErrors.quantity}
            disabled={isSubmitting}
            fullWidth
          />

          {/* Cảnh báo sớm xuất vượt tồn kho */}
          {isDecrementOverStock && (
            <div className={styles.warningBox}>
              <AlertTriangle size={18} className={styles.warningIcon} />
              <span>
                <strong>Cảnh báo sớm:</strong> Số lượng xuất bớt ({parsedQty}) lớn hơn tồn kho hiện tại ({currentStock}). Tồn sau điều chỉnh sẽ là ({previewAfter}). Backend có thể từ chối thao tác này.
              </span>
            </div>
          )}

          {/* Xem trước tồn kho sau khi điều chỉnh */}
          <div className={styles.previewBox}>
            <span className={styles.previewLabel}>Tồn kho sau điều chỉnh:</span>
            <span
              className={`${styles.previewValue} ${previewAfter < 0 ? styles.negative : ''}`}
            >
              {currentStock} {type === 'increment' ? '+' : type === 'decrement' ? '-' : '->'}{' '}
              {isQtyValidNumber ? parsedQty : '0'} = <strong>{previewAfter}</strong>
            </span>
          </div>

          <Textarea
            label="Lý do điều chỉnh *"
            placeholder="Ví dụ: Nhập hàng từ nhà cung cấp theo hoá đơn #1042..."
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (fieldErrors.reason) {
                setFieldErrors((prev) => {
                  const next = { ...prev }
                  delete next.reason
                  return next
                })
              }
            }}
            errorMessage={fieldErrors.reason}
            disabled={isSubmitting}
            fullWidth
          />
        </div>
      </form>
    </Modal>
  )
}
