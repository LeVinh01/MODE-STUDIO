import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Package } from 'lucide-react'
import axios from 'axios'
import { orderService } from '@/services/api/orderService'
import type { Order } from '@/types/order'
import { InvoiceDocument } from '@/components/invoice/InvoiceDocument'
import { EmptyState, Spinner } from '@/components/feedback'
import { formatPageTitle } from '@/config/brand'
import styles from './OrderInvoicePage.module.scss'

export const OrderInvoicePage = () => {
  const { orderCode } = useParams<{ orderCode: string }>()

  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(orderCode))
  const [isNotFound, setIsNotFound] = useState(!orderCode)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!orderCode) return

    const controller = new AbortController()

    orderService
      .getOrderByCode(orderCode, controller.signal)
      .then((data) => {
        setOrder(data)
        setIsNotFound(false)
        setErrorMessage(null)
      })
      .catch((err) => {
        if (axios.isCancel(err) || (err as { name?: string })?.name === 'CanceledError') {
          return
        }

        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setIsNotFound(true)
        } else {
          setErrorMessage(
            (err as { response?: { data?: { message?: string } } })?.response?.data
              ?.message || 'Không thể tải thông tin hóa đơn. Vui lòng thử lại sau.',
          )
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
      order ? `Hóa đơn #${order.orderCode}` : 'Hóa đơn đơn hàng',
    )
  }, [order])

  if (isNotFound) {
    return (
      <div className={styles.errorContainer}>
        <EmptyState
          icon={<Package size={48} />}
          title="Không Tìm Thấy Đơn Hàng"
          description={`Không tìm thấy đơn hàng với mã "${orderCode}". Vui lòng kiểm tra lại đường dẫn.`}
          action={
            <Link to="/orders" className={styles.errorBackLink}>
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
              to={orderCode ? `/orders/${encodeURIComponent(orderCode)}` : '/orders'}
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
        backUrl={`/orders/${encodeURIComponent(order.orderCode)}`}
        backLabel="Quay lại chi tiết đơn hàng"
      />
    </div>
  )
}

export default OrderInvoicePage
