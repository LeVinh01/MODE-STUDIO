import { useMemo, useState, useRef } from 'react'
import { AlertCircle, Ruler } from 'lucide-react'
import type { ProductVariant } from '@/types/product'
import { Modal } from '@/components/feedback/Modal'
import { SIZE_GUIDE_DATA, SIZE_MEASUREMENT_TIPS } from '@/config/sizeGuide'
import { cn } from '@/utils/cn'
import styles from './VariantSelector.module.scss'

export interface VariantSelectorProps {
  variants: ProductVariant[]
  selectedColorId: number | null
  onSelectColor: (colorId: number) => void
  selectedSizeId: number | null
  onSelectSize: (sizeId: number) => void
  sizeWarning?: string | null
}

export const VariantSelector = ({
  variants,
  selectedColorId,
  onSelectColor,
  selectedSizeId,
  onSelectSize,
  sizeWarning,
}: VariantSelectorProps) => {
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false)
  const sizeGuideBtnRef = useRef<HTMLButtonElement>(null)

  const handleCloseSizeGuide = () => {
    setIsSizeGuideOpen(false)
    // Trả lại focus về nút mở modal
    sizeGuideBtnRef.current?.focus()
  }

  // 1. Trích xuất danh sách màu sắc duy nhất kèm tổng tồn kho
  const uniqueColors = useMemo(() => {
    const map = new Map<
      number,
      { id: number; name: string; hexCode?: string; totalStock: number }
    >()

    variants.forEach((v) => {
      if (v.isActive === false || v.colorId === undefined) return
      const existing = map.get(v.colorId)
      if (existing) {
        existing.totalStock += v.stock
      } else {
        map.set(v.colorId, {
          id: v.colorId,
          name: v.color,
          hexCode: v.colorHex,
          totalStock: v.stock,
        })
      }
    })

    return Array.from(map.values())
  }, [variants])

  // 2. Trích xuất danh sách kích cỡ duy nhất kèm thứ tự sắp xếp
  const uniqueSizes = useMemo(() => {
    const map = new Map<
      number,
      { id: number; name: string; sortOrder: number }
    >()

    variants.forEach((v) => {
      if (v.isActive === false || v.sizeId === undefined) return
      if (!map.has(v.sizeId)) {
        map.set(v.sizeId, {
          id: v.sizeId,
          name: v.size,
          sortOrder: v.sizeSortOrder ?? 0,
        })
      }
    })

    return Array.from(map.values()).sort((a, b) => a.sortOrder - b.sortOrder)
  }, [variants])

  // Kiểm tra trường hợp chỉ có 1 màu hoặc 1 size (One Size)
  const isSingleColor = uniqueColors.length === 1
  const isOneSize =
    uniqueSizes.length === 1 &&
    (uniqueSizes[0].name.toLowerCase().includes('one size') ||
      uniqueSizes.length === 1)

  const activeColor = uniqueColors.find((c) => c.id === selectedColorId)
  const activeSize = uniqueSizes.find((s) => s.id === selectedSizeId)

  return (
    <div className={styles.selectorContainer}>
      {/* ==================================================================
          1. CHỌN MÀU SẮC
          ================================================================== */}
      {uniqueColors.length > 0 && (
        <div className={styles.optionSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>
              Màu sắc: <strong>{activeColor?.name || 'Vui lòng chọn'}</strong>
            </span>
          </div>

          {isSingleColor ? (
            <div className={styles.singleValueText}>
              <span
                className={styles.colorSwatchBtn}
                style={{ cursor: 'default' }}
              >
                <span
                  className={styles.colorFill}
                  style={{
                    backgroundColor: activeColor?.hexCode || '#111111',
                  }}
                />
              </span>
              <span>{activeColor?.name}</span>
            </div>
          ) : (
            <div className={styles.colorList} role="radiogroup" aria-label="Chọn màu sắc">
              {uniqueColors.map((color) => {
                const isSelected = color.id === selectedColorId
                const isColorOutOfStock = color.totalStock <= 0

                return (
                  <button
                    key={color.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`Màu ${color.name}${isColorOutOfStock ? ' (Hết hàng)' : ''}`}
                    title={
                      isColorOutOfStock
                        ? `${color.name} (Hết hàng)`
                        : color.name
                    }
                    className={cn(
                      styles.colorSwatchBtn,
                      isSelected && styles.active,
                      isColorOutOfStock && styles.outOfStock,
                    )}
                    onClick={() => onSelectColor(color.id)}
                  >
                    <span
                      className={styles.colorFill}
                      style={{
                        backgroundColor: color.hexCode || '#111111',
                      }}
                    />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================
          2. CHỌN KÍCH CỠ
          ================================================================== */}
      {uniqueSizes.length > 0 && (
        <div className={styles.optionSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>
              Kích cỡ:{' '}
              <strong>
                {isOneSize
                  ? uniqueSizes[0].name
                  : activeSize?.name || 'Chưa chọn'}
              </strong>
            </span>

            {/* Nút mở Bảng hướng dẫn chọn size (ẩn khi không có size hoặc chỉ có One Size) */}
            {!isOneSize && uniqueSizes.length > 0 && (
              <button
                ref={sizeGuideBtnRef}
                type="button"
                onClick={() => setIsSizeGuideOpen(true)}
                className={styles.sizeGuideBtn}
                aria-haspopup="dialog"
                aria-label="Xem bảng hướng dẫn chọn kích cỡ"
              >
                <Ruler size={14} aria-hidden="true" />
                <span>Bảng hướng dẫn chọn size</span>
              </button>
            )}
          </div>

          {isOneSize ? (
            <div>
              <span className={styles.oneSizeBadge}>
                {uniqueSizes[0].name} (Freesize)
              </span>
            </div>
          ) : (
            <div className={styles.sizeList} role="radiogroup" aria-label="Chọn kích cỡ">
              {uniqueSizes.map((size) => {
                const isSelected = size.id === selectedSizeId

                // Tìm variant tương ứng ở màu đang chọn
                const variantForSize = variants.find(
                  (v) =>
                    v.isActive !== false &&
                    v.colorId === selectedColorId &&
                    v.sizeId === size.id,
                )

                // Hết hàng nếu không có variant hoặc stock <= 0
                const isAvailable = Boolean(
                  variantForSize && variantForSize.stock > 0,
                )

                return (
                  <button
                    key={size.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={!isAvailable}
                    aria-label={`Size ${size.name}${!isAvailable ? ' (Hết hàng)' : ''}`}
                    className={cn(
                      styles.sizeBtn,
                      isSelected && styles.active,
                      !isAvailable && styles.disabled,
                    )}
                    onClick={() => onSelectSize(size.id)}
                  >
                    {size.name}
                  </button>
                )
              })}
            </div>
          )}

          {/* Cảnh báo khi người dùng chưa chọn size */}
          {sizeWarning && (
            <div className={styles.warningMessage} role="alert">
              <AlertCircle size={14} />
              <span>{sizeWarning}</span>
            </div>
          )}
        </div>
      )}

      {/* Modal Bảng hướng dẫn chọn size chuẩn */}
      <Modal
        isOpen={isSizeGuideOpen}
        onClose={handleCloseSizeGuide}
        title="Bảng Hướng Dẫn Chọn Kích Cỡ"
        size="lg"
      >
        <div className={styles.sizeGuideModalContent}>
          <p className={styles.sizeGuideNote}>
            Bảng thông số kích cỡ may đo chuẩn của MODE STUDIO (tính bằng cm và kg). Quý khách vui lòng đối chiếu số đo cơ thể để lựa chọn kích cỡ vừa vặn nhất:
          </p>

          <div className={styles.sizeGuideTableWrapper}>
            <table className={styles.sizeGuideTable}>
              <thead>
                <tr>
                  <th scope="col">Kích cỡ</th>
                  <th scope="col">Vòng ngực</th>
                  <th scope="col">Vòng eo</th>
                  <th scope="col">Vòng mông</th>
                  <th scope="col">Chiều cao gợi ý</th>
                  <th scope="col">Cân nặng gợi ý</th>
                </tr>
              </thead>
              <tbody>
                {SIZE_GUIDE_DATA.map((row) => (
                  <tr key={row.size}>
                    <td className={styles.sizeGuideCellBold}>{row.size}</td>
                    <td>{row.bust} cm</td>
                    <td>{row.waist} cm</td>
                    <td>{row.hips} cm</td>
                    <td>{row.height} cm</td>
                    <td>{row.weight} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.sizeGuideTips}>
            <h4 className={styles.sizeGuideTipsTitle}>Lời khuyên từ thợ may đo MODE STUDIO:</h4>
            <ul className={styles.sizeGuideTipsList}>
              {SIZE_MEASUREMENT_TIPS.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default VariantSelector
