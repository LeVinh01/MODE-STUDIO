import { useMemo } from 'react'
import { AlertCircle } from 'lucide-react'
import type { ProductVariant } from '@/types/product'
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
    </div>
  )
}

export default VariantSelector
