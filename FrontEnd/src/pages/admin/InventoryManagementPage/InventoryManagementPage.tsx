import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Boxes,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  X,
  Package,
  History,
  PlusCircle,
  ExternalLink,
} from 'lucide-react'
import axios from 'axios'
import { adminProductService } from '@/services/api/adminProductService'
import type {
  AdminLowStockItem,
  AdminStockAdjustmentItem,
  AdminVariantItem,
  StockAdjustmentType,
} from '@/types/adminProduct'
import type { ApiPaginationMeta } from '@/types/api'
import { Button, Badge } from '@/components/common'
import { Pagination } from '@/components/navigation/Pagination'
import { EmptyState, Spinner } from '@/components/feedback'
import {
  RowActionsMenu,
  StockAdjustmentModal,
  StockHistoryModal,
  type RowActionMenuItem,
} from '@/components/admin'
import { useMediaQuery } from '@/hooks'
import { useAppSelector } from '@/store/hooks'
import { selectCurrentUser } from '@/store/slices/authSlice'
import { getApiErrorMessage } from '@/utils'
import { cn } from '@/utils/cn'
import styles from './InventoryManagementPage.module.scss'

const DEFAULT_THRESHOLD = 10
const MIN_THRESHOLD = 0
const MAX_THRESHOLD = 200
const PRESET_THRESHOLDS = [5, 10, 15, 20]
const PER_PAGE = 20

interface BannerNotice {
  type: 'success' | 'info'
  message: string
}

