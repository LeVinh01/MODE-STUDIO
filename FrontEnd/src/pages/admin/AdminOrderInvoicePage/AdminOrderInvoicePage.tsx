import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Package } from 'lucide-react'
import axios from 'axios'
import { adminOrderService } from '@/services/api/adminOrderService'
import type { AdminOrderDetail } from '@/types/adminOrder'
import { InvoiceDocument } from '@/components/invoice/InvoiceDocument'
import { EmptyState, Spinner } from '@/components/feedback'
import { formatPageTitle } from '@/config/brand'
import styles from './AdminOrderInvoicePage.module.scss'

export const AdminOrderInvoicePage = () => {
  const { orderCode } = useParams<{ orderCode: string }>()

  const [order, setOrder] = useState<AdminOrderDetail | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(orderCode))
  const [isNotFound, setIsNotFound] = useState(!orderCode)
  const [isForbidden, setIsForbidden] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!orderCode) return

    const controller = new AbortController()

    adminOrderService
      .getAdminOrder(orderCode, controller.signal)
      .then((data) => {
        setOrder(data)
        setIsNotFound(false)
        setIsForbidden(false)
        setErrorMessage(null)
      })
      .catch((err) => {
        if (axios.isCancel(err) || (err as { name?: string })?.name === 'CanceledError') {
          return
        }

        if (axios.isAxiosError(err)) {
          if (err.response?.status === 404) {
            setIsNotFound(true)
          } else if (err.response?.status === 403) {
            setIsForbidden(true)
          } else {
            setErrorMessage(
              err.response?.data?.message ||
                'Không thể tải thông tin hóa đơn đơn hàng. Vui lòng thử lại sau.',
            )
          }
        } else {
          setErrorMessage('Đã xảy ra lỗi kết nối. Vui lòng thử lại.')
        }
      })
      .finally(() => {
        setIsLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [orderCode])

  useEffect(() => {
    document.title = formatPageTitle(
      order
        ? `Hóa đơn #${order.orderCode} - Quản trị`
        : 'Hóa đơn đơn hàng - Quản trị',
    )
  }, [order])

  if (isForbidden) {
    return (
      <div className={styles.errorContainer}>
        <EmptyState
          icon={<AlertCircle size={48} />}
          title="Không Có Quyền Truy Cập"
          description="Bạn không có quyền xem thông tin hóa đơn cho đơn hàng này."
          action={
            <Link to="/admin/orders" className={styles.errorBackLink}>
              <ArrowLeft size={16} />
              <span>Quay lại danh sách đơn hàng</span>
            </Link>
          }
        />
      </div>
    )
  }

  if (isNotFound) {
    return (
      <div className={styles.errorContainer}>
        <EmptyState
          icon={<Package size={48} />}
          title="Đơn Hàng Không Tồn Tại"
          description={`Không tìm thấy đơn hàng với mã "${orderCode}".`}
          action={
            <Link to="/admin/orders" className={styles.errorBackLink}>
              <ArrowLeft size={16} />
              <span>Quay lại danh sách đơn hàng</span>
            </Link>
          }
        />
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className={styles.errorContainer}>
        <EmptyState
          icon={<AlertCircle size={48} />}
          title="Lỗi Tải Hóa Đơn"
          description={errorMessage}
          action={
            <Link
              to={orderCode ? `/admin/orders/${encodeURIComponent(orderCode)}` : '/admin/orders'}
              className={styles.errorBackLink}
            >
              <ArrowLeft size={16} />
              <span>Quay lại chi tiết đơn hàng</span>
            </Link>
          }
        />
      </div>
    )
  }

  if (isLoading || !order) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
        <p className={styles.loadingText}>Đang tải hóa đơn đơn hàng #{orderCode}...</p>
      </div>
    )
  }

  return (
    <div className={styles.invoicePageWrapper}>
      <InvoiceDocument
        order={order}
        backUrl={`/admin/orders/${encodeURIComponent(order.orderCode)}`}
        backLabel="Quay lại chi tiết đơn hàng"
      />
    </div>
  )
}

export default AdminOrderInvoicePage
