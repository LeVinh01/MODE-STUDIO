import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, ShoppingBag } from 'lucide-react'
import { orderService } from '@/services/api/orderService'
import type { Order } from '@/types/order'
import { ORDER_STATUS_CONFIG } from '@/config/orderStatus'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import { Button, Badge } from '@/components/common'
import { EmptyState, Spinner } from '@/components/feedback'
import styles from './OrderSuccessPage.module.scss'

export const OrderSuccessPage = () => {
  const { orderCode } = useParams<{ orderCode: string }>()
  const navigate = useNavigate()

  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(orderCode))
  const [isNotFound, setIsNotFound] = useState(!orderCode)

  useEffect(() => {
    if (!orderCode) return

    let isMounted = true

    orderService
      .getOrderByCode(orderCode)
      .then((data) => {
        if (!isMounted) return
        setOrder(data)
        setIsLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setIsNotFound(true)
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [orderCode])

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loadingWrapper}>
            <Spinner size="lg" variant="dark" />
            <p>Đang tải thông tin đơn hàng...</p>
          </div>
        </div>
      </main>
    )
  }

  if (isNotFound || !order) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <EmptyState
            icon={<ShoppingBag size={48} strokeWidth={1} />}
            title="Không tìm thấy đơn hàng"
            description="Đơn hàng không tồn tại hoặc quý khách không có quyền truy cập đơn hàng này."
            action={
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate('/')}
              >
                Quay Về Trang Chủ
              </Button>
            }
          />
        </div>
      </main>
    )
  }

  const statusConfig = ORDER_STATUS_CONFIG[order.status] || {
    label: order.status,
    variant: 'default',
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* CELEBRATION HEADER */}
        <header className={styles.successHeader}>
          <div className={styles.successIconCircle} aria-hidden="true">
            <CheckCircle2 size={36} strokeWidth={2} />
          </div>

          <h1 className={styles.title}>Cảm Ơn Quý Khách Đã Đặt Hàng!</h1>
          <p className={styles.subtitle}>
            Đơn hàng của quý khách đã được tiếp nhận thành công và đang được bộ phận chuyên trách của MODE STUDIO chuẩn bị.
          </p>

          <div className={styles.orderBadgeRow}>
            <span>Mã đơn hàng:</span>
            <span className={styles.orderCodeText}>{order.orderCode}</span>
            <Badge variant={statusConfig.variant} size="sm">
              {statusConfig.label}
            </Badge>
          </div>
        </header>

        {/* DETAILS CARD */}
        <div className={styles.detailsCard}>
          {/* 1. THÔNG TIN GIAO HÀNG & LIÊN HỆ */}
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

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Thời gian đặt</span>
                <span className={styles.infoValue}>
                  {formatDateTime(order.createdAt)}
                </span>
              </div>

              {order.note && (
                <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                  <span className={styles.infoLabel}>Ghi chú</span>
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
                  {order.paymentMethod === 'cod'
                    ? 'Thanh toán tiền mặt khi nhận hàng (COD)'
                    : order.paymentMethod}
                </span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Trạng thái thanh toán</span>
                <span className={styles.infoValue}>
                  {order.paymentStatus === 'unpaid'
                    ? 'Chưa thanh toán (Thanh toán khi nhận kiện hàng)'
                    : 'Đã thanh toán'}
                </span>
              </div>
            </div>
          </section>

          {/* 3. DANH SÁCH SẢN PHẨM */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Chi Tiết Sản Phẩm ({order.items.length})
            </h2>

            <ul className={styles.itemsList}>
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
              <span className={styles.grandTotalLabel}>Tổng số tiền</span>
              <span className={styles.grandTotalValue}>
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className={styles.actionButtons}>
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/orders')}
          >
            Xem Đơn Hàng Của Tôi
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate('/products')}
          >
            Tiếp Tục Mua Sắm
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={() => navigate('/')}
          >
            Quay Về Trang Chủ
          </Button>
        </div>
      </div>
    </main>
  )
}

export default OrderSuccessPage
