import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import {
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  X,
  Clock,
  UserCheck,
  Truck,
  CreditCard,
  Package,
  Printer,
} from 'lucide-react'
import axios from 'axios'
import { adminOrderService } from '@/services/api/adminOrderService'
import type { AdminOrderDetail } from '@/types/adminOrder'
import {
  ADMIN_ORDER_ACTIONS,
  getOrderStatusBadge,
  getPaymentStatusBadge,
  getPaymentMethodLabel,
  type AdminOrderActionItem,
} from '@/config/orderStatus'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import { Button, Badge, Textarea, Input } from '@/components/common'
import { Breadcrumbs } from '@/components/navigation'
import { EmptyState, Modal, Skeleton } from '@/components/feedback'
import { SHIPPING_CARRIERS } from '@/config/shipping'
import { useAppSelector } from '@/store/hooks'
import { selectUserRole } from '@/store/slices/authSlice'
import styles from './AdminOrderDetailPage.module.scss'

export const AdminOrderDetailPage = () => {
  const { orderCode } = useParams<{ orderCode: string }>()
  const location = useLocation()

  // 1. Giữ nguyên bộ lọc và số trang trước đó khi quay lại danh sách
  const backTarget = (location.state as { from?: string } | null)?.from || '/admin/orders'

  const [order, setOrder] = useState<AdminOrderDetail | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(orderCode))
  const [isNotFound, setIsNotFound] = useState(!orderCode)
  const [isForbidden, setIsForbidden] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [reloadTrigger, setReloadTrigger] = useState(0)

  // 2. State Modal Đổi trạng thái
  const [activeAction, setActiveAction] = useState<AdminOrderActionItem | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [carrier, setCarrier] = useState<string>(SHIPPING_CARRIERS[0] || 'GHN')
  const [trackingCode, setTrackingCode] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const [carrierError, setCarrierError] = useState<string | null>(null)
  const [trackingCodeError, setTrackingCodeError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const actionLockRef = useRef(false)

  // 2b. State Modal Xác nhận Hoàn tiền
  const currentUserRole = useAppSelector(selectUserRole)
  const isAdmin = currentUserRole === 'admin'
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [refundNote, setRefundNote] = useState('')
  const [refundError, setRefundError] = useState<string | null>(null)
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false)

  // 3. Tải chi tiết đơn hàng
  const reloadOrder = useCallback(() => {
    setIsLoading(true)
    setReloadTrigger((c) => c + 1)
  }, [])

  useEffect(() => {
    if (!orderCode) return
    const controller = new AbortController()

    adminOrderService
      .getAdminOrder(orderCode, controller.signal)
      .then((data) => {
        setOrder(data)
        setIsLoading(false)
        setGlobalError(null)
      })
      .catch((err: unknown) => {
        if (axios.isCancel(err) || (err as { name?: string })?.name === 'CanceledError') {
          return
        }
        setIsLoading(false)
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 404) {
          setIsNotFound(true)
        } else if (status === 403) {
          setIsForbidden(true)
        } else {
          setGlobalError(
            (err as { response?: { data?: { message?: string } } })?.response?.data
              ?.message || 'Không thể tải thông tin đơn hàng. Vui lòng thử lại sau.',
          )
        }
      })

    return () => {
      controller.abort()
    }
  }, [orderCode, reloadTrigger])

  // 4. Mở modal xác nhận hành động
  const handleOpenActionModal = (action: AdminOrderActionItem) => {
    setActiveAction(action)
    setCancelReason('')
    setCarrier(SHIPPING_CARRIERS[0] || 'GHN')
    setTrackingCode('')
    setReasonError(null)
    setCarrierError(null)
    setTrackingCodeError(null)
    setModalError(null)
  }

  // 5. Đóng modal xác nhận
  const handleCloseModal = () => {
    if (isSubmitting) return
    setActiveAction(null)
    setCancelReason('')
    setCarrier(SHIPPING_CARRIERS[0] || 'GHN')
    setTrackingCode('')
    setReasonError(null)
    setCarrierError(null)
    setTrackingCodeError(null)
    setModalError(null)
    actionLockRef.current = false
  }

  // 6. Thực hiện chuyển trạng thái đơn hàng
  const handleConfirmAction = async () => {
    if (!orderCode || !activeAction) return
    if (actionLockRef.current || isSubmitting) return

    setModalError(null)
    setReasonError(null)
    setCarrierError(null)
    setTrackingCodeError(null)

    // Kiểm tra ràng buộc lý do hủy đơn
    if (activeAction.isCancel) {
      const trimmedReason = cancelReason.trim()
      if (!trimmedReason) {
        setReasonError('Lý do hủy đơn hàng là bắt buộc khi quản trị viên hủy đơn.')
        return
      }
      if (trimmedReason.length > 500) {
        setReasonError('Lý do hủy đơn không được vượt quá 500 ký tự.')
        return
      }
    }

    // Kiểm tra ràng buộc đơn vị vận chuyển và mã vận đơn khi chuyển sang shipping
    if (activeAction.targetStatus === 'shipping') {
      let hasError = false
      if (!carrier.trim()) {
        setCarrierError('Vui lòng chọn đơn vị vận chuyển.')
        hasError = true
      }
      if (!trackingCode.trim()) {
        setTrackingCodeError('Mã vận đơn là bắt buộc khi chuyển sang giao hàng.')
        hasError = true
      } else if (trackingCode.trim().length > 100) {
        setTrackingCodeError('Mã vận đơn không được vượt quá 100 ký tự.')
        hasError = true
      }
      if (hasError) return
    }

    actionLockRef.current = true
    setIsSubmitting(true)

    try {
      const result = await adminOrderService.updateAdminOrderStatus(orderCode, {
        status: activeAction.targetStatus,
        reason: activeAction.isCancel ? cancelReason.trim() : undefined,
        carrier: activeAction.targetStatus === 'shipping' ? carrier.trim() : undefined,
        tracking_code: activeAction.targetStatus === 'shipping' ? trackingCode.trim() : undefined,
      })

      setOrder(result.order)
      setSuccessMessage(result.message || 'Cập nhật trạng thái đơn hàng thành công.')
      setActiveAction(null)
      actionLockRef.current = false
      setIsSubmitting(false)
    } catch (err: unknown) {
      actionLockRef.current = false
      setIsSubmitting(false)

      const status = (err as { response?: { status?: number } })?.response?.status
      const responseData = (
        err as {
          response?: {
            data?: {
              message?: string
              errors?: Record<string, string[]>
            }
          }
        }
      )?.response?.data

      if (status === 422) {
        let hasSpecificError = false

        // Trường hợp lỗi validate trường reason
        if (responseData?.errors?.reason && responseData.errors.reason.length > 0) {
          setReasonError(responseData.errors.reason[0])
          hasSpecificError = true
        }

        // Trường hợp lỗi validate trường carrier
        if (responseData?.errors?.carrier && responseData.errors.carrier.length > 0) {
          setCarrierError(responseData.errors.carrier[0])
          hasSpecificError = true
        }

        // Trường hợp lỗi validate trường tracking_code
        if (responseData?.errors?.tracking_code && responseData.errors.tracking_code.length > 0) {
          setTrackingCodeError(responseData.errors.tracking_code[0])
          hasSpecificError = true
        }

        if (hasSpecificError) {
          return
        }

        // Trường hợp lỗi xung đột trạng thái (khách vừa hủy hoặc nhân viên khác vừa đổi)
        const conflictMsg =
          responseData?.message ||
          'Trạng thái đơn hàng đã thay đổi trên hệ thống. Dữ liệu đang được tải lại.'
        setGlobalError(conflictMsg)
        setActiveAction(null) // Đóng modal
        reloadOrder() // Tải lại chi tiết đơn hàng để thấy trạng thái mới
        return
      }

      // Lỗi mạng hoặc 5xx: Giữ modal mở, hiển thị thông báo để người dùng thử lại
      const errorMsg =
        responseData?.message ||
        'Đã xảy ra lỗi khi kết nối tới máy chủ. Vui lòng kiểm tra và thử lại.'
      setModalError(errorMsg)
    }
  }

  // Thao tác hoàn tiền thủ công (chỉ dành cho Admin)
  const handleOpenRefundModal = () => {
    setRefundNote('')
    setRefundError(null)
    setRefundModalOpen(true)
  }

  const handleCloseRefundModal = () => {
    if (isSubmittingRefund) return
    setRefundModalOpen(false)
    setRefundNote('')
    setRefundError(null)
  }

  const handleConfirmRefund = async () => {
    if (!orderCode || isSubmittingRefund) return

    if (refundNote.trim().length > 255) {
      setRefundError('Ghi chú hoàn tiền không được vượt quá 255 ký tự.')
      return
    }

    setIsSubmittingRefund(true)
    setRefundError(null)

    try {
      const payload = refundNote.trim() ? { refund_note: refundNote.trim() } : {}
      const res = await adminOrderService.confirmRefund(orderCode, payload)
      setIsSubmittingRefund(false)
      setRefundModalOpen(false)
      setOrder(res.order)
      setSuccessMessage('Xác nhận hoàn tiền thành công cho đơn hàng.')
    } catch (err: unknown) {
      setIsSubmittingRefund(false)
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setRefundError(msg || 'Không thể xác nhận hoàn tiền. Vui lòng thử lại.')
    }
  }

  // BREADCRUMBS
  const breadcrumbItems = [
    { label: 'Admin', to: '/admin' },
    { label: 'Đơn hàng', to: backTarget },
    { label: orderCode || 'Chi tiết' },
  ]

  // Trạng thái 403 Forbidden
  if (isForbidden) {
    return (
      <section className={styles.pageContainer}>
        <div className={styles.topNav}>
          <Breadcrumbs items={breadcrumbItems} />
          <Link to={backTarget} className={styles.backLink}>
            <ArrowLeft size={16} />
            <span>Quay lại danh sách đơn hàng</span>
          </Link>
        </div>
        <EmptyState
          icon={<AlertCircle size={48} />}
          title="Không Có Quyền Truy Cập"
          description="Bạn không có quyền thực hiện thao tác hoặc xem thông tin đơn hàng này."
          action={
            <Link to={backTarget} className={styles.backLink}>
              Quay lại danh sách
            </Link>
          }
        />
      </section>
    )
  }

  // Trạng thái 404 Not Found
  if (isNotFound) {
    return (
      <section className={styles.pageContainer}>
        <div className={styles.topNav}>
          <Breadcrumbs items={breadcrumbItems} />
          <Link to={backTarget} className={styles.backLink}>
            <ArrowLeft size={16} />
            <span>Quay lại danh sách đơn hàng</span>
          </Link>
        </div>
        <EmptyState
          icon={<Package size={48} />}
          title="Đơn Hàng Không Tồn Tại"
          description={`Không tìm thấy đơn hàng với mã "${orderCode}". Có thể mã đơn không đúng hoặc đã bị xóa.`}
          action={
            <Link to={backTarget} className={styles.backLink}>
              Quay lại danh sách đơn hàng
            </Link>
          }
        />
      </section>
    )
  }

  // Trạng thái đang tải (Skeleton)
  if (isLoading || !order) {
    return (
      <section className={styles.pageContainer}>
        <div className={styles.topNav}>
          <Skeleton width={200} height={20} />
          <Skeleton width={160} height={20} />
        </div>
        <div className={styles.headerCard}>
          <div className={styles.headerInfo}>
            <Skeleton width={250} height={36} />
            <Skeleton width={180} height={18} />
          </div>
          <div className={styles.actionsGroup}>
            <Skeleton width={120} height={36} />
            <Skeleton width={120} height={36} />
          </div>
        </div>
        <div className={styles.detailGrid}>
          <div className={styles.mainColumn}>
            <div className={styles.card}>
              <Skeleton width="100%" height={240} />
            </div>
          </div>
          <div className={styles.sideColumn}>
            <div className={styles.card}>
              <Skeleton width="100%" height={180} />
            </div>
            <div className={styles.card}>
              <Skeleton width="100%" height={180} />
            </div>
          </div>
        </div>
      </section>
    )
  }

  const statusBadge = getOrderStatusBadge(order.status)
  const paymentBadge = getPaymentStatusBadge(order.paymentStatus)
  const availableActions = ADMIN_ORDER_ACTIONS[order.status as keyof typeof ADMIN_ORDER_ACTIONS] || []

  return (
    <section className={styles.pageContainer} aria-labelledby="order-detail-title">
      {/* THANH ĐIỀU HƯỚNG TRÊN CÙNG */}
      <div className={styles.topNav}>
        <Breadcrumbs items={breadcrumbItems} />
        <Link to={backTarget} className={styles.backLink}>
          <ArrowLeft size={16} />
          <span>Quay lại danh sách đơn hàng</span>
        </Link>
      </div>

      {/* THÔNG BÁO TOÀN CỤC */}
      {successMessage && (
        <div className={`${styles.alertBanner} ${styles.success}`} role="status" aria-live="polite">
          <CheckCircle2 size={18} />
          <span className={styles.alertText}>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className={styles.alertCloseBtn}
            aria-label="Đóng thông báo thành công"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {globalError && (
        <div className={`${styles.alertBanner} ${styles.error}`} role="alert" aria-live="assertive">
          <AlertCircle size={18} />
          <span className={styles.alertText}>{globalError}</span>
          <button
            type="button"
            onClick={() => setGlobalError(null)}
            className={styles.alertCloseBtn}
            aria-label="Đóng thông báo lỗi"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* THẺ TIÊU ĐỀ & NÚT THAO TÁC */}
      <div className={styles.headerCard}>
        <div className={styles.headerInfo}>
          <div className={styles.codeBadgeGroup}>
            <h1 id="order-detail-title" className={styles.orderCode}>
              {order.orderCode}
            </h1>
            <Badge variant={statusBadge.variant} size="md">
              {statusBadge.label}
            </Badge>
            <Badge variant={paymentBadge.variant} size="md">
              {paymentBadge.label}
            </Badge>
          </div>
          <p className={styles.orderDate}>
            Ngày đặt hàng: <strong>{formatDateTime(order.createdAt)}</strong>
          </p>
        </div>

        {/* NÚT THAO TÁC & IN HÓA ĐƠN */}
        <div className={styles.headerRightActions}>
          <Link
            to={`/admin/orders/${encodeURIComponent(order.orderCode)}/invoice`}
            className={styles.invoiceActionBtn}
            aria-label={`Xem hoặc in hóa đơn cho đơn hàng ${order.orderCode}`}
          >
            <Printer size={16} aria-hidden="true" />
            <span>Xem / In hóa đơn</span>
          </Link>

          {(availableActions.length > 0 || (order.paymentStatus === 'refund_pending' && isAdmin)) && (
            <div className={styles.actionsGroup}>
              {availableActions.map((action) => {
                const isUnpaidVnPay =
                  order.paymentMethod === 'vnpay' && order.paymentStatus !== 'paid'
                const isCancel = Boolean(action.isCancel) || action.targetStatus === 'cancelled'
                const isDisabled = isUnpaidVnPay && !isCancel

                return (
                  <Button
                    key={action.targetStatus}
                    variant={action.variant}
                    size="md"
                    disabled={isDisabled}
                    title={
                      isDisabled
                        ? 'Đơn VNPay chưa thanh toán. Không thể xử lý đơn hàng.'
                        : undefined
                    }
                    onClick={() => handleOpenActionModal(action)}
                  >
                    {action.label}
                  </Button>
                )
              })}

              {order.paymentStatus === 'refund_pending' && isAdmin && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleOpenRefundModal}
                >
                  Xác nhận đã hoàn tiền
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {order.paymentStatus === 'refund_pending' && (
        <div className={`${styles.alertBanner} ${styles.warning}`} role="alert" style={{ marginBottom: 'var(--space-6)' }}>
          <AlertTriangle size={18} />
          <span className={styles.alertText}>
            Đơn hàng này đang ở trạng thái <strong>Chờ hoàn tiền</strong>. Quản trị viên cần thực hiện hoàn tiền thủ công cho khách hàng qua tài khoản ngân hàng hoặc cổng VNPay merchant, sau đó bấm &ldquo;Xác nhận đã hoàn tiền&rdquo;.
          </span>
        </div>
      )}

      {order.paymentMethod === 'vnpay' &&
        order.paymentStatus !== 'paid' &&
        order.status !== 'cancelled' && (
          <div className={`${styles.alertBanner} ${styles.warning}`} role="alert" style={{ marginBottom: 'var(--space-6)' }}>
            <AlertTriangle size={18} />
            <span className={styles.alertText}>
              Đơn hàng này thanh toán qua VNPay nhưng chưa thanh toán. Các thao tác xác nhận và giao hàng đang bị khóa cho tới khi thanh toán hoàn tất. Quản trị viên có thể hủy đơn nếu khách yêu cầu.
            </span>
          </div>
        )}

      {/* BỐ CỤC LƯỚI CHI TIẾT */}
      <div className={styles.detailGrid}>
        {/* CỘT CHÍNH (TRÁI): SẢN PHẨM & TỔNG KẾT & CẢNH BÁO HỦY */}
        <div className={styles.mainColumn}>
          {/* CẢNH BÁO ĐƠN ĐÃ HỦY */}
          {order.status === 'cancelled' && (
            <div className={styles.cancelAlertCard}>
              <div className={styles.cancelAlertHeader}>
                <AlertTriangle size={18} />
                <span>Đơn Hàng Đã Bị Hủy</span>
              </div>
              <p className={styles.cancelReasonText}>
                Lý do hủy: {order.cancelReason || 'Không có lý do cụ thể'}
              </p>
              {order.cancelledAt && (
                <span className={styles.cancelTimeText}>
                  Thời gian hủy: {formatDateTime(order.cancelledAt)}
                </span>
              )}
            </div>
          )}

          {/* DANH SÁCH SẢN PHẨM SNAPSHOT */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Danh Sách Sản Phẩm ({order.items.length})</h2>
            <div className={styles.itemsTableWrapper}>
              <table className={styles.itemsTable}>
                <thead>
                  <tr>
                    <th scope="col">Sản Phẩm</th>
                    <th scope="col">Đơn Giá</th>
                    <th scope="col">Số Lượng</th>
                    <th scope="col">Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className={styles.productCell}>
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.productName}
                              className={styles.productThumb}
                            />
                          ) : (
                            <div className={styles.productThumb} aria-hidden="true" />
                          )}
                          <div className={styles.productMeta}>
                            <span className={styles.productName}>{item.productName}</span>
                            <span className={styles.productVariant}>
                              Màu: {item.colorName} | Size: {item.sizeName}
                            </span>
                            <span className={styles.productSku}>SKU: {item.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* BẢNG TỔNG KẾT TÀI CHÍNH */}
            <table className={styles.summaryTable}>
              <tbody>
                <tr>
                  <td>Tạm tính:</td>
                  <td>{formatCurrency(order.subtotal)}</td>
                </tr>
                <tr>
                  <td>Phí vận chuyển:</td>
                  <td>
                    {order.shippingFee === 0 ? 'Miễn phí' : formatCurrency(order.shippingFee)}
                  </td>
                </tr>
                {order.discountAmount > 0 && (
                  <tr>
                    <td>Giảm giá:</td>
                    <td>-{formatCurrency(order.discountAmount)}</td>
                  </tr>
                )}
                <tr className={styles.totalRow}>
                  <td>Tổng giá trị đơn hàng:</td>
                  <td>{formatCurrency(order.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CỘT PHỤ (PHẢI): KHÁCH HÀNG, GIAO NHẬN, THANH TOÁN & LỊCH SỬ TRẠNG THÁI */}
        <div className={styles.sideColumn}>
          {/* THÔNG TIN KHÁCH HÀNG */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Thông Tin Khách Hàng</h2>
            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Họ và tên:</span>
                <span className={styles.infoValue}>
                  {order.customer?.fullName || 'Khách vãng lai'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Email liên hệ:</span>
                <span className={styles.infoValue}>
                  {order.customer?.email || 'Chưa cung cấp'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Số điện thoại:</span>
                <span className={styles.infoValue}>
                  {order.customer?.phone || order.recipientPhone}
                </span>
              </div>
            </div>
          </div>

          {/* ĐỊA CHỈ NHẬN HÀNG */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Thông Tin Giao Nhận</h2>
            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Người nhận:</span>
                <span className={styles.infoValue}>{order.recipientName}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Số điện thoại nhận:</span>
                <span className={styles.infoValue}>{order.recipientPhone}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Địa chỉ giao hàng:</span>
                <span className={styles.infoValue}>{order.shippingAddress}</span>
              </div>
              {order.carrier && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Đơn vị vận chuyển:</span>
                  <span className={styles.infoValue}>
                    <strong>{order.carrier}</strong>
                  </span>
                </div>
              )}
              {order.trackingCode && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Mã vận đơn:</span>
                  <span className={styles.infoValue}>
                    <Badge variant="luxury" size="sm">
                      {order.trackingCode}
                    </Badge>
                  </span>
                </div>
              )}
              {order.note && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Ghi chú đơn hàng:</span>
                  <div className={styles.orderNoteBox}>&ldquo;{order.note}&rdquo;</div>
                </div>
              )}
            </div>
          </div>

          {/* PHƯƠNG THỨC THANH TOÁN */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Thanh Toán</h2>
            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Phương thức:</span>
                <span className={styles.infoValue}>
                  {getPaymentMethodLabel(order.paymentMethod)}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Trạng thái:</span>
                <div>
                  <Badge variant={paymentBadge.variant} size="sm">
                    {paymentBadge.label}
                  </Badge>
                </div>
              </div>
              {order.paidAt && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Thời gian thanh toán:</span>
                  <span className={styles.infoValue}>{formatDateTime(order.paidAt)}</span>
                </div>
              )}
              {order.paymentDetails?.providerTransactionNo && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Mã GD VNPay:</span>
                  <span className={styles.infoValue}>
                    {order.paymentDetails.providerTransactionNo}
                  </span>
                </div>
              )}
              {order.paymentDetails?.bankCode && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Ngân hàng:</span>
                  <span className={styles.infoValue}>{order.paymentDetails.bankCode}</span>
                </div>
              )}
              {order.paymentDetails?.txnRef && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Mã tham chiếu:</span>
                  <span className={styles.infoValue}>{order.paymentDetails.txnRef}</span>
                </div>
              )}
              {order.refundRequestedAt && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Yêu cầu hoàn tiền:</span>
                  <span className={styles.infoValue}>{formatDateTime(order.refundRequestedAt)}</span>
                </div>
              )}
              {order.refundedAt && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Thời gian hoàn tiền:</span>
                  <span className={styles.infoValue}>{formatDateTime(order.refundedAt)}</span>
                </div>
              )}
              {order.refundNote && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Ghi chú hoàn tiền:</span>
                  <div className={styles.orderNoteBox}>&ldquo;{order.refundNote}&rdquo;</div>
                </div>
              )}
            </div>
          </div>

          {/* DÒNG THỜI GIAN LỊCH SỬ TRẠNG THÁI */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Lịch Sử Trạng Thái</h2>
            {order.statusHistories.length === 0 ? (
              <p className={styles.emptyTimelineNote}>
                Chưa có lịch sử trạng thái cho đơn hàng này.
              </p>
            ) : (
              <div className={styles.timeline}>
                {order.statusHistories.map((history) => {
                  const toBadge = getOrderStatusBadge(history.toStatus)
                  const fromBadge = history.fromStatus
                    ? getOrderStatusBadge(history.fromStatus)
                    : null

                  return (
                    <div key={history.id} className={styles.timelineItem}>
                      <span className={styles.timelineDot} aria-hidden="true" />
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineTitle}>
                          {fromBadge ? (
                            <>
                              <Badge variant={fromBadge.variant} size="sm">
                                {fromBadge.label}
                              </Badge>
                              <span className={styles.timelineArrow}>&rarr;</span>
                              <Badge variant={toBadge.variant} size="sm">
                                {toBadge.label}
                              </Badge>
                            </>
                          ) : (
                            <Badge variant={toBadge.variant} size="sm">
                              {toBadge.label}
                            </Badge>
                          )}
                        </div>

                        <div className={styles.timelineMeta}>
                          <span className={styles.timelineUser}>
                            {history.changedBy ? (
                              <>
                                <UserCheck size={12} style={{ display: 'inline', marginRight: 4 }} />
                                {history.changedBy.fullName}
                                {history.changedBy.role && ` (${history.changedBy.role})`}
                              </>
                            ) : (
                              'Hệ thống'
                            )}
                          </span>
                          <span>&bull;</span>
                          <span>
                            <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                            {formatDateTime(history.createdAt)}
                          </span>
                        </div>

                        {history.reason && (
                          <div className={styles.timelineReason}>
                            &ldquo;{history.reason}&rdquo;
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL XÁC NHẬN CHUYỂN TRẠNG THÁI */}
      {activeAction && (
        <Modal
          isOpen={Boolean(activeAction)}
          onClose={handleCloseModal}
          title={activeAction.modalTitle}
          size="md"
        >
          <div className={styles.modalBody}>
            <p>{activeAction.modalDescription}</p>

            {/* Ghi chú thông tin tự động */}
            {activeAction.targetStatus === 'delivered' && order.paymentMethod === 'cod' && (
              <div className={`${styles.modalNotice} ${styles.info}`}>
                <CreditCard size={16} />
                <span>
                  Đơn hàng thanh toán khi nhận hàng (COD) sẽ được tự động cập nhật trạng thái
                  thành <strong>&ldquo;Đã thanh toán&rdquo;</strong>.
                </span>
              </div>
            )}

            {activeAction.isCancel && (
              <div className={`${styles.modalNotice} ${styles.warning}`}>
                <Truck size={16} />
                <span>
                  Tồn kho của các sản phẩm trong đơn sẽ được tự động hoàn lại số lượng khả dụng
                  trong kho hàng.
                </span>
              </div>
            )}

            {/* Trường nhập đơn vị vận chuyển và mã vận đơn khi giao hàng */}
            {activeAction.targetStatus === 'shipping' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', margin: 'var(--space-3) 0' }}>
                <div>
                  <label
                    htmlFor="carrier-select"
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 500,
                      marginBottom: 'var(--space-1)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    Đơn vị vận chuyển *
                  </label>
                  <select
                    id="carrier-select"
                    value={carrier}
                    onChange={(e) => {
                      setCarrier(e.target.value)
                      if (carrierError) setCarrierError(null)
                      if (modalError) setModalError(null)
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: carrierError ? '1px solid var(--color-error)' : '1px solid var(--color-border)',
                      fontSize: '0.875rem',
                      background: 'var(--color-white)',
                      outline: 'none',
                    }}
                    disabled={isSubmitting}
                  >
                    {SHIPPING_CARRIERS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {carrierError && (
                    <span
                      style={{
                        color: 'var(--color-error)',
                        fontSize: '0.75rem',
                        marginTop: '4px',
                        display: 'block',
                      }}
                    >
                      {carrierError}
                    </span>
                  )}
                </div>

                <Input
                  label="Mã vận đơn *"
                  placeholder="Ví dụ: GHN-VN-12345678"
                  value={trackingCode}
                  onChange={(e) => {
                    setTrackingCode(e.target.value)
                    if (trackingCodeError) setTrackingCodeError(null)
                    if (modalError) setModalError(null)
                  }}
                  errorMessage={trackingCodeError || undefined}
                  fullWidth
                  disabled={isSubmitting}
                  maxLength={100}
                />
              </div>
            )}

            {/* Trường nhập lý do khi hủy đơn */}
            {activeAction.isCancel && (
              <>
                <Textarea
                  label="Lý do hủy đơn hàng *"
                  placeholder="Vui lòng nhập chi tiết lý do quản trị viên hủy đơn..."
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value)
                    if (reasonError) setReasonError(null)
                    if (modalError) setModalError(null)
                  }}
                  errorMessage={reasonError || undefined}
                  rows={4}
                  fullWidth
                  disabled={isSubmitting}
                  maxLength={500}
                />
                <div className={styles.charCounter}>
                  {cancelReason.length} / 500 ký tự
                </div>
              </>
            )}

            {/* Thông báo lỗi trong modal (5xx / lỗi mạng) */}
            {modalError && (
              <div className={styles.modalErrorAlert} role="alert">
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            {/* Nút hành động trong Modal */}
            <div className={styles.modalFooter}>
              <Button
                variant="secondary"
                size="md"
                onClick={handleCloseModal}
                disabled={isSubmitting}
              >
                Hủy bỏ
              </Button>
              <Button
                variant={activeAction.variant}
                size="md"
                onClick={handleConfirmAction}
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                {activeAction.isCancel ? 'Xác nhận hủy đơn' : 'Xác nhận'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL XÁC NHẬN ĐÃ HOÀN TIỀN THỦ CÔNG */}
      <Modal
        isOpen={refundModalOpen}
        onClose={handleCloseRefundModal}
        title="Xác Nhận Đã Hoàn Tiền"
        size="md"
        footer={
          <div className={styles.modalFooter}>
            <Button
              variant="secondary"
              size="md"
              onClick={handleCloseRefundModal}
              disabled={isSubmittingRefund}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirmRefund}
              isLoading={isSubmittingRefund}
              disabled={isSubmittingRefund}
            >
              Xác Nhận Đã Hoàn Tiền
            </Button>
          </div>
        }
      >
        <div className={styles.modalBody}>
          <p className={styles.modalPrompt}>
            Xác nhận quý khách đã hoàn tiền thành công cho đơn hàng{' '}
            <strong>{order.orderCode}</strong>? Sau khi xác nhận, trạng thái thanh toán sẽ đổi sang{' '}
            <strong>Đã hoàn tiền</strong>.
          </p>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-4)',
              lineHeight: 1.5,
            }}
          >
            Lưu ý: Hệ thống không tự động gọi API hoàn tiền. Quản trị viên cần thực hiện chuyển khoản
            hoặc hoàn tiền thủ công trên cổng thanh toán trước khi xác nhận.
          </p>

          {refundError && (
            <div
              className={`${styles.alertBanner} ${styles.error}`}
              role="alert"
              style={{ marginBottom: 'var(--space-4)' }}
            >
              <AlertCircle size={16} />
              <span className={styles.alertText}>{refundError}</span>
            </div>
          )}

          <Textarea
            id="admin-refund-note-input"
            label="Ghi chú hoàn tiền (tùy chọn)"
            placeholder="Nhập thông tin giao dịch hoàn tiền (ví dụ: Đã CK qua VCB lúc 14:00, mã GD...)..."
            value={refundNote}
            onChange={(e) => {
              setRefundNote(e.target.value)
              if (refundError) setRefundError(null)
            }}
            helperText="Tối đa 255 ký tự"
            disabled={isSubmittingRefund}
            maxLength={255}
            rows={3}
            fullWidth
          />
        </div>
      </Modal>
    </section>
  )
}

export default AdminOrderDetailPage
