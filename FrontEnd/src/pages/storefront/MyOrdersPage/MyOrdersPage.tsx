import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom'
import { ShoppingBag, AlertCircle, ChevronRight } from 'lucide-react'
import axios from 'axios'
import { orderService } from '@/services/api/orderService'
import type { Order, OrderStatus } from '@/types/order'
import type { ApiPaginationMeta } from '@/types/api'
import {
  ORDER_STATUS_CONFIG,
  ORDER_FILTER_TABS,
} from '@/config/orderStatus'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import { Button, Badge, Textarea } from '@/components/common'
import { Breadcrumbs } from '@/components/navigation'
import { Pagination } from '@/components/navigation/Pagination'
import { EmptyState, Modal, Skeleton } from '@/components/feedback'
import styles from './MyOrdersPage.module.scss'

export const MyOrdersPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  // Đồng bộ trạng thái lọc và trang với URL search params
  const rawStatus = searchParams.get('status') || 'all'
  const validTab = ORDER_FILTER_TABS.find((t) => t.id === rawStatus)
  const currentStatus = validTab ? validTab.id : 'all'

  const rawPage = parseInt(searchParams.get('page') || '1', 10)
  const currentPage = !isNaN(rawPage) && rawPage >= 1 ? rawPage : 1

  // State danh sách đơn hàng
  const [orders, setOrders] = useState<Order[]>([])
  const [paginationMeta, setPaginationMeta] = useState<ApiPaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [reloadCounter, setReloadCounter] = useState(0)

  // State Modal Hủy đơn
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const cancelLockRef = useRef(false)

  // ĐIỀU CHỈNH 3: Chống chồng request khi chuyển tab hoặc trang nhanh bằng AbortController
  useEffect(() => {
    const controller = new AbortController()

    const apiStatus = currentStatus === 'all' ? undefined : currentStatus
    orderService
      .getOrders(
        {
          status: apiStatus,
          page: currentPage,
          per_page: 10,
        },
        controller.signal,
      )
      .then(({ orders: fetchedOrders, meta }) => {
        setOrders(fetchedOrders)
        setPaginationMeta(meta)
        setIsLoading(false)

        // ĐIỀU CHỈNH 2: Nếu page trên URL lớn hơn meta.last_page (và last_page >= 1) thì tự replace về trang cuối
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
        // ĐIỀU CHỈNH 3: Bỏ qua lỗi do AbortController hủy request, không hiện lỗi
        if (axios.isCancel(err) || (err as { name?: string })?.name === 'CanceledError') {
          return
        }
        setIsLoading(false)
        const errorMsg =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Không thể nạp danh sách đơn hàng. Vui lòng thử lại sau.'
        setErrorMessage(errorMsg)
      })

    return () => {
      controller.abort()
    }
  }, [currentStatus, currentPage, reloadCounter, setSearchParams])

  // Xử lý chuyển tab trạng thái
  const handleTabChange = (tabId: string) => {
    if (tabId === currentStatus) return
    setIsLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (tabId === 'all') {
          next.delete('status')
        } else {
          next.set('status', tabId)
        }
        next.set('page', '1') // Reset về trang 1 khi đổi bộ lọc
        return next
      },
      { replace: false },
    )
  }

  // Xử lý chuyển trang
  const handlePageChange = (newPage: number) => {
    if (newPage === currentPage) return
    setIsLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('page', String(newPage))
        return next
      },
      { replace: false },
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Tải lại dữ liệu
  const handleRetry = () => {
    setIsLoading(true)
    setErrorMessage(null)
    setReloadCounter((c) => c + 1)
  }

  // Mở modal xác nhận hủy đơn
  const handleOpenCancelModal = (order: Order) => {
    setCancellingOrder(order)
    setCancelReason('')
    setCancelError(null)
    setCancelModalOpen(true)
  }

  // Thực hiện hủy đơn hàng
  const handleConfirmCancel = async () => {
    if (!cancellingOrder) return
    if (cancelLockRef.current || isCancelling) return

    if (cancelReason.trim().length > 500) {
      setCancelError('Lý do hủy đơn không được vượt quá 500 ký tự.')
      return
    }

    cancelLockRef.current = true
    setIsCancelling(true)
    setCancelError(null)

    // ĐIỀU CHỈNH 5: Ô lý do trống thì không gửi field reason hoặc gửi null
    const payload = cancelReason.trim() ? { reason: cancelReason.trim() } : {}

    try {
      await orderService.cancelOrder(cancellingOrder.orderCode, payload)
      cancelLockRef.current = false
      setIsCancelling(false)
      setCancelModalOpen(false)

      setSuccessMessage('Đã hủy đơn hàng, số lượng hàng đã được hoàn lại kho.')

      // ĐIỀU CHỈNH 1: Tải lại trang danh sách hiện tại từ server sau khi hủy thành công
      setIsLoading(true)
      setReloadCounter((c) => c + 1)
    } catch (err: unknown) {
      cancelLockRef.current = false
      setIsCancelling(false)

      const status = (err as { response?: { status?: number } })?.response?.status
      const msg = (err as { response?: { data?: { message?: string } } })?.response
        ?.data?.message

      // ĐIỀU CHỈNH 1: Lỗi 422 do đơn đã đổi trạng thái (cửa hàng vừa duyệt)
      if (status === 422) {
        setCancelError(
          msg ||
            'Không thể hủy đơn: Đơn hàng đã đổi trạng thái hoặc không còn ở trạng thái chờ xác nhận.',
        )
        // Tải lại để cập nhật danh sách
        setIsLoading(true)
        setReloadCounter((c) => c + 1)
        return
      }

      setCancelError(msg || 'Không thể hủy đơn hàng vào lúc này. Vui lòng thử lại.')
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* BREADCRUMBS */}
        <div className={styles.breadcrumbsWrapper}>
          <Breadcrumbs
            items={[
              { label: 'Trang chủ', to: '/' },
              { label: 'Đơn hàng của tôi' },
            ]}
          />
        </div>

        {/* PAGE HEADER */}
        <header className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Đơn Hàng Của Tôi</h1>
          <p className={styles.pageSubtitle}>
            Theo dõi chi tiết tiến trình vận chuyển và lịch sử đơn hàng của quý khách tại MODE STUDIO.
          </p>
        </header>

        {/* THÔNG BÁO THÀNH CÔNG / THÔNG BÁO LỖI CHUNG */}
        {successMessage && (
          <div
            className={`${styles.noticeBanner} ${styles.success}`}
            role="alert"
            aria-live="polite"
          >
            <span>{successMessage}</span>
            <button
              type="button"
              className={styles.noticeCloseBtn}
              onClick={() => setSuccessMessage(null)}
              aria-label="Đóng thông báo"
            >
              ×
            </button>
          </div>
        )}

        {errorMessage && (
          <div
            className={`${styles.noticeBanner} ${styles.error}`}
            role="alert"
            aria-live="polite"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <AlertCircle size={18} aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRetry}
            >
              Thử Lại
            </Button>
          </div>
        )}

        {/* ĐIỀU CHỈNH 6: TABS LỌC TRẠNG THÁI VỚI ROLE="TABLIST" VÀ ROLE="TAB" */}
        <div className={styles.tabNavWrapper}>
          <div
            className={styles.tabList}
            role="tablist"
            aria-label="Lọc đơn hàng theo trạng thái"
          >
            {ORDER_FILTER_TABS.map((tab) => {
              const isActive = currentStatus === tab.id
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="orders-panel"
                  tabIndex={isActive ? 0 : -1}
                  className={`${styles.tabButton} ${isActive ? styles.active : ''}`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* PANEL NỘI DUNG ĐƠN HÀNG */}
        <div id="orders-panel" role="tabpanel" aria-labelledby={`tab-${currentStatus}`}>
          {/* TRẠNG THÁI ĐANG TẢI (SKELETONS) */}
          {isLoading ? (
            <div className={styles.skeletonsList} aria-label="Đang nạp danh sách đơn hàng">
              {[1, 2, 3].map((key) => (
                <div key={key} className={styles.skeletonCard}>
                  <div className={styles.skeletonHeader}>
                    <Skeleton width={160} height={20} />
                    <Skeleton width={100} height={24} borderRadius={12} />
                  </div>
                  <div className={styles.skeletonItems}>
                    <Skeleton width={48} height={60} borderRadius={4} />
                    <div style={{ flex: 1 }}>
                      <Skeleton width="60%" height={18} style={{ marginBottom: 6 }} />
                      <Skeleton width="30%" height={14} />
                    </div>
                    <Skeleton width={80} height={18} />
                  </div>
                  <div className={styles.skeletonFooter}>
                    <Skeleton width={140} height={24} />
                    <Skeleton width={120} height={36} borderRadius={4} />
                  </div>
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            /* TRẠNG THÁI DANH SÁCH TRỐNG */
            <EmptyState
              icon={<ShoppingBag size={48} strokeWidth={1} />}
              title={
                currentStatus === 'all'
                  ? 'Bạn chưa có đơn hàng nào'
                  : `Không có đơn hàng nào ở trạng thái "${
                      validTab?.label || currentStatus
                    }"`
              }
              description={
                currentStatus === 'all'
                  ? 'Quý khách chưa thực hiện đặt đơn hàng nào. Hãy khám phá các thiết kế thời trang tinh tế mới nhất từ MODE STUDIO.'
                  : 'Không tìm thấy đơn hàng phù hợp với trạng thái đang chọn. Quý khách có thể xem lại toàn bộ đơn hàng.'
              }
              action={
                currentStatus === 'all' ? (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => navigate('/products')}
                  >
                    Khám Phá Bộ Sưu Tập
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => handleTabChange('all')}
                  >
                    Xem Tất Cả Đơn Hàng
                  </Button>
                )
              }
            />
          ) : (
            /* DANH SÁCH THẺ ĐƠN HÀNG */
            <div className={styles.ordersList}>
              {orders.map((order) => {
                const statusConfig = ORDER_STATUS_CONFIG[order.status as OrderStatus] || {
                  label: order.status,
                  variant: 'default',
                }
                const previewItems = order.items.slice(0, 2)
                const remainingItemsCount = order.items.length - 2

                return (
                  <article key={order.orderCode} className={styles.orderCard}>
                    {/* HEADER THẺ */}
                    <header className={styles.cardHeader}>
                      <div className={styles.cardHeaderLeft}>
                        <span className={styles.orderCode}>{order.orderCode}</span>
                        <span className={styles.orderDate}>
                          Đặt ngày {formatDateTime(order.createdAt)}
                        </span>
                      </div>
                      <Badge variant={statusConfig.variant} size="sm">
                        {statusConfig.label}
                      </Badge>
                    </header>

                    {/* DANH SÁCH XEM TRƯỚC SẢN PHẨM (1-2 MÓN) */}
                    <div className={styles.itemsPreview}>
                      {previewItems.map((item) => (
                        <div key={item.id} className={styles.previewItem}>
                          <div className={styles.previewThumbWrapper}>
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.productName}
                                className={styles.previewThumb}
                                loading="lazy"
                              />
                            ) : (
                              <div className={styles.previewThumbPlaceholder}>
                                <ShoppingBag size={18} strokeWidth={1.5} />
                              </div>
                            )}
                          </div>

                          <div className={styles.previewInfo}>
                            <h2 className={styles.previewName} title={item.productName}>
                              {item.productName}
                            </h2>
                            <p className={styles.previewMeta}>
                              {[item.colorName, item.sizeName].filter(Boolean).join(' / ')}
                              {item.sku ? ` • SKU: ${item.sku}` : ''}
                            </p>
                          </div>

                          <span className={styles.previewPriceQty}>
                            {formatCurrency(item.unitPrice)} × {item.quantity}
                          </span>
                        </div>
                      ))}

                      {remainingItemsCount > 0 && (
                        <p className={styles.moreItemsText}>
                          và {remainingItemsCount} sản phẩm khác trong đơn hàng
                        </p>
                      )}
                    </div>

                    {/* FOOTER THẺ */}
                    <footer className={styles.cardFooter}>
                      <div className={styles.cardTotal}>
                        <span className={styles.totalLabel}>Tổng thanh toán:</span>
                        <span className={styles.totalValue}>
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </div>

                      <div className={styles.cardActions}>
                        {order.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenCancelModal(order)}
                            aria-label={`Hủy đơn hàng ${order.orderCode}`}
                          >
                            Hủy đơn
                          </Button>
                        )}

                        {/* ĐIỀU CHỈNH 4: Truyền state: { from: location.pathname + location.search } để quay lại đúng trang */}
                        <Link
                          to={`/orders/${order.orderCode}`}
                          state={{ from: location.pathname + location.search }}
                          style={{ textDecoration: 'none' }}
                        >
                          <Button
                            variant="secondary"
                            size="sm"
                            rightIcon={<ChevronRight size={14} />}
                          >
                            Xem Chi Tiết
                          </Button>
                        </Link>
                      </div>
                    </footer>
                  </article>
                )
              })}
            </div>
          )}

          {/* PHÂN TRANG */}
          {!isLoading && paginationMeta && paginationMeta.last_page > 1 && (
            <nav className={styles.paginationWrapper} aria-label="Phân trang đơn hàng">
              <Pagination
                page={paginationMeta.current_page}
                totalPages={paginationMeta.last_page}
                onChange={handlePageChange}
              />
            </nav>
          )}
        </div>
      </div>

      {/* MODAL XÁC NHẬN HỦY ĐƠN HÀNG */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => {
          if (!isCancelling) setCancelModalOpen(false)
        }}
        title="Xác Nhận Hủy Đơn Hàng"
        size="md"
        footer={
          <div className={styles.modalActions}>
            <Button
              variant="secondary"
              size="md"
              disabled={isCancelling}
              onClick={() => setCancelModalOpen(false)}
            >
              Giữ Lại Đơn Hàng
            </Button>
            <Button
              variant="primary"
              size="md"
              isLoading={isCancelling}
              onClick={handleConfirmCancel}
            >
              Xác Nhận Hủy Đơn
            </Button>
          </div>
        }
      >
        <div className={styles.cancelForm}>
          <p className={styles.cancelPrompt}>
            Quý khách có chắc chắn muốn hủy đơn hàng{' '}
            <strong>{cancellingOrder?.orderCode}</strong> không?
            Số lượng các sản phẩm trong đơn sẽ được tự động hoàn lại kho hàng.
          </p>

          <Textarea
            id="cancel-reason-input"
            label="Lý do hủy đơn (tùy chọn)"
            placeholder="Quý khách vui lòng chia sẻ lý do hủy đơn (ví dụ: muốn đổi địa chỉ, đổi màu/size,...)..."
            value={cancelReason}
            onChange={(e) => {
              setCancelReason(e.target.value)
              setCancelError(null)
            }}
            errorMessage={cancelError || undefined}
            helperText="Tối đa 500 ký tự"
            disabled={isCancelling}
            maxLength={500}
            rows={3}
            fullWidth
          />
        </div>
      </Modal>
    </main>
  )
}

export default MyOrdersPage
