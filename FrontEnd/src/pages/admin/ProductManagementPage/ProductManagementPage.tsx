import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  Search,
  X,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  Archive,
  Eye,
  AlertCircle,
  Package,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import axios from 'axios'
import { adminProductService } from '@/services/api/adminProductService'
import { useAdminLookups } from '@/hooks/useAdminLookups'
import type { AdminProductListItem } from '@/types/adminProduct'
import type { ApiPaginationMeta } from '@/types/api'
import { getProductStatusBadge, type ProductStatus } from '@/config/productStatus'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import { getApiErrorMessage } from '@/utils'
import { Button, Badge, Select, Input } from '@/components/common'
import { Pagination } from '@/components/navigation/Pagination'
import { EmptyState, Skeleton, Modal } from '@/components/feedback'
import { RowActionsMenu } from '@/components/admin'
import { useMediaQuery } from '@/hooks'
import { useAppSelector } from '@/store/hooks'
import { selectCurrentUser } from '@/store/slices/authSlice'
import styles from './ProductManagementPage.module.scss'

const VALID_STATUSES = ['all', 'draft', 'active', 'archived']

export const ProductManagementPage = () => {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const currentUser = useAppSelector(selectCurrentUser)
  const isAdmin = currentUser?.role === 'admin'

  // 1. Phân tích tham số URL
  const rawStatus = searchParams.get('status') || 'all'
  const currentStatus = VALID_STATUSES.includes(rawStatus) ? rawStatus : 'all'

  const rawCategory = searchParams.get('category_id') || ''
  const currentCategoryId = rawCategory

  const rawBrand = searchParams.get('brand_id') || ''
  const currentBrandId = rawBrand

  const rawSearch = searchParams.get('search') || ''
  const currentSearch = rawSearch.trim()

  const rawPage = parseInt(searchParams.get('page') || '1', 10)
  const currentPage = !isNaN(rawPage) && rawPage >= 1 ? rawPage : 1

  // 2. State dữ liệu
  const [products, setProducts] = useState<AdminProductListItem[]>([])
  const [paginationMeta, setPaginationMeta] = useState<ApiPaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(
    () => (location.state as { successMessage?: string } | null)?.successMessage || null,
  )
  const [rowLoadingId, setRowLoadingId] = useState<number | null>(null)
  const [brokenImages, setBrokenImages] = useState<Record<number, boolean>>({})
  const [activeMenuKey, setActiveMenuKey] = useState<string | null>(null)

  // 1. Chỉ render một giao diện tại một thời điểm theo breakpoint 768px
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [prevIsDesktop, setPrevIsDesktop] = useState(isDesktop)
  if (prevIsDesktop !== isDesktop) {
    setPrevIsDesktop(isDesktop)
    setActiveMenuKey(null)
  }

  // Lookups hook
  const {
    lookups,
    isLoading: isLookupsLoading,
    error: lookupsError,
    retry: retryLookups,
  } = useAdminLookups()

  // 3. Dọn sạch location.state để F5 không hiện lại thông báo
  useEffect(() => {
    if ((location.state as { successMessage?: string } | null)?.successMessage) {
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  // 4. Ô tìm kiếm (Debounce 400ms)
  const [localSearch, setLocalSearch] = useState(currentSearch)
  const [prevSearch, setPrevSearch] = useState(currentSearch)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (prevSearch !== currentSearch) {
    setPrevSearch(currentSearch)
    setLocalSearch(currentSearch)
  }

  const handleSearchChange = (value: string) => {
    setActiveMenuKey(null)
    setLocalSearch(value)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      setIsLoading(true)
      const trimmed = value.trim()
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (trimmed) {
            next.set('search', trimmed)
          } else {
            next.delete('search')
          }
          next.delete('page')
          return next
        },
        { replace: true },
      )
    }, 400)
  }

  const handleClearSearch = () => {
    setActiveMenuKey(null)
    setLocalSearch('')
    setIsLoading(true)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('search')
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  // 5. Handlers thay đổi bộ lọc
  const handleStatusChange = (status: string) => {
    setActiveMenuKey(null)
    setIsLoading(true)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (status && status !== 'all') {
          next.set('status', status)
        } else {
          next.delete('status')
        }
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  const handleCategoryChange = (catId: string) => {
    setActiveMenuKey(null)
    setIsLoading(true)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (catId && catId !== 'all') {
          next.set('category_id', catId)
        } else {
          next.delete('category_id')
        }
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  const handleBrandChange = (brandId: string) => {
    setActiveMenuKey(null)
    setIsLoading(true)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (brandId && brandId !== 'all') {
          next.set('brand_id', brandId)
        } else {
          next.delete('brand_id')
        }
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  const handleResetFilters = () => {
    setActiveMenuKey(null)
    setLocalSearch('')
    setIsLoading(true)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const handlePageChange = (newPage: number) => {
    setActiveMenuKey(null)
    setIsLoading(true)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('page', String(newPage))
        return next
      },
      { replace: true },
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const hasActiveFilters = useMemo(() => {
    return (
      currentStatus !== 'all' ||
      Boolean(currentCategoryId) ||
      Boolean(currentBrandId) ||
      Boolean(currentSearch)
    )
  }, [currentStatus, currentCategoryId, currentBrandId, currentSearch])

  // 6. Tải danh sách sản phẩm với AbortController (Latest-wins)
  const fetchProducts = useCallback(() => {
    const controller = new AbortController()

    adminProductService
      .getAdminProducts(
        {
          status: currentStatus === 'all' ? undefined : currentStatus,
          category_id: currentCategoryId || undefined,
          brand_id: currentBrandId || undefined,
          search: currentSearch || undefined,
          page: currentPage,
          per_page: 15,
        },
        controller.signal,
      )
      .then(({ products: fetched, meta }) => {
        setProducts(fetched)
        setPaginationMeta(meta)
        setIsLoading(false)
        setErrorMessage(null)

        // Tự động lùi trang nếu page trên URL lớn hơn last_page
        if (meta.last_page >= 1 && currentPage > meta.last_page) {
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev)
              next.set('page', String(meta.last_page))
              return next
            },
            { replace: true },
          )
        }
      })
      .catch((err) => {
        if (axios.isCancel(err)) return
        setIsLoading(false)
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Không thể tải danh sách sản phẩm. Vui lòng thử lại.'
        setErrorMessage(msg)
      })

    return () => {
      controller.abort()
    }
  }, [currentStatus, currentCategoryId, currentBrandId, currentSearch, currentPage, setSearchParams])

  useEffect(() => {
    const cancel = fetchProducts()
    return cancel
  }, [fetchProducts])

  // 7. Modal xác nhận xóa sản phẩm
  const [productToDelete, setProductToDelete] = useState<AdminProductListItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleOpenDeleteModal = (product: AdminProductListItem) => {
    setProductToDelete(product)
    setDeleteError(null)
  }

  const handleCloseDeleteModal = () => {
    if (isDeleting) return
    setProductToDelete(null)
    setDeleteError(null)
  }

  const handleConfirmDelete = async () => {
    if (!productToDelete) return
    setIsDeleting(true)
    setDeleteError(null)

    try {
      const res = await adminProductService.deleteAdminProduct(productToDelete.id)
      setProductToDelete(null)
      setIsDeleting(false)
      setSuccessBanner(res.message || 'Xóa sản phẩm thành công.')

      // Nếu trang hiện tại chỉ có 1 dòng và đang ở trang > 1, lùi về trang trước
      if (products.length === 1 && currentPage > 1) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.set('page', String(currentPage - 1))
            return next
          },
          { replace: true },
        )
      } else {
        fetchProducts()
      }
    } catch (err) {
      setIsDeleting(false)
      const msg = getApiErrorMessage(err, 'Không thể xóa sản phẩm. Vui lòng thử lại.')
      setDeleteError(msg)
    }
  }

  // 8. Modal xác nhận đổi trạng thái nhanh
  const [statusChangeTarget, setStatusChangeTarget] = useState<{
    product: AdminProductListItem
    newStatus: ProductStatus
    title: string
    description: string
  } | null>(null)
  const [statusChangeError, setStatusChangeError] = useState<string | null>(null)

  const handleOpenQuickStatusModal = (product: AdminProductListItem) => {
    if (product.status === 'active') {
      setStatusChangeTarget({
        product,
        newStatus: 'archived',
        title: 'Lưu trữ sản phẩm đang hoạt động',
        description: 'Sản phẩm sẽ biến mất khỏi cửa hàng.',
      })
    } else if (product.status === 'draft') {
      setStatusChangeTarget({
        product,
        newStatus: 'archived',
        title: 'Lưu trữ sản phẩm',
        description: 'Chuyển sản phẩm này sang trạng thái Lưu trữ?',
      })
    } else if (product.status === 'archived') {
      setStatusChangeTarget({
        product,
        newStatus: 'draft',
        title: 'Chuyển sản phẩm về bản nháp',
        description: 'Chuyển sản phẩm này về trạng thái Bản nháp để tiếp tục chỉnh sửa?',
      })
    }
    setStatusChangeError(null)
  }

  const handleConfirmQuickStatusChange = async () => {
    if (!statusChangeTarget) return
    const { product, newStatus } = statusChangeTarget
    setRowLoadingId(product.id)
    setStatusChangeError(null)

    try {
      await adminProductService.updateAdminProduct(product.id, {
        status: newStatus,
      })
      setStatusChangeTarget(null)
      setRowLoadingId(null)
      setSuccessBanner('Cập nhật trạng thái sản phẩm thành công.')
      fetchProducts()
    } catch (err) {
      setRowLoadingId(null)
      const msg = getApiErrorMessage(err, 'Không thể cập nhật trạng thái. Vui lòng thử lại.')
      setStatusChangeError(msg)
    }
  }

  return (
    <div className={styles.productManagementPage}>
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Quản lý sản phẩm</h1>
          <p className={styles.subtitle}>
            {paginationMeta ? `Tổng số ${paginationMeta.total} sản phẩm` : 'Đang tải dữ liệu...'}
          </p>
        </div>

        {isAdmin && (
          <div className={styles.headerActions}>
            <Link to="/admin/products/new">
              <Button variant="primary" size="md">
                <Plus size={16} />
                <span>Thêm sản phẩm</span>
              </Button>
            </Link>
          </div>
        )}
      </header>

      {/* ALERT BANNERS */}
      {successBanner && (
        <div className={`${styles.alertBanner} ${styles.success}`} role="status">
          <div className={styles.alertContent}>
            <CheckCircle size={18} />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            className={styles.alertCloseBtn}
            onClick={() => setSuccessBanner(null)}
            aria-label="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className={`${styles.alertBanner} ${styles.error}`} role="alert">
          <div className={styles.alertContent}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            className={styles.alertCloseBtn}
            onClick={() => setErrorMessage(null)}
            aria-label="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* FILTERS CARD */}
      <div className={styles.filtersCard}>
        <div className={styles.filtersGrid}>
          {/* TÌM KIẾM */}
          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>Tìm kiếm sản phẩm</span>
            <div className={styles.searchGroup}>
              <Input
                placeholder="Tìm theo tên hoặc slug sản phẩm..."
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                leftIcon={<Search size={16} />}
                fullWidth
              />
              {localSearch && (
                <button
                  type="button"
                  className={styles.clearSearchBtn}
                  onClick={handleClearSearch}
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* TRẠNG THÁI */}
          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>Trạng thái</span>
            <Select
              value={currentStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              fullWidth
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'draft', label: 'Bản nháp' },
                { value: 'active', label: 'Đang hoạt động' },
                { value: 'archived', label: 'Lưu trữ' },
              ]}
            />
          </div>

          {/* DANH MỤC */}
          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>Danh mục</span>
            <Select
              value={currentCategoryId || 'all'}
              onChange={(e) => handleCategoryChange(e.target.value)}
              disabled={isLookupsLoading || Boolean(lookupsError)}
              fullWidth
              options={[
                { value: 'all', label: isLookupsLoading ? 'Đang nạp danh mục...' : 'Tất cả danh mục' },
                ...(lookups?.categories || []).map((cat) => ({
                  value: String(cat.id),
                  label: cat.parentId ? `— ${cat.name}` : cat.name,
                })),
              ]}
            />
          </div>

          {/* THƯƠNG HIỆU */}
          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>Thương hiệu</span>
            <Select
              value={currentBrandId || 'all'}
              onChange={(e) => handleBrandChange(e.target.value)}
              disabled={isLookupsLoading || Boolean(lookupsError)}
              fullWidth
              options={[
                { value: 'all', label: isLookupsLoading ? 'Đang nạp thương hiệu...' : 'Tất cả thương hiệu' },
                ...(lookups?.brands || []).map((b) => ({
                  value: String(b.id),
                  label: b.name,
                })),
              ]}
            />
          </div>

          {/* NÚT XÓA BỘ LỌC */}
          {hasActiveFilters && (
            <Button
              variant="secondary"
              size="md"
              className={styles.resetBtn}
              onClick={handleResetFilters}
            >
              <RotateCcw size={16} />
              <span>Xóa lọc</span>
            </Button>
          )}
        </div>

        {lookupsError && (
          <div className={styles.lookupsNotice}>
            <AlertCircle size={14} />
            <span>Không thể nạp danh mục/thương hiệu để lọc. </span>
            <button type="button" onClick={retryLookups}>
              Thử lại
            </button>
          </div>
        )}
      </div>

      {/* DATA TABLE */}
      <div className={styles.tableCard}>
        {isLoading ? (
          <div style={{ padding: 'var(--space-6)' }}>
            <Skeleton width="100%" height="40px" style={{ marginBottom: 'var(--space-3)' }} />
            <Skeleton width="100%" height="40px" style={{ marginBottom: 'var(--space-3)' }} />
            <Skeleton width="100%" height="40px" style={{ marginBottom: 'var(--space-3)' }} />
            <Skeleton width="100%" height="40px" />
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="Không tìm thấy sản phẩm"
            description={
              hasActiveFilters
                ? 'Không có sản phẩm nào phù hợp với các tiêu chí lọc hiện tại.'
                : 'Hệ thống chưa có sản phẩm nào. Hãy thêm sản phẩm đầu tiên!'
            }
            action={
              hasActiveFilters ? (
                <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                  Xóa toàn bộ bộ lọc
                </Button>
              ) : isAdmin ? (
                <Link to="/admin/products/new">
                  <Button variant="primary" size="sm">
                    <Plus size={16} />
                    <span>Thêm sản phẩm</span>
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : isDesktop ? (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.colImage}>Ảnh</th>
                  <th>Tên sản phẩm &amp; Slug</th>
                  <th>Danh mục</th>
                  <th>Thương hiệu</th>
                  <th>Giá bán</th>
                  <th>Trạng thái</th>
                  <th>Tồn kho</th>
                  <th>Biến thể</th>
                  <th>Cập nhật</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const badge = getProductStatusBadge(product.status)
                  const isRowLoading = rowLoadingId === product.id
                  const hasBrokenImg = brokenImages[product.id]

                  return (
                    <tr key={product.id}>
                      {/* Ảnh */}
                      <td className={styles.colImage}>
                        <div className={styles.thumbnailWrapper}>
                          {product.mainImage?.imageUrl && !hasBrokenImg ? (
                            <img
                              src={product.mainImage.imageUrl}
                              alt={product.mainImage.altText || product.name}
                              onError={() =>
                                setBrokenImages((prev) => ({ ...prev, [product.id]: true }))
                              }
                            />
                          ) : (
                            <Package size={22} className={styles.placeholderIcon} />
                          )}
                        </div>
                      </td>

                      {/* Tên & Slug */}
                      <td>
                        <div className={styles.productNameCell}>
                          <Link
                            to={`/admin/products/${product.id}/edit`}
                            state={{ from: location.pathname + location.search }}
                            className={styles.nameTitle}
                          >
                            <span>{product.name}</span>
                            {product.isFeatured && (
                              <Badge variant="luxury" size="sm">
                                Nổi bật
                              </Badge>
                            )}
                          </Link>
                          <span className={styles.slugText} title={product.slug}>
                            {product.slug}
                          </span>
                        </div>
                      </td>

                      {/* Danh mục */}
                      <td>{product.category?.name || '—'}</td>

                      {/* Thương hiệu */}
                      <td>{product.brand?.name || '—'}</td>

                      {/* Giá */}
                      <td>
                        <div className={styles.priceCell}>
                          <span className={styles.basePrice}>
                            {formatCurrency(product.basePrice)}
                          </span>
                          {product.compareAtPrice && product.compareAtPrice > product.basePrice && (
                            <span className={styles.comparePrice}>
                              {formatCurrency(product.compareAtPrice)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td>
                        <Badge variant={badge.variant} size="sm">
                          {badge.label}
                        </Badge>
                      </td>

                      {/* Tồn kho */}
                      <td>
                        <span
                          className={`${styles.stockCell} ${
                            product.totalStock === 0 ? styles.outOfStock : ''
                          }`}
                        >
                          {product.totalStock === 0 ? 'Hết hàng (0)' : product.totalStock}
                        </span>
                      </td>

                      {/* Số biến thể */}
                      <td>{product.variantsCount}</td>

                      {/* Ngày cập nhật */}
                      <td>{formatDateTime(product.updatedAt)}</td>

                      {/* Thao tác */}
                      <td className={styles.actionsCell}>
                        <div className={styles.actionBtns}>
                          {isAdmin ? (
                            <>
                              {/* Nút chính Sửa */}
                              <Link
                                to={`/admin/products/${product.id}/edit`}
                                state={{ from: location.pathname + location.search }}
                                className={`${styles.actionBtn} ${styles.editBtn}`}
                                title="Chỉnh sửa sản phẩm"
                                aria-label={`Chỉnh sửa sản phẩm ${product.name}`}
                              >
                                <Pencil size={16} />
                                <span className={styles.btnLabel}>Sửa</span>
                              </Link>

                              {/* Menu thao tác Kebab */}
                              <RowActionsMenu
                                items={[
                                  product.status === 'archived'
                                    ? {
                                        key: 'restore',
                                        label: 'Chuyển về bản nháp',
                                        icon: <RotateCcw size={16} />,
                                        onClick: () => handleOpenQuickStatusModal(product),
                                      }
                                    : {
                                        key: 'archive',
                                        label: 'Lưu trữ',
                                        icon: <Archive size={16} />,
                                        onClick: () => handleOpenQuickStatusModal(product),
                                      },
                                  {
                                    key: 'delete',
                                    label: 'Xóa sản phẩm',
                                    icon: <Trash2 size={16} />,
                                    danger: true,
                                    dividerBefore: true,
                                    onClick: () => handleOpenDeleteModal(product),
                                  },
                                ]}
                                triggerAriaLabel={`Thao tác khác cho sản phẩm ${product.name}`}
                                disabled={isRowLoading}
                                isLoading={isRowLoading}
                                isOpen={activeMenuKey === `table-${product.id}`}
                                onOpenChange={(open) =>
                                  setActiveMenuKey(open ? `table-${product.id}` : null)
                                }
                                buttonSize="md"
                              />
                            </>
                          ) : (
                            /* Operator chỉ xem */
                            <Link
                              to={`/admin/products/${product.id}/edit`}
                              state={{ from: location.pathname + location.search }}
                              className={`${styles.actionBtn} ${styles.editBtn}`}
                              title="Xem chi tiết sản phẩm"
                              aria-label={`Xem chi tiết sản phẩm ${product.name}`}
                            >
                              <Eye size={16} />
                              <span className={styles.btnLabel}>Chi tiết</span>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.cardsList}>
            {products.map((product) => {
              const badge = getProductStatusBadge(product.status)
              const isRowLoading = rowLoadingId === product.id
              const hasBrokenImg = brokenImages[product.id]

              return (
                <article key={`card-${product.id}`} className={styles.productCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardImageAndInfo}>
                      <div className={styles.thumbnailWrapper}>
                        {product.mainImage?.imageUrl && !hasBrokenImg ? (
                          <img
                            src={product.mainImage.imageUrl}
                            alt={product.mainImage.altText || product.name}
                            onError={() =>
                              setBrokenImages((prev) => ({ ...prev, [product.id]: true }))
                            }
                          />
                        ) : (
                          <Package size={22} className={styles.placeholderIcon} />
                        )}
                      </div>
                      <div className={styles.cardNameGroup}>
                        <Link
                          to={`/admin/products/${product.id}/edit`}
                          state={{ from: location.pathname + location.search }}
                          className={styles.nameTitle}
                        >
                          <span>{product.name}</span>
                          {product.isFeatured && (
                            <Badge variant="luxury" size="sm">
                              Nổi bật
                            </Badge>
                          )}
                        </Link>
                        <span className={styles.slugText}>{product.slug}</span>
                      </div>
                    </div>
                    <Badge variant={badge.variant} size="sm">
                      {badge.label}
                    </Badge>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>Danh mục:</span>
                      <span className={styles.cardValue}>{product.category?.name || '—'}</span>
                    </div>
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>Thương hiệu:</span>
                      <span className={styles.cardValue}>{product.brand?.name || '—'}</span>
                    </div>
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>Giá bán:</span>
                      <span className={styles.cardPrice}>
                        <span className={styles.basePrice}>
                          {formatCurrency(product.basePrice)}
                        </span>
                        {product.compareAtPrice && product.compareAtPrice > product.basePrice && (
                          <span className={styles.comparePrice}>
                            {formatCurrency(product.compareAtPrice)}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>Tồn kho / Biến thể:</span>
                      <span className={styles.cardValue}>
                        <span className={product.totalStock === 0 ? styles.outOfStock : ''}>
                          {product.totalStock === 0 ? 'Hết hàng (0)' : `${product.totalStock} sp`}
                        </span>
                        {' • '}
                        {product.variantsCount} biến thể
                      </span>
                    </div>
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>Cập nhật:</span>
                      <span className={styles.cardValue}>{formatDateTime(product.updatedAt)}</span>
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    {isAdmin ? (
                      <div className={styles.cardActionGroup}>
                        <Link
                          to={`/admin/products/${product.id}/edit`}
                          state={{ from: location.pathname + location.search }}
                          className={`${styles.cardActionBtn} ${styles.editBtn}`}
                          aria-label={`Chỉnh sửa sản phẩm ${product.name}`}
                        >
                          <Pencil size={18} />
                          <span>Sửa</span>
                        </Link>

                        <RowActionsMenu
                          items={[
                            product.status === 'archived'
                              ? {
                                  key: 'restore',
                                  label: 'Chuyển về bản nháp',
                                  icon: <RotateCcw size={18} />,
                                  onClick: () => handleOpenQuickStatusModal(product),
                                }
                              : {
                                  key: 'archive',
                                  label: 'Lưu trữ',
                                  icon: <Archive size={18} />,
                                  onClick: () => handleOpenQuickStatusModal(product),
                                },
                            {
                              key: 'delete',
                              label: 'Xóa sản phẩm',
                              icon: <Trash2 size={18} />,
                              danger: true,
                              dividerBefore: true,
                              onClick: () => handleOpenDeleteModal(product),
                            },
                          ]}
                          triggerAriaLabel={`Thao tác khác cho sản phẩm ${product.name}`}
                          disabled={isRowLoading}
                          isLoading={isRowLoading}
                          isOpen={activeMenuKey === `card-${product.id}`}
                          onOpenChange={(open) =>
                            setActiveMenuKey(open ? `card-${product.id}` : null)
                          }
                          buttonSize="lg"
                        />
                      </div>
                    ) : (
                      <Link
                        to={`/admin/products/${product.id}/edit`}
                        state={{ from: location.pathname + location.search }}
                        className={`${styles.cardActionBtn} ${styles.editBtn} ${styles.fullWidthBtn}`}
                        aria-label={`Xem chi tiết sản phẩm ${product.name}`}
                      >
                        <Eye size={18} />
                        <span>Xem chi tiết</span>
                      </Link>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* PHÂN TRANG */}
        {paginationMeta && paginationMeta.total > 0 && paginationMeta.last_page > 1 && (
          <div className={styles.paginationWrapper}>
            <Pagination
              page={currentPage}
              totalPages={paginationMeta.last_page}
              onChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* MODAL XÁC NHẬN XÓA SẢN PHẨM */}
      <Modal
        isOpen={Boolean(productToDelete)}
        onClose={handleCloseDeleteModal}
        title="Xác nhận xóa sản phẩm"
      >
        <div className={styles.modalBody}>
          <p>
            Bạn có chắc chắn muốn xóa sản phẩm <strong>&ldquo;{productToDelete?.name}&rdquo;</strong>?
          </p>
          <div className={`${styles.modalNotice} ${styles.warning}`}>
            <AlertTriangle size={16} />
            <span>Sản phẩm sẽ bị gỡ khỏi cửa hàng và danh sách quản trị.</span>
          </div>

          {deleteError && (
            <div className={`${styles.modalNotice} ${styles.error}`}>
              <AlertCircle size={16} />
              <span>{deleteError}</span>
            </div>
          )}

          <div className={styles.modalFooter}>
            <Button
              variant="secondary"
              size="md"
              onClick={handleCloseDeleteModal}
              disabled={isDeleting}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              className={styles.dangerBtn}
              size="md"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
              disabled={isDeleting}
            >
              Xác nhận xóa
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL XÁC NHẬN ĐỔI TRẠNG THÁI NHANH */}
      <Modal
        isOpen={Boolean(statusChangeTarget)}
        onClose={() => setStatusChangeTarget(null)}
        title={statusChangeTarget?.title || 'Đổi trạng thái sản phẩm'}
      >
        <div className={styles.modalBody}>
          <p>{statusChangeTarget?.description}</p>
          <p>
            Sản phẩm: <strong>{statusChangeTarget?.product.name}</strong>
          </p>

          {statusChangeError && (
            <div className={`${styles.modalNotice} ${styles.error}`}>
              <AlertCircle size={16} />
              <span>{statusChangeError}</span>
            </div>
          )}

          <div className={styles.modalFooter}>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setStatusChangeTarget(null)}
              disabled={rowLoadingId !== null}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirmQuickStatusChange}
              isLoading={rowLoadingId !== null}
              disabled={rowLoadingId !== null}
            >
              Xác nhận
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ProductManagementPage
