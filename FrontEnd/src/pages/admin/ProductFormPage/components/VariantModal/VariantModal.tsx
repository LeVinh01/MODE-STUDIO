import { useState } from 'react'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import { adminProductService } from '@/services/api/adminProductService'
import type {
  AdminLookups,
  AdminVariantItem,
  AdminVariantStorePayload,
  AdminVariantUpdatePayload,
} from '@/types/adminProduct'
import { Input, Select, Textarea, Checkbox, Button } from '@/components/common'
import { Modal, Spinner } from '@/components/feedback'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils'
import styles from './VariantModal.module.scss'

export interface VariantModalProps {
  isOpen: boolean
  onClose: () => void
  productId: number | string
  variant: AdminVariantItem | null // null = Tạo mới, khác null = Sửa
  lookups: AdminLookups
  existingVariants: AdminVariantItem[]
  productStatus?: string
  onSuccess: (variant: AdminVariantItem, isRestored: boolean) => void
}

export const VariantModal = ({
  isOpen,
  onClose,
  productId,
  variant,
  lookups,
  existingVariants,
  productStatus,
  onSuccess,
}: VariantModalProps) => {
  const isEdit = Boolean(variant)

  const [colorId, setColorId] = useState<number | ''>(() =>
    variant ? variant.colorId : lookups.colors[0]?.id || '',
  )
  const [sizeId, setSizeId] = useState<number | ''>(() =>
    variant ? variant.sizeId : lookups.sizes[0]?.id || '',
  )
  const [sku, setSku] = useState(() => variant?.sku || '')
  const [stockQuantity, setStockQuantity] = useState(() =>
    variant ? String(variant.stockQuantity) : '0',
  )
  const [isActive, setIsActive] = useState(() =>
    variant ? variant.isActive : true,
  )
  const [note, setNote] = useState(() => variant?.note || '')

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Lấy màu được chọn hiện tại để xem trước swatch
  const selectedColor = lookups.colors.find((c) => c.id === Number(colorId))

  // Kiểm tra cảnh báo nếu tắt biến thể đang bán duy nhất của sản phẩm active
  const activeSellingCount = existingVariants.filter(
    (v) => !v.deletedAt && v.isActive,
  ).length
  const isOnlyActiveVariant =
    productStatus === 'active' &&
    isEdit &&
    Boolean(variant?.isActive) &&
    activeSellingCount <= 1

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setGeneralError(null)

    // Client Validation
    const errors: Record<string, string> = {}

    if (!isEdit) {
      if (!colorId) {
        errors.color_id = 'Vui lòng chọn màu sắc.'
      }
      if (!sizeId) {
        errors.size_id = 'Vui lòng chọn kích cỡ.'
      }

      // Kiểm tra trùng cặp màu + size với biến thể chưa xóa
      if (colorId && sizeId) {
        const isDuplicate = existingVariants.some(
          (v) =>
            !v.deletedAt &&
            v.colorId === Number(colorId) &&
            v.sizeId === Number(sizeId),
        )
        if (isDuplicate) {
          errors.color_id = 'Cặp màu sắc và kích cỡ này đã tồn tại trên sản phẩm.'
        }
      }

      const parsedStock = parseInt(stockQuantity, 10)
      if (isNaN(parsedStock) || parsedStock < 0) {
        errors.stock_quantity = 'Số lượng tồn kho ban đầu không được âm.'
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsSubmitting(true)

    try {
      if (!isEdit) {
        // TẠO MỚI (hoặc phục hồi soft-deleted)
        const payload: AdminVariantStorePayload = {
          color_id: Number(colorId),
          size_id: Number(sizeId),
          sku: sku.trim() || null,
          stock_quantity: parseInt(stockQuantity, 10),
          is_active: isActive,
          note: note.trim() || null,
        }

        const res = await adminProductService.createVariant(productId, payload)
        onSuccess(res.variant, res.isRestored)
        onClose()
      } else {
        // CẬP NHẬT (Khoá màu và size, chỉ cập nhật SKU, note, is_active)
        if (!variant) return

        const payload: AdminVariantUpdatePayload = {
          sku: sku.trim() || null,
          is_active: isActive,
          note: note.trim() || null,
        }

        const updated = await adminProductService.updateVariant(variant.id, payload)
        onSuccess(updated, false)
        onClose()
      }
    } catch (err: unknown) {
      const beErrors = getApiFieldErrors(err)
      if (Object.keys(beErrors).length > 0) {
        setFieldErrors(beErrors)
      }
      setGeneralError(
        getApiErrorMessage(
          err,
          'Đã có lỗi xảy ra khi lưu biến thể. Vui lòng kiểm tra lại.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa biến thể' : 'Thêm biến thể mới'}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            form="variant-form"
            variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" />
                <span>Đang lưu...</span>
              </>
            ) : isEdit ? (
              'Lưu thay đổi'
            ) : (
              'Thêm biến thể'
            )}
          </Button>
        </>
      }
    >
      <form id="variant-form" onSubmit={handleSubmit} noValidate>
        {generalError && (
          <div className={styles.errorAlert} role="alert">
            <AlertCircle size={16} />
            <span>{generalError}</span>
          </div>
        )}

        <div className={styles.formGroup}>
          <div className={styles.twoCol}>
            <div>
              <label className={styles.label}>
                Màu sắc *
                {selectedColor && (
                  <span
                    className={styles.swatchPreview}
                    style={{ backgroundColor: selectedColor.hex_code }}
                    title={selectedColor.hex_code}
                  />
                )}
              </label>
              <Select
                value={colorId}
                onChange={(e) => {
                  setColorId(e.target.value ? Number(e.target.value) : '')
                  if (fieldErrors.color_id) {
                    setFieldErrors((prev) => {
                      const next = { ...prev }
                      delete next.color_id
                      return next
                    })
                  }
                }}
                disabled={isEdit || isSubmitting}
                errorMessage={fieldErrors.color_id}
                helperText={
                  isEdit
                    ? 'Không thể thay đổi màu sắc sau khi đã tạo biến thể.'
                    : undefined
                }
                fullWidth
              >
                <option value="">-- Chọn màu sắc --</option>
                {lookups.colors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.hex_code})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Select
                label="Kích cỡ *"
                value={sizeId}
                onChange={(e) => {
                  setSizeId(e.target.value ? Number(e.target.value) : '')
                  if (fieldErrors.size_id) {
                    setFieldErrors((prev) => {
                      const next = { ...prev }
                      delete next.size_id
                      return next
                    })
                  }
                }}
                disabled={isEdit || isSubmitting}
                errorMessage={fieldErrors.size_id}
                helperText={
                  isEdit
                    ? 'Không thể thay đổi kích cỡ sau khi đã tạo biến thể.'
                    : undefined
                }
                fullWidth
              >
                <option value="">-- Chọn kích cỡ --</option>
                {lookups.sizes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className={styles.twoCol}>
            <Input
              label="Mã SKU"
              placeholder="Để trống sẽ tự sinh mã"
              value={sku}
              onChange={(e) => {
                setSku(e.target.value)
                if (fieldErrors.sku) {
                  setFieldErrors((prev) => {
                    const next = { ...prev }
                    delete next.sku
                    return next
                  })
                }
              }}
              errorMessage={fieldErrors.sku}
              disabled={isSubmitting}
              fullWidth
            />

            {!isEdit && (
              <Input
                label="Tồn kho ban đầu *"
                type="number"
                min="0"
                value={stockQuantity}
                onChange={(e) => {
                  setStockQuantity(e.target.value)
                  if (fieldErrors.stock_quantity) {
                    setFieldErrors((prev) => {
                      const next = { ...prev }
                      delete next.stock_quantity
                      return next
                    })
                  }
                }}
                errorMessage={fieldErrors.stock_quantity}
                disabled={isSubmitting}
                fullWidth
              />
            )}
          </div>

          <Checkbox
            label="Đang bật bán (Hoạt động)"
            helperText="Khách hàng có thể nhìn thấy và chọn mua biến thể này"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={isSubmitting}
          />

          {isOnlyActiveVariant && !isActive && (
            <div className={styles.warningNote} role="note">
              <AlertTriangle size={14} className={styles.warningIcon} />
              <span>
                Sản phẩm đang hoạt động yêu cầu giữ ít nhất 1 biến thể đang bán. Tắt biến thể này sẽ bị máy chủ từ chối trừ khi chuyển sản phẩm về bản nháp trước.
              </span>
            </div>
          )}

          <Textarea
            label="Ghi chú nội bộ"
            placeholder="Ví dụ: Lô hàng mới, vị trí ngăn kệ..."
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isSubmitting}
            fullWidth
          />
        </div>
      </form>
    </Modal>
  )
}
