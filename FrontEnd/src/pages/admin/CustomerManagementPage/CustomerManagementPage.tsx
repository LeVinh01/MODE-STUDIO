import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Eye,
  AlertCircle,
  ShoppingBag,
  ExternalLink,
  CheckCircle,
  X,
  Lock,
  Unlock,
  AlertTriangle,
} from 'lucide-react'
import { useMediaQuery } from '@/hooks'
import { useAppSelector } from '@/store/hooks'
import { selectUserRole } from '@/store/slices/authSlice'
import { adminCustomerService } from '@/services/api/adminCustomerService'
import type {
  AdminCustomerDetail,
  AdminCustomerListItem,
} from '@/types/adminCustomer'
import type { ApiPaginationMeta } from '@/types/api'
import { getOrderStatusBadge, getPaymentStatusBadge } from '@/config/orderStatus'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import { Input, Button, Badge, Textarea } from '@/components/common'
import { Pagination } from '@/components/navigation'
import { Modal, EmptyState, Skeleton, Spinner } from '@/components/feedback'
import styles from './CustomerManagementPage.module.scss'

export const CustomerManagementPage = () => {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const userRole = useAppSelector(selectUserRole)
  const isAdmin = userRole === 'admin'

  // 1. Data states
  const [customers, setCustomers] = useState<AdminCustomerListItem[]>([])
  const [paginationMeta, setPaginationMeta] = useState<ApiPaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 2. Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // 3. Detail modal states
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [customerDetail, setCustomerDetail] = useState<AdminCustomerDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [retryTrigger, setRetryTrigger] = useState(0)

  // 4. Alert / Toast banner state
  const [alert, setAlert] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // 5. Lock / Unlock confirmation modal states
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [statusAction, setStatusAction] = useState<'locked' | 'active' | null>(null)
  const [statusReason, setStatusReason] = useState('')
  const [statusError, setStatusError] = useState<string | null>(null)
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false)

  // 6. Fetch danh sách khách hàng
  useEffect(() => {
    let ignore = false
    const controller = new AbortController()

    adminCustomerService
      .getCustomers(
        {
          search: activeSearch,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          page: currentPage,
          per_page: 15,
        },
        controller.signal,
      )
      .then((res) => {
        if (!ignore) {
          setCustomers(res.customers)
          setPaginationMeta(res.meta)
          setIsLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (ignore || controller.signal.aborted) return
        setIsLoading(false)
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Không thể tải danh sách khách hàng. Vui lòng thử lại.'
        setErrorMessage(msg)
      })

    return () => {
      ignore = true
      controller.abort()
    }
  }, [activeSearch, selectedStatus, currentPage, retryTrigger])

  const handleOpenDetail = (customerId: number) => {
    setSelectedCustomerId(customerId)
    setIsLoadingDetail(true)
    setDetailError(null)
    setCustomerDetail(null)

    adminCustomerService
      .getCustomerDetail(customerId)
      .then((data) => {
        setCustomerDetail(data)
      })
      .catch((err: unknown) => {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Không thể tải chi tiết khách hàng.'
        setDetailError(msg)
      })
      .finally(() => {
        setIsLoadingDetail(false)
      })
  }

  const handleCloseModal = () => {
    setSelectedCustomerId(null)
    setCustomerDetail(null)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)
    setActiveSearch(searchTerm.trim())
    setCurrentPage(1)
  }

  const handleStatusFilterChange = (status: string) => {
    setIsLoading(true)
    setErrorMessage(null)
    setSelectedStatus(status)
    setCurrentPage(1)
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setActiveSearch('')
    setSelectedStatus('all')
    setIsLoading(true)
    setErrorMessage(null)
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setIsLoading(true)
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRetry = () => {
    setIsLoading(true)
    setErrorMessage(null)
    setRetryTrigger((prev) => prev + 1)
  }

  // 7. Lock / Unlock handlers
  const handleOpenStatusModal = (action: 'locked' | 'active') => {
    setStatusAction(action)
    setStatusReason('')
    setStatusError(null)
    setStatusModalOpen(true)
  }

  const handleCloseStatusModal = () => {
    if (isSubmittingStatus) return
    setStatusModalOpen(false)
    setStatusAction(null)
    setStatusReason('')
    setStatusError(null)
  }

  const handleConfirmStatusChange = async () => {
    if (!customerDetail || !statusAction || isSubmittingStatus) return

    if (statusReason.trim().length > 255) {
      setStatusError('Lý do khoá không được vượt quá 255 ký tự.')
      return
    }

    setIsSubmittingStatus(true)
    setStatusError(null)

    try {
      const payload = {
        status: statusAction,
        reason: statusReason.trim() || undefined,
      }
      const res = await adminCustomerService.updateCustomerStatus(customerDetail.customer.id, payload)
      setIsSubmittingStatus(false)
      setStatusModalOpen(false)

      // Cập nhật customerDetail
      setCustomerDetail((prev) => {
        if (!prev) return null
        return {
          ...prev,
          customer: {
            ...prev.customer,
            status: res.customer.status,
            lockedAt: res.customer.locked_at ?? null,
            lockReason: res.customer.lock_reason ?? null,
          },
        }
      })

      // Cập nhật danh sách customers
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerDetail.customer.id
            ? { ...c, status: res.customer.status }
            : c,
        ),
      )

      setAlert({
        type: 'success',
        message:
          res.message ||
          (statusAction === 'locked'
            ? 'Khoá tài khoản thành công.'
            : 'Mở khoá tài khoản thành công.'),
      })
    } catch (err: unknown) {
      setIsSubmittingStatus(false)
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Không thể cập nhật trạng thái khách hàng. Vui lòng thử lại.'
      setStatusError(msg)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Quản Lý Khách Hàng</h1>
        <p className={styles.subtitle}>
          Hồ sơ khách hàng, thống kê số lượng đơn và tổng chi tiêu thực tế
        </p>
      </div>

      {/* THÔNG BÁO ALERT BANNER */}
      {alert && (
        <div className={`${styles.alertBanner} ${styles[alert.type]}`} role="alert">
          <div className={styles.alertContent}>
            {alert.type === 'success' ? (
              <CheckCircle size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span>{alert.message}</span>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setAlert(null)}
            aria-label="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* THANH TÌM KIẾM & BỘ LỌC TRẠNG THÁI */}
      <form onSubmit={handleSearchSubmit} className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Input
            placeholder="Tìm theo họ tên, email hoặc số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search size={18} />}
            fullWidth
          />
        </div>

        <select
          id="customer-status-filter"
          aria-label="Lọc theo trạng thái tài khoản"
          value={selectedStatus}
          onChange={(e) => handleStatusFilterChange(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="locked">Đã khoá</option>
        </select>

        <Button type="submit" variant="primary" size="md">
          Tìm kiếm
        </Button>
        {(activeSearch || selectedStatus !== 'all') && (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={handleClearFilters}
          >
            Xóa bộ lọc
          </Button>
        )}
      </form>

      {/* TRẠNG THÁI LỖI */}
      {errorMessage && !isLoading && (
        <EmptyState
          icon={<AlertCircle size={40} />}
          title="Không Thể Tải Dữ Liệu"
          description={errorMessage}
          action={
            <Button variant="secondary" size="sm" onClick={handleRetry}>
              Thử lại
            </Button>
          }
        />
      )}

      {/* SKELETON KHI ĐANG TẢI */}
      {isLoading && (
        <div className={styles.tableWrapper}>
          <div className={styles.skeletonTable}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={40} />
            ))}
          </div>
        </div>
      )}

      {/* KẾT QUẢ RỖNG */}
      {!isLoading && !errorMessage && customers.length === 0 && (
        <EmptyState
          icon={<ShoppingBag size={40} />}
          title="Không Tìm Thấy Khách Hàng"
          description={
            activeSearch || selectedStatus !== 'all'
              ? 'Không có khách hàng nào khớp với điều kiện tìm kiếm/bộ lọc.'
              : 'Hệ thống chưa ghi nhận tài khoản khách hàng nào.'
          }
          action={
            activeSearch || selectedStatus !== 'all' ? (
              <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                Xóa bộ lọc tìm kiếm
              </Button>
            ) : undefined
          }
        />
      )}

      {/* DANH SÁCH KHÁCH HÀNG: RENDER DUY NHẤT 1 LAYOUT THEO isDesktop */}
      {!isLoading && !errorMessage && customers.length > 0 && (
        <>
          {isDesktop ? (
            /* DESKTOP TABLE VIEW */
            <div className={styles.tableWrapper}>
              <table className={styles.customerTable}>
                <thead>
                  <tr>
                    <th>Khách hàng</th>
                    <th>Số điện thoại</th>
                    <th>Trạng thái</th>
                    <th>Ngày tham gia</th>
                    <th>Số đơn</th>
                    <th>Tổng chi tiêu</th>
                    <th>Đơn gần nhất</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className={styles.customerNameGroup}>
                          <span className={styles.customerName}>{c.fullName}</span>
                          <span className={styles.customerEmail}>{c.email}</span>
                        </div>
                      </td>
                      <td>{c.phone || '—'}</td>
                      <td>
                        <Badge
                          variant={c.status === 'locked' ? 'error' : 'success'}
                          size="sm"
                        >
                          {c.status === 'locked' ? 'Đã khoá' : 'Hoạt động'}
                        </Badge>
                      </td>
                      <td>{formatDateTime(c.createdAt)}</td>
                      <td>
                        <strong>{c.ordersCount}</strong> đơn
                      </td>
                      <td className={styles.spentAmount}>
                        {formatCurrency(c.totalSpent)}
                      </td>
                      <td>{c.lastOrderAt ? formatDateTime(c.lastOrderAt) : '—'}</td>
                      <td>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetail(c.id)}
                        >
                          <Eye size={16} />
                          <span>Chi tiết</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* MOBILE CARD VIEW */
            <div className={styles.cardList}>
              {customers.map((c) => (
                <article key={c.id} className={styles.customerCard}>
                  <div className={styles.cardTop}>
                    <div className={styles.customerNameGroup}>
                      <span className={styles.customerName}>{c.fullName}</span>
                      <span className={styles.customerEmail}>{c.email}</span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenDetail(c.id)}
                    >
                      <Eye size={14} />
                      <span>Xem</span>
                    </Button>
                  </div>

                  <div className={styles.cardRow}>
                    <span className={styles.cardLabel}>Trạng thái:</span>
                    <span className={styles.cardValue}>
                      <Badge
                        variant={c.status === 'locked' ? 'error' : 'success'}
                        size="sm"
                      >
                        {c.status === 'locked' ? 'Đã khoá' : 'Hoạt động'}
                      </Badge>
                    </span>
                  </div>

                  <div className={styles.cardRow}>
                    <span className={styles.cardLabel}>Số điện thoại:</span>
                    <span className={styles.cardValue}>{c.phone || '—'}</span>
                  </div>

                  <div className={styles.cardRow}>
                    <span className={styles.cardLabel}>Số đơn hàng:</span>
                    <span className={styles.cardValue}>
                      <strong>{c.ordersCount}</strong> đơn
                    </span>
                  </div>

                  <div className={styles.cardRow}>
                    <span className={styles.cardLabel}>Tổng chi tiêu:</span>
                    <span className={styles.spentAmount}>
                      {formatCurrency(c.totalSpent)}
                    </span>
                  </div>

                  <div className={styles.cardRow}>
                    <span className={styles.cardLabel}>Đơn gần nhất:</span>
                    <span className={styles.cardValue}>
                      {c.lastOrderAt ? formatDateTime(c.lastOrderAt) : '—'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* PHÂN TRANG */}
          {paginationMeta && paginationMeta.last_page > 1 && (
            <div className={styles.paginationWrapper}>
              <Pagination
                page={currentPage}
                totalPages={paginationMeta.last_page}
                onChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}

      {/* MODAL CHI TIẾT KHÁCH HÀNG */}
      <Modal
        isOpen={Boolean(selectedCustomerId)}
        onClose={handleCloseModal}
        title={customerDetail?.customer.fullName || 'Hồ Sơ Khách Hàng'}
        size="lg"
      >
        {isLoadingDetail && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
            <Spinner size="lg" />
          </div>
        )}

        {detailError && !isLoadingDetail && (
          <div style={{ color: 'var(--color-error)', padding: 'var(--space-4)' }}>
            <AlertCircle size={20} />
            <span>{detailError}</span>
          </div>
        )}

        {customerDetail && !isLoadingDetail && (
          <div className={styles.modalContent}>
            {/* THÔNG TIN HỒ SƠ */}
            <div className={styles.profileSection}>
              <div className={styles.profileHeader}>
                <h3 className={styles.profileTitle}>Thông Tin Tài Khoản</h3>
                {isAdmin && (
                  customerDetail.customer.status === 'locked' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenStatusModal('active')}
                    >
                      <Unlock size={14} />
                      <span>Mở khoá tài khoản</span>
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenStatusModal('locked')}
                    >
                      <Lock size={14} />
                      <span>Khoá tài khoản</span>
                    </Button>
                  )
                )}
              </div>

              <div className={styles.profileRow}>
                <span className={styles.profileLabel}>Trạng thái:</span>
                <span className={styles.profileValue}>
                  <Badge
                    variant={customerDetail.customer.status === 'locked' ? 'error' : 'success'}
                    size="sm"
                  >
                    {customerDetail.customer.status === 'locked' ? 'Đã khoá' : 'Hoạt động'}
                  </Badge>
                </span>
              </div>
              {customerDetail.customer.status === 'locked' && customerDetail.customer.lockedAt && (
                <div className={styles.profileRow}>
                  <span className={styles.profileLabel}>Thời điểm khoá:</span>
                  <span className={styles.profileValue}>
                    {formatDateTime(customerDetail.customer.lockedAt)}
                  </span>
                </div>
              )}
              {customerDetail.customer.status === 'locked' && customerDetail.customer.lockReason && (
                <div className={styles.profileRow}>
                  <span className={styles.profileLabel}>Lý do khoá:</span>
                  <div className={styles.lockReasonBox}>
                    {customerDetail.customer.lockReason}
                  </div>
                </div>
              )}
              <div className={styles.profileRow}>
                <span className={styles.profileLabel}>Họ và tên:</span>
                <span className={styles.profileValue}>{customerDetail.customer.fullName}</span>
              </div>
              <div className={styles.profileRow}>
                <span className={styles.profileLabel}>Email:</span>
                <span className={styles.profileValue}>{customerDetail.customer.email}</span>
              </div>
              <div className={styles.profileRow}>
                <span className={styles.profileLabel}>Số điện thoại:</span>
                <span className={styles.profileValue}>{customerDetail.customer.phone || 'Chưa cập nhật'}</span>
              </div>
              <div className={styles.profileRow}>
                <span className={styles.profileLabel}>Ngày đăng ký:</span>
                <span className={styles.profileValue}>{formatDateTime(customerDetail.customer.createdAt)}</span>
              </div>
            </div>

            {/* THỐNG KÊ CHI TIÊU & ĐƠN HÀNG */}
            <div className={styles.detailStatsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Tổng chi tiêu (Đã giao)</span>
                <span className={styles.statValue}>
                  {formatCurrency(customerDetail.stats.totalSpent)}
                </span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Tổng đơn hàng</span>
                <span className={styles.statValue}>
                  {customerDetail.stats.ordersCount} đơn
                </span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Đơn đã giao thành công</span>
                <span className={styles.statValue}>
                  {customerDetail.stats.deliveredOrdersCount} đơn
                </span>
              </div>
            </div>

            {/* 10 ĐƠN HÀNG GẦN ĐÂY NHẤT */}
            <div>
              <h3 className={styles.recentOrdersTitle}>10 Đơn Hàng Gần Nhất</h3>
              {customerDetail.recentOrders.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  Khách hàng chưa có đơn hàng nào.
                </p>
              ) : (
                <div className={styles.recentOrdersTableWrapper}>
                  <table className={styles.recentOrdersTable}>
                    <thead>
                      <tr>
                        <th>Mã đơn</th>
                        <th>Ngày đặt</th>
                        <th>Trạng thái</th>
                        <th>Thanh toán</th>
                        <th>Vận chuyển</th>
                        <th>Tổng tiền</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerDetail.recentOrders.map((o) => {
                        const statusBadge = getOrderStatusBadge(o.status)
                        const paymentBadge = getPaymentStatusBadge(o.paymentStatus)

                        return (
                          <tr key={o.id}>
                            <td>
                              <Link
                                to={`/admin/orders/${o.orderCode}`}
                                className={styles.orderLink}
                              >
                                {o.orderCode}
                              </Link>
                            </td>
                            <td>{formatDateTime(o.createdAt)}</td>
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
                              {o.carrier ? (
                                <span>
                                  <strong>{o.carrier}</strong>
                                  {o.trackingCode && ` (${o.trackingCode})`}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td>
                              <strong>{formatCurrency(o.totalAmount)}</strong>
                            </td>
                            <td>
                              <Link
                                to={`/admin/orders/${o.orderCode}`}
                                className={styles.orderLink}
                              >
                                <ExternalLink size={14} />
                              </Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL XÁC NHẬN KHOÁ / MỞ KHOÁ TÀI KHOẢN KHÁCH HÀNG */}
      <Modal
        isOpen={statusModalOpen}
        onClose={handleCloseStatusModal}
        title={statusAction === 'locked' ? 'Khoá Tài Khoản Khách Hàng' : 'Mở Khoá Tài Khoản Khách Hàng'}
        size="md"
        footer={
          <div className={styles.modalFooterActions}>
            <Button
              variant="secondary"
              size="md"
              onClick={handleCloseStatusModal}
              disabled={isSubmittingStatus}
            >
              Hủy bỏ
            </Button>
            <Button
              variant={statusAction === 'locked' ? 'primary' : 'primary'}
              size="md"
              onClick={handleConfirmStatusChange}
              isLoading={isSubmittingStatus}
              disabled={isSubmittingStatus}
            >
              {statusAction === 'locked' ? 'Xác nhận khoá tài khoản' : 'Xác nhận mở khoá'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {statusAction === 'locked' ? (
            <>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-black)', margin: 0 }}>
                Bạn có chắc chắn muốn khoá tài khoản của khách hàng{' '}
                <strong>{customerDetail?.customer.fullName}</strong> ({customerDetail?.customer.email}) không?
              </p>

              <div className={styles.warningBox}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  Lưu ý: Khách hàng sẽ bị thu hồi phiên đăng nhập và đăng xuất khỏi tất cả thiết bị ngay lập tức. Khách hàng sẽ không thể đăng nhập hoặc thanh toán cho đến khi được mở khoá.
                </span>
              </div>

              <Textarea
                id="lock-reason-input"
                label="Lý do khoá (tùy chọn)"
                placeholder="Nhập lý do khoá tài khoản khách hàng..."
                value={statusReason}
                onChange={(e) => {
                  setStatusReason(e.target.value)
                  if (statusError) setStatusError(null)
                }}
                helperText="Tối đa 255 ký tự"
                disabled={isSubmittingStatus}
                maxLength={255}
                rows={3}
                fullWidth
              />
            </>
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-black)', margin: 0 }}>
              Xác nhận mở khoá tài khoản cho khách hàng{' '}
              <strong>{customerDetail?.customer.fullName}</strong> ({customerDetail?.customer.email})? Sau khi mở khoá, khách hàng sẽ có thể đăng nhập và tiếp tục mua sắm lại bình thường.
            </p>
          )}

          {statusError && (
            <div className={`${styles.alertBanner} ${styles.error}`} role="alert" style={{ marginTop: 'var(--space-2)' }}>
              <div className={styles.alertContent}>
                <AlertCircle size={16} />
                <span>{statusError}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default CustomerManagementPage
