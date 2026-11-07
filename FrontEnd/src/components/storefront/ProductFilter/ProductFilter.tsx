import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  FILTER_COLORS,
  FILTER_SIZES,
  FILTER_GENDERS,
  FILTER_PRICE_RANGES,
} from '@/config/filters'
import type { ParsedFilters } from '@/hooks/useProductFilters'
import type { ProductCategory } from '@/types/product'
import { Input } from '@/components/common/Input'
import { cn } from '@/utils/cn'
import styles from './ProductFilter.module.scss'

export interface ProductFilterProps {
  filters: ParsedFilters
  onChange: (updated: Partial<ParsedFilters>) => void
  categories: ProductCategory[]
  isLoadingCategories?: boolean
}

export const ProductFilter = ({
  filters,
  onChange,
  categories,
  isLoadingCategories = false,
}: ProductFilterProps) => {
  // Local state cho ô nhập khoảng giá tùy chỉnh để tránh trigger API mỗi ký tự
  const [minInput, setMinInput] = useState<string>(
    filters.minPrice !== undefined ? String(filters.minPrice) : '',
  )
  const [maxInput, setMaxInput] = useState<string>(
    filters.maxPrice !== undefined ? String(filters.maxPrice) : '',
  )
  const [prevPrices, setPrevPrices] = useState({
    min: filters.minPrice,
    max: filters.maxPrice,
  })

  // Đồng bộ lại local input khi filters thay đổi từ bên ngoài (ví dụ reset URL hoặc chọn khoảng giá định sẵn)
  if (
    prevPrices.min !== filters.minPrice ||
    prevPrices.max !== filters.maxPrice
  ) {
    setPrevPrices({ min: filters.minPrice, max: filters.maxPrice })
    setMinInput(filters.minPrice !== undefined ? String(filters.minPrice) : '')
    setMaxInput(filters.maxPrice !== undefined ? String(filters.maxPrice) : '')
  }

  // Áp dụng khoảng giá khi rời ô hoặc nhấn Enter
  const handleCommitPrice = () => {
    const minVal = minInput.trim() ? parseInt(minInput.trim(), 10) : undefined
    const maxVal = maxInput.trim() ? parseInt(maxInput.trim(), 10) : undefined

    let validMin = minVal !== undefined && minVal >= 0 ? minVal : undefined
    let validMax = maxVal !== undefined && maxVal >= 0 ? maxVal : undefined

    if (validMin !== undefined && validMax !== undefined && validMin > validMax) {
      const temp = validMin
      validMin = validMax
      validMax = temp
      setMinInput(String(validMin))
      setMaxInput(String(validMax))
    }

    onChange({
      minPrice: validMin,
      maxPrice: validMax,
    })
  }

  const handlePriceKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
      handleCommitPrice()
    }
  }

  // Toggle color id trong danh sách
  const handleToggleColor = (id: string) => {
    const exists = filters.colorIds.includes(id)
    const newColors = exists
      ? filters.colorIds.filter((c) => c !== id)
      : [...filters.colorIds, id]
    onChange({ colorIds: newColors })
  }

  // Toggle size id trong danh sách
  const handleToggleSize = (id: string) => {
    const exists = filters.sizeIds.includes(id)
    const newSizes = exists
      ? filters.sizeIds.filter((s) => s !== id)
      : [...filters.sizeIds, id]
    onChange({ sizeIds: newSizes })
  }

  // Xác định khoảng giá định sẵn nào đang khớp
  const activeRange = FILTER_PRICE_RANGES.find((range) => {
    if (range.id === 'all') {
      return filters.minPrice === undefined && filters.maxPrice === undefined
    }
    return (
      filters.minPrice === range.minPrice && filters.maxPrice === range.maxPrice
    )
  })

  return (
    <div className={styles.filterContainer}>
      {/* 1. DANH MỤC SẢN PHẨM (CÂY CHA - CON) */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Danh Mục</h3>
        </div>

        {isLoadingCategories ? (
          <p className={styles.priceHelper}>Đang tải danh mục...</p>
        ) : (
          <ul className={styles.categoryList}>
            <li className={styles.categoryItem}>
              <button
                type="button"
                className={cn(
                  styles.categoryBtn,
                  !filters.category && styles.active,
                )}
                onClick={() => onChange({ category: '' })}
              >
                Tất Cả Danh Mục
              </button>
            </li>

            {categories.map((cat) => {
              const isCatActive = filters.category === cat.slug

              return (
                <li key={cat.id} className={styles.categoryItem}>
                  <button
                    type="button"
                    className={cn(
                      styles.categoryBtn,
                      isCatActive && styles.active,
                    )}
                    onClick={() => onChange({ category: cat.slug })}
                  >
                    {cat.name}
                  </button>

                  {/* Danh mục con nếu có */}
                  {cat.children && cat.children.length > 0 && (
                    <ul className={styles.subCategoryList}>
                      {cat.children.map((child) => (
                        <li key={child.id}>
                          <button
                            type="button"
                            className={cn(
                              styles.subCategoryBtn,
                              filters.category === child.slug && styles.active,
                            )}
                            onClick={() => onChange({ category: child.slug })}
                          >
                            {child.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* 2. GIỚI TÍNH (CHỈ CHỌN 1 GIÁ TRỊ) */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Giới Tính</h3>
        </div>

        <div className={styles.genderGroup}>
          {FILTER_GENDERS.map((genderOpt) => {
            const isSelected = filters.gender === genderOpt.value

            return (
              <div
                key={genderOpt.value}
                className={cn(styles.genderOption, isSelected && styles.active)}
                onClick={() => onChange({ gender: genderOpt.value })}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault()
                    onChange({ gender: genderOpt.value })
                  }
                }}
              >
                <div className={styles.radioCircle}>
                  {isSelected && <div className={styles.radioDot} />}
                </div>
                <span>{genderOpt.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 3. KHOẢNG GIÁ (VND) */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Mức Giá</h3>
        </div>

        {/* Các mức giá gợi ý */}
        <div className={styles.priceRangeList}>
          {FILTER_PRICE_RANGES.map((range) => {
            const isSelected = activeRange?.id === range.id

            return (
              <button
                key={range.id}
                type="button"
                className={cn(styles.priceRangeBtn, isSelected && styles.active)}
                onClick={() => {
                  onChange({
                    minPrice: range.minPrice,
                    maxPrice: range.maxPrice,
                  })
                }}
              >
                {range.label}
              </button>
            )
          })}
        </div>

        {/* Nhập khoảng giá tùy chỉnh */}
        <div className={styles.customPriceInputs}>
          <Input
            type="number"
            placeholder="Từ"
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={handleCommitPrice}
            onKeyDown={handlePriceKeyDown}
            aria-label="Giá tối thiểu"
          />
          <span className={styles.priceDash}>–</span>
          <Input
            type="number"
            placeholder="Đến"
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={handleCommitPrice}
            onKeyDown={handlePriceKeyDown}
            aria-label="Giá tối đa"
          />
        </div>
        <p className={styles.priceHelper}>Nhấn Enter hoặc rời ô để áp dụng</p>
      </div>

      {/* 4. MÀU SẮC */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Màu Sắc</h3>
          {filters.colorIds.length > 0 && (
            <button
              type="button"
              className={styles.subCategoryBtn}
              onClick={() => onChange({ colorIds: [] })}
            >
              Xóa ({filters.colorIds.length})
            </button>
          )}
        </div>

        <div className={styles.colorGrid}>
          {FILTER_COLORS.map((color) => {
            const isSelected = filters.colorIds.includes(color.id)

            return (
              <button
                key={color.id}
                type="button"
                className={cn(styles.colorItem, isSelected && styles.active)}
                onClick={() => handleToggleColor(color.id)}
                title={color.name}
                aria-pressed={isSelected}
              >
                <span
                  className={styles.colorDot}
                  style={{ backgroundColor: color.hex }}
                />
                <span className={styles.colorName}>{color.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 5. KÍCH THƯỚC (SIZE) */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Kích Cỡ</h3>
          {filters.sizeIds.length > 0 && (
            <button
              type="button"
              className={styles.subCategoryBtn}
              onClick={() => onChange({ sizeIds: [] })}
            >
              Xóa ({filters.sizeIds.length})
            </button>
          )}
        </div>

        <div className={styles.sizeGrid}>
          {FILTER_SIZES.map((size) => {
            const isSelected = filters.sizeIds.includes(size.id)

            return (
              <button
                key={size.id}
                type="button"
                className={cn(styles.sizeBtn, isSelected && styles.active)}
                onClick={() => handleToggleSize(size.id)}
                aria-pressed={isSelected}
              >
                {size.name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ProductFilter