export const InventoryManagementPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const currentUser = useAppSelector(selectCurrentUser)
  const isAdmin = currentUser?.role === 'admin'

  // Responsive breakpoint: chỉ render 1 giao diện (table hoặc card) trong DOM
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // 1. Phân tích query parameters từ URL
  const rawThreshold = searchParams.get('threshold')
  const currentThreshold = useMemo(() => {
    if (rawThreshold !== null && rawThreshold !== '') {
      const parsed = parseInt(rawThreshold, 10)
      if (!isNaN(parsed) && parsed >= MIN_THRESHOLD && parsed <= MAX_THRESHOLD) {
        return parsed
      }
    }
    return DEFAULT_THRESHOLD
  }, [rawThreshold])

  const rawPage = parseInt(searchParams.get('page') || '1', 10)
  const currentPage = !isNaN(rawPage) && rawPage >= 1 ? rawPage : 1

  // Local state ô input ngưỡng tùy chọn
  const [prevThreshold, setPrevThreshold] = useState(currentThreshold)
  const [customThresholdInput, setCustomThresholdInput] = useState<string>(
    String(currentThreshold),
  )

  if (prevThreshold !== currentThreshold) {
    setPrevThreshold(currentThreshold)
    setCustomThresholdInput(String(currentThreshold))
  }

  // 2. Data state
  const [items, setItems] = useState<AdminLowStockItem[]>([])
  const [meta, setMeta] = useState<ApiPaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [banner, setBanner] = useState<BannerNotice | null>(null)

  // 3. Modal state
  const [adjustingItem, setAdjustingItem] = useState<AdminLowStockItem | null>(null)
  const [historyItem, setHistoryItem] = useState<AdminLowStockItem | null>(null)

  // Adapter chuyển đổi AdminLowStockItem -> AdminVariantItem cho modals
  const mapLowStockToVariant = useCallback(
    (item: AdminLowStockItem): AdminVariantItem => ({
      id: item.id,
      productId: item.product?.id ?? 0,
      colorId: item.color?.id ?? 0,
      sizeId: item.size?.id ?? 0,
      sku: item.sku,
      stockQuantity: item.stockQuantity,
      isActive: item.isActive,
      note: null,
      deletedAt: null,
      createdAt: '',
      updatedAt: '',
      color: item.color,
      size: item.size,
    }),
    [],
  )

  const selectedVariantForAdjustment = useMemo(() => {
    return adjustingItem ? mapLowStockToVariant(adjustingItem) : null
  }, [adjustingItem, mapLowStockToVariant])

  const selectedVariantForHistory = useMemo(() => {
    return historyItem ? mapLowStockToVariant(historyItem) : null
  }, [historyItem, mapLowStockToVariant])

  // 4. Fetching dữ liệu có AbortController & tự động lùi trang
  const fetchLowStockData = useCallback(() => {
    const controller = new AbortController()

    adminProductService
      .getLowStockVariants(
        {
          threshold: currentThreshold,
          page: currentPage,
          per_page: PER_PAGE,
        },
        controller.signal,
      )
      .then((res) => {
        setItems(res.items)
        setMeta(res.meta)
        setIsLoading(false)
        setErrorMessage(null)

        // Tự động lùi về trang cuối hợp lệ nếu trang hiện tại > last_page
        if (
          res.meta.total > 0 &&
          res.meta.last_page > 0 &&
          currentPage > res.meta.last_page
        ) {
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev)
              next.set('page', String(res.meta.last_page))
              return next
            },
            { replace: true },
          )
        }
      })
      .catch((err) => {
        if (axios.isCancel(err)) return
        setIsLoading(false)
        setErrorMessage(
          getApiErrorMessage(err, 'Không thể tải danh sách tồn kho cảnh báo.'),
        )
      })

    return () => {
      controller.abort()
    }
  }, [currentThreshold, currentPage, setSearchParams])

  useEffect(() => {
    const cancel = fetchLowStockData()
    return cancel
  }, [fetchLowStockData])

  // 5. Handlers thay đổi ngưỡng và phân trang
  const handleSelectThreshold = (val: number) => {
    if (val === currentThreshold) return
    setIsLoading(true)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('threshold', String(val))
      next.set('page', '1')
      return next
    })
  }

  const handleApplyCustomThreshold = () => {
    const parsed = parseInt(customThresholdInput.trim(), 10)
    if (!isNaN(parsed) && parsed >= MIN_THRESHOLD && parsed <= MAX_THRESHOLD) {
      if (parsed !== currentThreshold) {
        setIsLoading(true)
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.set('threshold', String(parsed))
          next.set('page', '1')
          return next
        })
      }
    } else {
      // Revert lại giá trị hiện tại nếu không hợp lệ
      setCustomThresholdInput(String(currentThreshold))
    }
  }

  const handlePageChange = (newPage: number) => {
    setIsLoading(true)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', String(newPage))
      return next
    })
  }

  const handleRefresh = () => {
    setIsLoading(true)
    fetchLowStockData()
  }

  // 6. Xử lý sau khi điều chỉnh tồn kho thành công
  const handleAdjustmentSuccess = (
    variantId: number,
    quantityAfter: number,
    adjustment: AdminStockAdjustmentItem,
    type?: StockAdjustmentType,
    quantity?: number,
  ) => {
    const currentAdjusting = adjustingItem
    setAdjustingItem(null)

    const productName = currentAdjusting?.product?.name ?? 'Sản phẩm'
    const variantSpecs = currentAdjusting
      ? `${currentAdjusting.color?.name ?? ''} / ${currentAdjusting.size?.name ?? ''}`
      : ''

    if (quantityAfter > currentThreshold) {
      // Biến thể đã vượt ngưỡng: gỡ ngay khỏi danh sách
      setItems((prev) => prev.filter((i) => i.id !== variantId))

      let actionDesc = 'Đã cập nhật tồn kho'
      if (type === 'increment') {
        const delta = quantity ?? adjustment.delta
        actionDesc = `Đã nhập thêm hàng (+${delta})`
      } else if (type === 'set') {
        actionDesc = `Đã đặt lại tồn kho thành ${quantityAfter}`
      }

      setBanner({
        type: 'success',
        message: `${actionDesc}. Biến thể "${productName}" (${variantSpecs}) hiện có tồn kho ${quantityAfter} sản phẩm (đã đủ hàng, rời khỏi danh sách).`,
      })

      // Refetch nhẹ không bật full loading để cập nhật pagination/total
      fetchLowStockData()
    } else {
      // Biến thể vẫn còn trong danh sách cảnh báo
      setItems((prev) =>
        prev.map((i) =>
          i.id === variantId ? { ...i, stockQuantity: quantityAfter } : i,
        ),
      )

      setBanner({
        type: 'info',
        message: `Đã cập nhật tồn kho biến thể "${productName}" (${variantSpecs}) thành ${quantityAfter} sản phẩm (vẫn dưới ngưỡng cảnh báo ${currentThreshold}).`,
      })

      fetchLowStockData()
    }
  }

  // Stock Badge renderer
  const renderStockBadge = (stock: number) => {
    if (stock === 0) {
      return (
        <Badge variant="error" size="sm" dot>
          Hết hàng (0)
        </Badge>
      )
    }
    if (stock <= currentThreshold) {
      return (
        <Badge variant="warning" size="sm" dot>
          Sắp hết ({stock})
        </Badge>
      )
    }
    return (
      <Badge variant="success" size="sm" dot>
        Đủ hàng ({stock})
      </Badge>
    )
  }

  // Row actions menu items
  const getRowMenuItems = (item: AdminLowStockItem): RowActionMenuItem[] => {
    const menuItems: RowActionMenuItem[] = [
      {
        key: 'view-product',
        label: 'Xem sản phẩm',
        icon: <ExternalLink size={16} />,
        onClick: () => {
          if (item.product?.id) {
            navigate(`/admin/products/${item.product.id}/edit?tab=variants`)
          }
        },
      },
      {
        key: 'view-history',
        label: 'Xem lịch sử tồn kho',
        icon: <History size={16} />,
        onClick: () => {
          setHistoryItem(item)
        },
      },
    ]

    if (isAdmin) {
      menuItems.push({
        key: 'adjust-stock',
        label: 'Nhập thêm / Điều chỉnh tồn',
        icon: <PlusCircle size={16} />,
        onClick: () => {
          setAdjustingItem(item)
        },
      })
    }

    return menuItems
  }

  return (
    <div className={styles.inventoryPage}>
      {/* 1. Tiêu đề trang */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Quản lý kho hàng</h1>
          <p className={styles.subtitle}>
            Theo dõi và nhập thêm các biến thể sản phẩm sắp hết hoặc đã hết hàng
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            leftIcon={<RotateCcw size={16} />}
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* 2. Banner thông báo */}
      {banner && (
        <div
          className={cn(styles.alertBanner, styles[banner.type])}
          role="status"
          aria-live="polite"
        >
          <div className={styles.alertContent}>
            {banner.type === 'success' ? (
              <CheckCircle size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span>{banner.message}</span>
          </div>
          <button
            type="button"
            className={styles.alertCloseBtn}
            onClick={() => setBanner(null)}
            aria-label="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 3. Khung lọc ngưỡng cảnh báo */}
      <div className={styles.filtersCard}>
        <div className={styles.thresholdGroup}>
          <span className={styles.thresholdLabel}>Ngưỡng cảnh báo:</span>
          <div className={styles.pillGroup} role="group" aria-label="Chọn ngưỡng cảnh báo">
            {PRESET_THRESHOLDS.map((preset) => {
              const isActive = currentThreshold === preset
              return (
                <button
                  key={preset}
                  type="button"
                  className={cn(styles.pillBtn, isActive && styles.active)}
                  onClick={() => handleSelectThreshold(preset)}
                  aria-pressed={isActive}
                >
                  &le; {preset}
                </button>
              )
            })}
          </div>

          <div className={styles.customInputWrapper}>
            <span className={styles.thresholdLabel}>hoặc tùy chỉnh:</span>
            <input
              type="number"
              min={MIN_THRESHOLD}
              max={MAX_THRESHOLD}
              value={customThresholdInput}
              onChange={(e) => setCustomThresholdInput(e.target.value)}
              onBlur={handleApplyCustomThreshold}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              className={styles.customInput}
              aria-label="Ngưỡng tồn kho tùy chỉnh (0 đến 200)"
            />
          </div>
        </div>
      </div>

      {/* 4. Thanh tóm tắt tổng số lượng */}
      <div className={styles.summaryBar}>
        <span className={styles.summaryIcon}>
          <Boxes size={18} />
        </span>
        <span>
          Có tất cả{' '}
          <strong className={styles.summaryCount}>{meta?.total ?? 0}</strong>{' '}
          biến thể có tồn kho &le; <strong>{currentThreshold}</strong> sản phẩm
          {currentThreshold === 0 && ' (chỉ hiển thị biến thể đã hết hàng)'}
        </span>
      </div>

      {/* 5. Vùng nội dung danh sách (Desktop Table vs Mobile Cards) */}
      {isLoading ? (
        <div className={styles.errorBox}>
          <Spinner size="lg" />
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px' }}>
            Đang tải danh sách tồn kho cảnh báo...
          </p>
        </div>
      ) : errorMessage ? (
        <div className={styles.errorBox}>
          <AlertCircle size={32} />
          <p>{errorMessage}</p>
          <Button variant="secondary" size="sm" onClick={handleRefresh}>
            Thử lại
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CheckCircle size={48} />}
          title="Kho hàng đang ở trạng thái an toàn"
          description={`Không có biến thể nào có số lượng tồn kho nhỏ hơn hoặc bằng ${currentThreshold}.`}
        />
      ) : isDesktop ? (
        /* Desktop Table View */
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>SKU</th>
                  <th>Màu sắc / Kích cỡ</th>
                  <th>Trạng thái</th>
                  <th>Tồn kho</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.productCell}>
                        <div
                          className={styles.productThumbPlaceholder}
                          aria-hidden="true"
                        >
                          <Package size={20} />
                        </div>
                        <div className={styles.productMeta}>
                          {item.product ? (
                            <Link
                              to={`/admin/products/${item.product.id}/edit?tab=variants`}
                              className={styles.productName}
                            >
                              {item.product.name}
                            </Link>
                          ) : (
                            <span className={styles.productName}>
                              Sản phẩm #{item.id}
                            </span>
                          )}
                          <span className={styles.categoryName}>
                            {item.product?.category?.name ?? 'Không phân loại'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.skuText}>{item.sku}</span>
                    </td>
                    <td>
                      <div className={styles.variantCell}>
                        {item.color?.hexCode && (
                          <span
                            className={styles.colorSwatch}
                            style={{ backgroundColor: item.color.hexCode }}
                            title={item.color.name}
                          />
                        )}
                        <span className={styles.variantSpecs}>
                          {item.color?.name ?? '—'} / {item.size?.name ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td>
                      {item.isActive ? (
                        <Badge variant="success" size="sm">
                          Đang bán
                        </Badge>
                      ) : (
                        <Badge variant="default" size="sm">
                          Tạm ngừng
                        </Badge>
                      )}
                    </td>
                    <td>{renderStockBadge(item.stockQuantity)}</td>
                    <td>
                      <div className={styles.tableActions}>
                        {isAdmin && (
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<PlusCircle size={14} />}
                            onClick={() => setAdjustingItem(item)}
                          >
                            Nhập thêm
                          </Button>
                        )}
                        <RowActionsMenu
                          items={getRowMenuItems(item)}
                          triggerAriaLabel={`Thao tác cho biến thể ${item.sku}`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          {meta && meta.last_page > 1 && (
            <div className={styles.paginationWrapper}>
              <Pagination
                page={currentPage}
                totalPages={meta.last_page}
                onChange={handlePageChange}
              />
            </div>
          )}
        </div>
      ) : (
        /* Mobile Cards View (< 768px) */
        <div className={styles.cardList}>
          {items.map((item) => (
            <div key={item.id} className={styles.cardItem}>
              <div className={styles.cardHeader}>
                <div className={styles.cardProductInfo}>
                  <div
                    className={styles.productThumbPlaceholder}
                    aria-hidden="true"
                  >
                    <Package size={20} />
                  </div>
                  <div>
                    {item.product ? (
                      <Link
                        to={`/admin/products/${item.product.id}/edit?tab=variants`}
                        className={styles.cardProductName}
                      >
                        {item.product.name}
                      </Link>
                    ) : (
                      <span className={styles.cardProductName}>
                        Sản phẩm #{item.id}
                      </span>
                    )}
                    <div className={styles.categoryName}>
                      {item.product?.category?.name ?? 'Không phân loại'}
                    </div>
                  </div>
                </div>
                <RowActionsMenu
                  items={getRowMenuItems(item)}
                  triggerAriaLabel={`Thao tác cho biến thể ${item.sku}`}
                />
              </div>

              <div className={styles.cardBody}>
                <div className={styles.variantCell}>
                  {item.color?.hexCode && (
                    <span
                      className={styles.colorSwatch}
                      style={{ backgroundColor: item.color.hexCode }}
                      title={item.color.name}
                    />
                  )}
                  <span className={styles.variantSpecs}>
                    {item.color?.name ?? '—'} / {item.size?.name ?? '—'}
                  </span>
                  <span className={styles.skuText} style={{ marginLeft: 6 }}>
                    {item.sku}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {item.isActive ? (
                    <Badge variant="success" size="sm">
                      Đang bán
                    </Badge>
                  ) : (
                    <Badge variant="default" size="sm">
                      Tạm ngừng
                    </Badge>
                  )}
                  {renderStockBadge(item.stockQuantity)}
                </div>
              </div>

              <div className={styles.cardFooter}>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<History size={14} />}
                  onClick={() => setHistoryItem(item)}
                >
                  Xem lịch sử
                </Button>
                {isAdmin && (
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<PlusCircle size={14} />}
                    onClick={() => setAdjustingItem(item)}
                  >
                    Nhập thêm
                  </Button>
                )}
              </div>
            </div>
          ))}

          {/* Phân trang Mobile */}
          {meta && meta.last_page > 1 && (
            <div className={styles.paginationWrapper}>
              <Pagination
                page={currentPage}
                totalPages={meta.last_page}
                onChange={handlePageChange}
              />
            </div>
          )}
        </div>
      )}

      {/* 6. Modals */}
      <StockAdjustmentModal
        isOpen={Boolean(adjustingItem)}
        onClose={() => setAdjustingItem(null)}
        variant={selectedVariantForAdjustment}
        onSuccess={handleAdjustmentSuccess}
      />

      <StockHistoryModal
        isOpen={Boolean(historyItem)}
        onClose={() => setHistoryItem(null)}
        variant={selectedVariantForHistory}
      />
    </div>
  )
}

export default InventoryManagementPage
