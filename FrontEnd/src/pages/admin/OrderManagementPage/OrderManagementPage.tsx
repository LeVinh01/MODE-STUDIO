import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  Search,
  X,
  RotateCcw,
  AlertCircle,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react'
import axios from 'axios'
import { adminOrderService } from '@/services/api/adminOrderService'
import type { AdminOrderListItem } from '@/types/adminOrder'
import type { ApiPaginationMeta } from '@/types/api'
import {
  ORDER_STATUS_CONFIG,
  PAYMENT_STATUS_CONFIG,
  getOrderStatusBadge,
  getPaymentStatusBadge,
} from '@/config/orderStatus'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import { Button, Badge } from '@/components/common'
import { Pagination } from '@/components/navigation/Pagination'
import { EmptyState, Skeleton } from '@/components/feedback'
import styles from './OrderManagementPage.module.scss'

const VALID_STATUSES = ['all', 'pending', 'confirmed', 'shipping', 'delivered', 'cancelled']
const VALID_PAYMENT_STATUSES = ['all', 'unpaid', 'paid', 'failed', 'refunded']
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export const OrderManagementPage = () => {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  // 1. Phân tích và chuẩn hóa tham số URL
  const rawStatus = searchParams.get('status') || 'all'
  const currentStatus = VALID_STATUSES.includes(rawStatus) ? rawStatus : 'all'

  const rawPaymentStatus = searchParams.get('payment_status') || 'all'
  const currentPaymentStatus = VALID_PAYMENT_STATUSES.includes(rawPaymentStatus)
    ? rawPaymentStatus
    : 'all'

  const rawFrom = searchParams.get('from') || ''
  const validFrom = DATE_REGEX.test(rawFrom) ? rawFrom : ''

  const rawTo = searchParams.get('to') || ''
  let validTo = DATE_REGEX.test(rawTo) ? rawTo : ''

  // Nếu cả from và to đều có, to phải >= from; nếu không hợp lệ thì bỏ qua to
  if (validFrom && validTo && validTo < validFrom) {
    validTo = ''
  }

  const rawSearch = searchParams.get('search') || ''
  const currentSearch = rawSearch.trim()

  const rawPage = parseInt(searchParams.get('page') || '1', 10)
  const currentPage = !isNaN(rawPage) && rawPage >= 1 ? rawPage : 1

  // 2. State dữ liệu
  const [orders, setOrders] = useState<AdminOrderListItem[]>([])
  const [paginationMeta, setPaginationMeta] = useState<ApiPaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isForbidden, setIsForbidden] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryCounter, setReloadCounter] = useState(0)

  // 3. State ô tìm kiếm (hỗ trợ debounce 400ms)
  const [localSearch, setLocalSearch] = useState(currentSearch)
  const [prevSearch, setPrevSearch] = useState(currentSearch)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Đồng bộ localSearch khi URL thay đổi mà không gọi setState trong effect
  if (prevSearch !== currentSearch) {
    setPrevSearch(currentSearch)
    setLocalSearch(currentSearch)
  }

  // Cập nhật URL khi người dùng gõ tìm kiếm với debounce 400ms
  const handleSearchChange = (value: string) => {
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
          next.delete('page') // Reset về trang 1 khi đổi từ khóa
          return next
        },
        { replace: true },
      )
    }, 400)
  }

  const handleClearSearch = () => {
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

  // 4. Xử lý thay đổi các bộ lọc khác
  const handleStatusChange = (status: string) => {
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

  const handlePaymentStatusChange = (paymentStatus: string) => {
    setIsLoading(true)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (paymentStatus && paymentStatus !== 'all') {
          next.set('payment_status', paymentStatus)
        } else {
          next.delete('payment_status')
        }
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  const handleFromDateChange = (from: string) => {
    setIsLoading(true)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (from) {
          next.set('from', from)
        } else {
          next.delete('from')
        }
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  const handleToDateChange = (to: string) => {
    setIsLoading(true)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (to) {
          next.set('to', to)
        } else {
          next.delete('to')
        }
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  const handleResetFilters = () => {
    setLocalSearch('')
    setIsLoading(true)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const handlePageChange = (newPage: number) => {
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

  // Kiểm tra xem có bộ lọc nào đang được kích hoạt không
  const hasActiveFilters = useMemo(() => {
    return (
      currentStatus !== 'all' ||
      currentPaymentStatus !== 'all' ||
      Boolean(validFrom) ||
      Boolean(validTo) ||
      Boolean(currentSearch)
    )
  }, [currentStatus, currentPaymentStatus, validFrom, validTo, currentSearch])

  // 5. Nạp danh sách đơn hàng với AbortController (chống chồng chéo request)
  useEffect(() => {
    const controller = new AbortController()

    adminOrderService
      .getAdminOrders(
        {
          status: currentStatus === 'all' ? undefined : currentStatus,
          payment_status: currentPaymentStatus === 'all' ? undefined : currentPaymentStatus,
          from: validFrom || undefined,
          to: validTo || undefined,
          search: currentSearch || undefined,
          page: currentPage,
          per_page: 10,
        },
        controller.signal,
      )
      .then(({ orders: fetchedOrders, meta }) => {
        setOrders(fetchedOrders)
        setPaginationMeta(meta)
        setIsLoading(false)
        setErrorMessage(null)
        setIsForbidden(false)

        // Tự động chuyển về trang cuối nếu URL page > last_page
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
      .catch((err: unknown) => {
        if (axios.isCancel(err) || (err as { name?: string })?.name === 'CanceledError') {
          return // Bỏ qua lỗi hủy request
        }

        setIsLoading(false)

        const statusCode = (err as { response?: { status?: number } })?.response?.status
        if (statusCode === 403) {
          setIsForbidden(true)
          setErrorMessage('Bạn không có quyền truy cập khu vực quản trị đơn hàng.')
          return
        }

        const serverMsg =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.'
        setErrorMessage(serverMsg)
      })

    return () => {
      controller.abort()
    }
  }, [
    currentStatus,
    currentPaymentStatus,
    validFrom,
    validTo,
    currentSearch,
    currentPage,
    retryCounter,
    setSearchParams,
  ])

  // Trạng thái 403 Forbidden
  if (isForbidden) {
    return (
      <section className={styles.pageContainer}>
        <div className={styles.errorCard} role="alert">
          <ShieldAlert size={48} className={styles.errorIcon} />
          <h2 className={styles.errorTitle}>Từ Chối Quyền Truy Cập</h2>
          <p className={styles.errorMessage}>{errorMessage}</p>
          <Link to="/" className={styles.viewDetailBtn}>
            Về Trang Chủ
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.pageContainer} aria-labelledby="order-mgmt-title">
      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1 id="order-mgmt-title" className={styles.pageTitle}>
            Quản Lý Đơn Hàng
          </h1>
          <p className={styles.pageSubtitle}>
            Theo dõi, xử lý và cập nhật tiến độ giao nhận cho các đơn hàng tại MODE STUDIO.
          </p>
        </div>

        {paginationMeta && !isLoading && (
          <div className={styles.totalBadge}>
            Tổng: <strong>{paginationMeta.total}</strong> đơn hàng
          </div>
        )}
      </header>

      {/* THANH BỘ LỌC & TÌM KIẾM */}
      <div className={styles.filterCard}>
        <div className={styles.filterGrid}>
          {/* Ô Tìm Kiếm */}
          <div className={styles.filterField}>
            <label htmlFor="search-input" className={styles.filterLabel}>
              Tìm kiếm đơn hàng
            </label>
            <div className={styles.searchInputWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input
                id="search-input"
                type="text"
                placeholder="Mã đơn, tên hoặc số điện thoại..."
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={`${styles.filterInput} ${styles.searchInput}`}
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className={styles.clearSearchBtn}
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Lọc Trạng Thái Đơn */}
          <div className={styles.filterField}>
            <label htmlFor="status-select" className={styles.filterLabel}>
              Trạng thái đơn
            </label>
            <select
              id="status-select"
              value={currentStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(ORDER_STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Trạng Thái Thanh Toán */}
          <div className={styles.filterField}>
            <label htmlFor="payment-status-select" className={styles.filterLabel}>
              Thanh toán
            </label>
            <select
              id="payment-status-select"
              value={currentPaymentStatus}
              onChange={(e) => handlePaymentStatusChange(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">Tất cả thanh toán</option>
              {Object.entries(PAYMENT_STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ngày Bắt Đầu (From) */}
          <div className={styles.filterField}>
            <label htmlFor="from-date" className={styles.filterLabel}>
              Từ ngày
            </label>
            <input
              id="from-date"
              type="date"
              value={validFrom}
              onChange={(e) => handleFromDateChange(e.target.value)}
              className={styles.filterInput}
            />
          </div>

          {/* Ngày Kết Thúc (To) */}
          <div className={styles.filterField}>
            <label htmlFor="to-date" className={styles.filterLabel}>
              Đến ngày
            </label>
            <input
              id="to-date"
              type="date"
              min={validFrom || undefined}
              value={validTo}
              onChange={(e) => handleToDateChange(e.target.value)}
              className={styles.filterInput}
            />
          </div>

          {/* Nút Xóa Lọc */}
          {hasActiveFilters && (
            <div className={styles.resetBtnWrapper}>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResetFilters}
                className={styles.resetBtn}
                leftIcon={<RotateCcw size={14} />}
              >
                Xóa bộ lọc
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* LỖI TẢI DỮ LIỆU */}
      {errorMessage && !isLoading && (
        <div className={styles.errorCard} role="alert">
          <AlertCircle size={36} className={styles.errorIcon} />
          <h2 className={styles.errorTitle}>Đã Xảy Ra Lỗi</h2>
          <p className={styles.errorMessage}>{errorMessage}</p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setIsLoading(true)
              setReloadCounter((c) => c + 1)
            }}
          >
            Thử lại
          </Button>
        </div>
      )}

      {/* SKELETON KHI ĐANG TẢI */}
      {isLoading && (
        <div className={styles.tableWrapper}>
          <div className={styles.skeletonTable}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className={styles.skeletonRow}>
                <Skeleton width="15%" height={24} />
                <Skeleton width="25%" height={24} />
                <Skeleton width="15%" height={24} />
                <Skeleton width="15%" height={24} />
                <Skeleton width="15%" height={24} />
                <Skeleton width="10%" height={24} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KẾT QUẢ RỖNG */}
      {!isLoading && !errorMessage && orders.length === 0 && (
        <EmptyState
          title="Không tìm thấy đơn hàng"
          description={
            hasActiveFilters
              ? 'Không có đơn hàng nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại.'
              : 'Hệ thống chưa có đơn hàng nào được ghi nhận.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                Xóa toàn bộ bộ lọc
              </Button>
            ) : undefined
          }
        />
      )}

      {/* DANH SÁCH ĐƠN HÀNG TRÊN DESKTOP (TABLE) */}
      {!isLoading && !errorMessage && orders.length > 0 && (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.orderTable}>
              <thead>
                <tr>
                  <th scope="col">Mã Đơn Hàng</th>
                  <th scope="col">Khách Hàng</th>
                  <th scope="col">Ngày Đặt</th>
                  <th scope="col">Số Dòng</th>
                  <th scope="col">Tổng Tiền</th>
                  <th scope="col">Trạng Thái Đơn</th>
                  <th scope="col">Thanh Toán</th>
                  <th scope="col">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const statusBadge = getOrderStatusBadge(order.status)
                  const paymentBadge = getPaymentStatusBadge(order.paymentStatus)

                  return (
                    <tr key={order.orderCode}>
                      <td>
                        <Link
                          to={`/admin/orders/${order.orderCode}`}
                          state={{ from: location.pathname + location.search }}
                          className={styles.orderCodeLink}
                        >
                          {order.orderCode}
                        </Link>
                      </td>
                      <td>
                        <div className={styles.customerInfo}>
                          <span className={styles.customerName}>
                            {order.customer?.fullName || order.recipientName}
                          </span>
                          <span className={styles.customerMeta}>
                            {order.customer?.email || order.recipientPhone}
                          </span>
                        </div>
                      </td>
                      <td>{formatDateTime(order.createdAt)}</td>
                      <td>{order.itemsCount} dòng</td>
                      <td>
                        <span className={styles.orderTotal}>
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </td>
                      <td>
                        <Badge variant={statusBadge.variant} size="sm">
                          {statusBadge.label}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={paymentBadge.variant} size="sm">
                          {paymentBadge.label}
                        </Badge>
                      </td>
                      <td>
                        <Link
                          to={`/admin/orders/${order.orderCode}`}
                          state={{ from: location.pathname + location.search }}
                          className={styles.viewDetailBtn}
                          aria-label={`Xem chi tiết đơn hàng ${order.orderCode}`}
                        >
                          Chi tiết
                          <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* DANH SÁCH ĐƠN HÀNG TRÊN MOBILE (CARDS) */}
          <div className={styles.cardsList}>
            {orders.map((order) => {
              const statusBadge = getOrderStatusBadge(order.status)
              const paymentBadge = getPaymentStatusBadge(order.paymentStatus)

              return (
                <article key={order.orderCode} className={styles.orderCard}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardCodeGroup}>
                      <Link
                        to={`/admin/orders/${order.orderCode}`}
                        state={{ from: location.pathname + location.search }}
                        className={styles.orderCodeLink}
                      >
                        {order.orderCode}
                      </Link>
                      <span className={styles.cardDate}>
                        {formatDateTime(order.createdAt)}
                      </span>
                    </div>

                    <div className={styles.cardBadges}>
                      <Badge variant={statusBadge.variant} size="sm">
                        {statusBadge.label}
                      </Badge>
                      <Badge variant={paymentBadge.variant} size="sm">
                        {paymentBadge.label}
                      </Badge>
                    </div>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>Khách hàng:</span>
                      <span className={styles.cardValue}>
                        {order.customer?.fullName || order.recipientName}
                      </span>
                    </div>
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>Số dòng sản phẩm:</span>
                      <span className={styles.cardValue}>{order.itemsCount} dòng</span>
                    </div>
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>Tổng thanh toán:</span>
                      <span className={styles.orderTotal}>
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <Link
                      to={`/admin/orders/${order.orderCode}`}
                      state={{ from: location.pathname + location.search }}
                      className={styles.viewDetailBtn}
                    >
                      Xem chi tiết đơn
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>

          {/* PHÂN TRANG */}
          {paginationMeta && paginationMeta.last_page > 1 && (
            <div className={styles.paginationWrapper}>
              <Pagination
                page={paginationMeta.current_page}
                totalPages={paginationMeta.last_page}
                onChange={handlePageChange}
                ariaLabel="Phân trang danh sách đơn hàng"
              />
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default OrderManagementPage
