import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import {
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Check,
  ShoppingBag,
} from 'lucide-react'
import axios from 'axios'
import { orderService } from '@/services/api/orderService'
import { paymentService } from '@/services/api/paymentService'
import type { Order, OrderStatus } from '@/types/order'
import {
  ORDER_STATUS_CONFIG,
  ORDER_PROGRESS_STEPS,
  getPaymentStatusBadge,
  getPaymentMethodLabel,
} from '@/config/orderStatus'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import { getApiErrorMessage } from '@/utils/apiError'
import { Button, Badge, Textarea } from '@/components/common'
import { Breadcrumbs } from '@/components/navigation'
import { EmptyState, Modal, Spinner } from '@/components/feedback'
import styles from './OrderDetailPage.module.scss'

export const OrderDetailPage = () => {
  const { orderCode } = useParams<{ orderCode: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  // ĐIỀU CHỈNH 4: Nút quay lại danh sách giữ nguyên bộ lọc và số trang trước đó
  const backTarget = (location.state as { from?: string } | null)?.from || '/orders'

  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(orderCode))
  const [isNotFound, setIsNotFound] = useState(!orderCode)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isRetryingPayment, setIsRetryingPayment] = useState(false)
  const [paymentActionError, setPaymentActionError] = useState<string | null>(null)

  const paymentRedirectError = (location.state as { paymentError?: string } | null)?.paymentError

  // State Modal Hủy đơn
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const cancelLockRef = useRef(false)

  // Nạp chi tiết đơn hàng
  useEffect(() => {
    if (!orderCode) return

    const controller = new AbortController()

    orderService
      .getOrderByCode(orderCode, controller.signal)
      .then((data) => {
        setOrder(data)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        if (axios.isCancel(err) || (err as { name?: string })?.name === 'CanceledError') {
          return
        }
        setIsLoading(false)
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 404 || status === 403) {
          setIsNotFound(true)
        } else {
          setErrorMessage(
            (err as { response?: { data?: { message?: string } } })?.response?.data
              ?.message || 'Không thể nạp thông tin đơn hàng. Vui lòng thử lại sau.',
          )
        }
      })

    return () => {
      controller.abort()
    }
  }, [orderCode])

  // Mở modal hủy đơn
  const handleOpenCancelModal = () => {
    setCancelReason('')
    setCancelError(null)
    setCancelModalOpen(true)
  }

  // Khởi tạo phiên thanh toán VNPay mới
  const handleRetryPayment = async () => {
    if (!order) return
    setIsRetryingPayment(true)
    setPaymentActionError(null)
    try {
      const res = await paymentService.createVnPayPayment(order.orderCode)
      window.location.assign(res.payment_url)
    } catch (err: unknown) {
      setIsRetryingPayment(false)
      setPaymentActionError(
        getApiErrorMessage(
          err,
          'Không thể khởi tạo phiên thanh toán mới. Quý khách vui lòng thử lại sau ít phút.',
        ),
      )
    }
  }

  // Thực hiện hủy đơn từ trang chi tiết
  const handleConfirmCancel = async () => {
    if (!orderCode) return
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
      const response = await orderService.cancelOrder(orderCode, payload)
      cancelLockRef.current = false
      setIsCancelling(false)
      setCancelModalOpen(false)

      // Cập nhật đơn theo response
      setOrder(response.order)
      setSuccessMessage('Đã hủy đơn hàng, số lượng hàng đã được hoàn lại kho.')
    } catch (err: unknown) {
      cancelLockRef.current = false
      setIsCancelling(false)

      const status = (err as { response?: { status?: number } })?.response?.status
      const msg = (err as { response?: { data?: { message?: string } } })?.response
        ?.data?.message

      // ĐIỀU CHỈNH 1: Lỗi 422 do đơn đã đổi trạng thái trên server (cửa hàng vừa duyệt)
      if (status === 422) {
        setCancelError(
          msg ||
            'Không thể hủy đơn: Đơn hàng đã đổi trạng thái hoặc không còn ở trạng thái chờ xác nhận.',
        )
        // Tải lại đơn để thấy trạng thái mới và ẩn nút hủy
        if (orderCode) {
          orderService.getOrderByCode(orderCode).then(setOrder).catch(() => {})
        }
        return
      }

      setCancelError(msg || 'Không thể hủy đơn hàng vào lúc này. Vui lòng thử lại.')
    }
  }

  // Màn hình đang tải
  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 400,
              gap: 'var(--space-4)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <Spinner size="lg" variant="dark" />
            <p>Đang tải thông tin chi tiết đơn hàng...</p>
          </div>
        </div>
      </main>
    )
  }

  // Màn hình 404
  if (isNotFound || !order) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <EmptyState
            icon={<ShoppingBag size={48} strokeWidth={1} />}
            title="Đơn hàng không tồn tại"
            description="Đơn hàng không tồn tại hoặc quý khách không có quyền truy cập đơn hàng này."
            action={
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate(backTarget)}
              >
                Quay Về Danh Sách Đơn Hàng
              </Button>
            }
          />
        </div>
      </main>
    )
  }

  const statusConfig = ORDER_STATUS_CONFIG[order.status as OrderStatus] || {
    label: order.status,
    variant: 'default',
    description: '',
  }

  const currentStep = statusConfig.step || 1
  const isCancelled = order.status === 'cancelled'

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* BREADCRUMBS */}
        <div className={styles.breadcrumbsWrapper}>
          <Breadcrumbs
            items={[
              { label: 'Trang chủ', to: '/' },
              { label: 'Đơn hàng của tôi', to: backTarget },
              { label: order.orderCode },
            ]}
          />
        </div>

        {/* THÔNG BÁO THÀNH CÔNG / THÔNG BÁO LỖI */}
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
          </div>
        )}

        {paymentRedirectError && (
          <div
            className={`${styles.noticeBanner} ${styles.error}`}
            role="alert"
            aria-live="polite"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <AlertCircle size={18} aria-hidden="true" />
              <span>{paymentRedirectError}</span>
            </div>
          </div>
        )}

        {paymentActionError && (
          <div
            className={`${styles.noticeBanner} ${styles.error}`}
            role="alert"
            aria-live="polite"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <AlertCircle size={18} aria-hidden="true" />
              <span>{paymentActionError}</span>
            </div>
          </div>
        )}

        {/* PAGE HEADER */}
        <header className={styles.pageHeader}>
          <div className={styles.headerTitleGroup}>
            <Link to={backTarget} className={styles.backLink}>
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Quay lại danh sách đơn hàng</span>
            </Link>

            <div className={styles.headerMainRow}>
              <h1 className={styles.orderCode}>{order.orderCode}</h1>
              <Badge variant={statusConfig.variant} size="md">
                {statusConfig.label}
              </Badge>
              <Badge variant={getPaymentStatusBadge(order.paymentStatus).variant} size="md">
                {getPaymentStatusBadge(order.paymentStatus).label}
              </Badge>
            </div>

            <span className={styles.orderDate}>
              Thời gian đặt hàng: {formatDateTime(order.createdAt)}
            </span>
          </div>

          {/* NÚT THAO TÁC ĐƠN HÀNG */}
          <div className={styles.headerActions}>
            {order.status === 'pending' &&
              order.paymentMethod === 'vnpay' &&
              order.paymentStatus === 'unpaid' && (
                <Button
                  variant="primary"
                  size="md"
                  isLoading={isRetryingPayment}
                  onClick={handleRetryPayment}
                >
                  Thanh Toán Lại
                </Button>
              )}

            {order.status === 'pending' && order.paymentStatus !== 'paid' && (
              <Button
                variant="secondary"
                size="md"
                onClick={handleOpenCancelModal}
              >
                Hủy Đơn Hàng
              </Button>
            )}

            {order.status === 'pending' && order.paymentStatus === 'paid' && (
              <span className={styles.paidNotice}>
                Đơn đã thanh toán, vui lòng liên hệ cửa hàng để hủy/hoàn tiền.
              </span>
            )}
          </div>
        </header>

        {/* TIẾN TRÌNH ĐƠN HÀNG HOẶC BANNER ĐƠN ĐÃ HỦY */}
        {isCancelled ? (
          <section className={styles.cancelledBanner} aria-label="Thông tin hủy đơn">
            <AlertTriangle size={24} className={styles.cancelledIcon} aria-hidden="true" />
            <div className={styles.cancelledContent}>
              <h2 className={styles.cancelledTitle}>Đơn Hàng Đã Bị Hủy</h2>
              <p className={styles.cancelledReason}>
                <strong>Lý do hủy:</strong> {order.cancelReason || 'Khách hàng tự hủy đơn'}
              </p>
              {order.cancelledAt && (
                <p className={styles.cancelledDate}>
                  Thời gian hủy: {formatDateTime(order.cancelledAt)}
                </p>
              )}
            </div>
          </section>
        ) : (
          <section className={styles.trackerCard} aria-label="Tiến trình xử lý đơn hàng">
            <h2 className={styles.trackerTitle}>Tiến Trình Đơn Hàng</h2>

            <div className={styles.stepper}>
              {ORDER_PROGRESS_STEPS.map((stepItem) => {
                const isCompleted = stepItem.step < currentStep
                const isCurrent = stepItem.step === currentStep

                return (
                  <div
                    key={stepItem.status}
                    className={`${styles.stepItem} ${
                      isCompleted ? styles.stepCompleted : ''
                    } ${isCurrent ? styles.stepCurrent : ''}`}
                  >
                    <div className={styles.stepCircle} aria-hidden="true">
                      {isCompleted ? <Check size={14} strokeWidth={2.5} /> : stepItem.step}
                    </div>
                    <span className={styles.stepLabel}>{stepItem.label}</span>
                  </div>
                )
              })}
            </div>

            {statusConfig.description && (
              <p className={styles.stepDescription}>
                {statusConfig.description}
              </p>
            )}
          </section>
        )}

        {/* DETAILS CARD */}
        <div className={styles.detailsCard}>
          {/* 1. THÔNG TIN GIAO HÀNG */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Thông Tin Giao Hàng</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Người nhận</span>
                <span className={styles.infoValue}>{order.recipientName}</span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Số điện thoại</span>
                <span className={styles.infoValue}>{order.recipientPhone}</span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Địa chỉ nhận hàng</span>
                <span className={styles.infoValue}>{order.shippingAddress}</span>
              </div>

              {order.note && (
                <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                  <span className={styles.infoLabel}>Ghi chú đơn hàng</span>
                  <span className={styles.infoValue}>{order.note}</span>
                </div>
              )}
            </div>
          </section>

          {/* 2. PHƯƠNG THỨC THANH TOÁN */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Phương Thức Thanh Toán</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Hình thức</span>
                <span className={styles.infoValue}>
                  {getPaymentMethodLabel(order.paymentMethod)}
                </span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Trạng thái thanh toán</span>
                <span
                  className={styles.infoValue}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
                >
                  <Badge variant={getPaymentStatusBadge(order.paymentStatus).variant} size="sm">
                    {getPaymentStatusBadge(order.paymentStatus).label}
                  </Badge>
                </span>
              </div>

              {order.paymentDetails?.providerTransactionNo && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Mã giao dịch VNPAY</span>
                  <span className={styles.infoValue}>
                    {order.paymentDetails.providerTransactionNo}
                  </span>
                </div>
              )}

              {order.paymentDetails?.bankCode && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Ngân hàng thanh toán</span>
                  <span className={styles.infoValue}>{order.paymentDetails.bankCode}</span>
                </div>
              )}

              {order.paidAt && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Thời gian thanh toán</span>
                  <span className={styles.infoValue}>{formatDateTime(order.paidAt)}</span>
                </div>
              )}
            </div>
          </section>

          {/* 3. DANH SÁCH SẢN PHẨM SNAPSHOT */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Chi Tiết Sản Phẩm ({order.items.length})
            </h2>

            <ul className={styles.itemsList} aria-label="Danh sách sản phẩm trong đơn">
              {order.items.map((item) => (
                <li key={item.id} className={styles.itemRow}>
                  <div className={styles.itemThumbWrapper}>
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className={styles.itemThumb}
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.itemThumbPlaceholder}>
                        <ShoppingBag size={20} strokeWidth={1.5} />
                      </div>
                    )}
                  </div>

                  <div className={styles.itemDetails}>
                    <h3 className={styles.itemName}>{item.productName}</h3>
                    <p className={styles.itemMeta}>
                      {[item.colorName, item.sizeName].filter(Boolean).join(' / ')}
                      {item.sku ? ` • SKU: ${item.sku}` : ''}
                    </p>
                    <span className={styles.itemPriceQty}>
                      {formatCurrency(item.unitPrice)} × {item.quantity}
                    </span>
                  </div>

                  <span className={styles.itemLineTotal}>
                    {formatCurrency(item.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* 4. TÓM TẮT CHI PHÍ */}
          <div className={styles.totalsCard}>
            <div className={styles.totalRow}>
              <span>Tạm tính</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>

            <div className={styles.totalRow}>
              <span>Phí vận chuyển</span>
              <span>
                {order.shippingFee === 0
                  ? 'Miễn phí'
                  : formatCurrency(order.shippingFee)}
              </span>
            </div>

            {order.discountAmount > 0 && (
              <div className={styles.totalRow}>
                <span>Giảm giá</span>
                <span>-{formatCurrency(order.discountAmount)}</span>
              </div>
            )}

            <div className={styles.grandTotalRow}>
              <span className={styles.grandTotalLabel}>Tổng thanh toán</span>
              <span className={styles.grandTotalValue}>
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          </div>
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
            Quý khách có chắc chắn muốn hủy đơn hàng <strong>{order.orderCode}</strong> không?
            Số lượng các sản phẩm trong đơn sẽ được tự động hoàn lại kho hàng.
          </p>

          <Textarea
            id="detail-cancel-reason-input"
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

export default OrderDetailPage
