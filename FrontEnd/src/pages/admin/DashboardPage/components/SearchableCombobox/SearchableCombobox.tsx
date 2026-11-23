import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, ChevronDown, X, FolderTree, Package, Store } from 'lucide-react'
import type { AdminCategoryItem } from '@/types/adminCategory'
import type { AdminProductListItem } from '@/types/adminProduct'
import { adminProductService } from '@/services/api/adminProductService'
import { removeVietnameseTones } from '@/utils/formatters'
import styles from './SearchableCombobox.module.scss'

export interface ComboboxOption {
  id: number
  name: string
  sub?: string
  isRootGroup?: boolean
  isIndent?: boolean
  productsCount?: number
  isAllOption?: boolean
}

interface SearchableComboboxProps {
  targetType: 'product' | 'category'
  selectedId: number | null
  selectedName?: string
  categories: AdminCategoryItem[]
  onSelect: (item: { id: number; name: string }) => void
  onClear: () => void
  disabled?: boolean
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  targetType,
  selectedId,
  selectedName,
  categories,
  onSelect,
  onClear,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)

  // Products state for 'product' mode
  const [products, setProducts] = useState<AdminProductListItem[]>([])
  const [productsTotal, setProductsTotal] = useState<number>(0)
  const [isSearchingProducts, setIsSearchingProducts] = useState(false)

  const triggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number
    left: number
    width: number
  }>({ top: 0, left: 0, width: 320 })

  // Calculate dropdown portal position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropdownPosition({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: Math.max(rect.width, 320),
    })
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setSearchQuery('')
    setHighlightedIndex(-1)
  }, [])

  // Open/Close listeners
  useEffect(() => {
    if (!isOpen) return

    updatePosition()

    const handleScrollOrResize = () => {
      updatePosition()
    }

    const handlePointerDownOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        handleClose()
      }
    }

    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    document.addEventListener('pointerdown', handlePointerDownOutside)

    // Focus input after render
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 40)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
      document.removeEventListener('pointerdown', handlePointerDownOutside)
    }
  }, [isOpen, updatePosition, handleClose])

  // Category Options: Grouped with root groups first + leaf indented + "Tất cả danh mục" (ID: 0)
  const categoryOptions = useMemo<ComboboxOption[]>(() => {
    const list: ComboboxOption[] = [
      {
        id: 0,
        name: 'Tất cả danh mục',
        sub: 'Toàn bộ cửa hàng',
        isAllOption: true,
        isRootGroup: true,
      },
    ]

    const roots = categories.filter((c) => !c.parentId)
    const childrenMap = new Map<number, AdminCategoryItem[]>()

    categories.forEach((c) => {
      if (c.parentId) {
        const arr = childrenMap.get(c.parentId) || []
        arr.push(c)
        childrenMap.set(c.parentId, arr)
      }
    })

    roots.forEach((root) => {
      list.push({
        id: root.id,
        name: root.name,
        sub: 'Nhóm gốc',
        productsCount: root.productsCount,
        isRootGroup: true,
      })

      const children = childrenMap.get(root.id) || []
      children.forEach((child) => {
        list.push({
          id: child.id,
          name: child.name,
          sub: root.name,
          productsCount: child.productsCount,
          isIndent: true,
        })
      })
    })

    // Standalone categories without parent mapped
    const processedIds = new Set(list.map((it) => it.id))
    categories.forEach((c) => {
      if (!processedIds.has(c.id)) {
        list.push({
          id: c.id,
          name: c.name,
          sub: c.parent ? c.parent.name : undefined,
          productsCount: c.productsCount,
          isIndent: Boolean(c.parentId),
        })
      }
    })

    return list
  }, [categories])

  // Filtered categories
  const filteredCategoryOptions = useMemo<ComboboxOption[]>(() => {
    const q = removeVietnameseTones(searchQuery.trim())
    if (!q) return categoryOptions

    return categoryOptions.filter((opt) => {
      const nameMatch = removeVietnameseTones(opt.name).includes(q)
      const subMatch = opt.sub ? removeVietnameseTones(opt.sub).includes(q) : false
      return nameMatch || subMatch
    })
  }, [categoryOptions, searchQuery])

  // Load products (debounced 300ms server search)
  useEffect(() => {
    if (targetType !== 'product' || !isOpen) return

    let ignore = false

    const timer = setTimeout(() => {
      setIsSearchingProducts(true)
      adminProductService
        .getAdminProducts({
          search: searchQuery.trim() || undefined,
          per_page: 50,
        })
        .then((res) => {
          if (!ignore) {
            setProducts(res.products || [])
            setProductsTotal(res.meta?.total || (res.products || []).length)
            setIsSearchingProducts(false)
          }
        })
        .catch(() => {
          if (!ignore) {
            setProducts([])
            setProductsTotal(0)
            setIsSearchingProducts(false)
          }
        })
    }, 300)

    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [targetType, searchQuery, isOpen])

  // Product options mapping
  const productOptions = useMemo<ComboboxOption[]>(() => {
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      sub: p.category?.name || 'Chưa phân loại',
    }))
  }, [products])

  const currentList = targetType === 'category' ? filteredCategoryOptions : productOptions

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      handleClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev + 1 < currentList.length ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : currentList.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIndex >= 0 && highlightedIndex < currentList.length) {
        const item = currentList[highlightedIndex]
        onSelect({ id: item.id, name: item.name })
        handleClose()
      }
    }
  }

  const handleSelectOption = (opt: ComboboxOption) => {
    onSelect({ id: opt.id, name: opt.name })
    handleClose()
  }

  const placeholderText =
    targetType === 'product' ? 'Chọn sản phẩm để phân tích...' : 'Chọn danh mục để phân tích...'

  return (
    <div className={styles.comboboxContainer}>
      {/* Trigger Box */}
      <div
        ref={triggerRef}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="dashboard-item-combobox-list"
        tabIndex={disabled ? -1 : 0}
        className={`${styles.triggerBox} ${isOpen ? styles.focused : ''} ${
          disabled ? styles.disabled : ''
        }`}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev)
        }}
        onKeyDown={handleKeyDown}
      >
        <span className={styles.triggerIcon}>
          {targetType === 'product' ? <Package size={14} /> : <FolderTree size={14} />}
        </span>

        <span
          className={`${styles.selectedLabel} ${
            selectedId === null ? styles.placeholder : ''
          }`}
          title={selectedName || placeholderText}
        >
          {selectedName || placeholderText}
        </span>

        <div className={styles.triggerActions}>
          {selectedId !== null && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={(e) => {
                e.stopPropagation()
                onClear()
              }}
              title="Xóa lựa chọn"
              aria-label="Xóa lựa chọn"
            >
              <X size={13} />
            </button>
          )}

          <span
            className={`${styles.chevronIcon} ${isOpen ? styles.rotated : ''}`}
            aria-hidden="true"
          >
            <ChevronDown size={14} />
          </span>
        </div>
      </div>

      {/* Floating Dropdown Listbox in Portal */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className={styles.dropdownPortal}
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
            role="listbox"
            id="dashboard-item-combobox-list"
          >
            {/* Search Input */}
            <div className={styles.searchBar}>
              <Search size={14} className={styles.searchIcon} aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                className={styles.searchInput}
                value={searchQuery}
                placeholder={
                  targetType === 'product'
                    ? 'Gõ tên sản phẩm để tìm kiếm...'
                    : 'Gõ tên danh mục...'
                }
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              {searchQuery && (
                <button
                  type="button"
                  className={styles.clearSearchBtn}
                  onClick={() => setSearchQuery('')}
                  title="Xóa tìm kiếm"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* List of Options */}
            <div className={styles.optionsList}>
              {targetType === 'product' && isSearchingProducts ? (
                <div className={styles.statusMessage}>Đang tìm kiếm sản phẩm...</div>
              ) : currentList.length === 0 ? (
                <div className={styles.statusMessage}>
                  Không tìm thấy kết quả phù hợp
                </div>
              ) : (
                currentList.map((opt, idx) => {
                  const isSelected = selectedId === opt.id
                  const isHighlighted = highlightedIndex === idx

                  return (
                    <div
                      key={`${opt.id}-${idx}`}
                      role="option"
                      aria-selected={isSelected}
                      className={`${styles.optionItem} ${
                        isSelected ? styles.selected : ''
                      } ${isHighlighted ? styles.highlighted : ''} ${
                        opt.isRootGroup ? styles.rootGroup : ''
                      } ${opt.isIndent ? styles.indented : ''}`}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => handleSelectOption(opt)}
                    >
                      <div className={styles.optionMain}>
                        {opt.isAllOption && (
                          <Store size={13} className={styles.storeIcon} />
                        )}
                        <span className={styles.optionName}>{opt.name}</span>
                        {opt.sub && (
                          <span className={styles.optionSub}>{opt.sub}</span>
                        )}
                      </div>

                      {opt.productsCount !== undefined && (
                        <span className={styles.countBadge}>
                          {opt.productsCount} SP
                        </span>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Hint for product limit */}
            {targetType === 'product' && productsTotal > 50 && (
              <div className={styles.footerHint}>
                Hiển thị 50 / {productsTotal} sản phẩm. Gõ thêm từ khóa để lọc chính xác.
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}

export default SearchableCombobox
