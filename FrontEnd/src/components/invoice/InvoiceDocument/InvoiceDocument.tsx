import React from 'react'
import { Link } from 'react-router-dom'
import { Printer, ArrowLeft, AlertTriangle } from 'lucide-react'
import { BRAND_NAME } from '@/config/brand'
import { STORE_INFO, STORE_POLICIES } from '@/config/store'
import {
  getOrderStatusBadge,
  getPaymentStatusBadge,
  getPaymentMethodLabel,
} from '@/config/orderStatus'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import styles from './InvoiceDocument.module.scss'

export interface InvoiceItemData {
  id?: number | string
  productName: string
  sku?: string | null
  colorName?: string | null
  sizeName?: string | null
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface InvoiceCustomerInfo {
  fullName?: string
  email?: string
  phone?: string | null
}

export interface InvoiceOrderData {
  orderCode: string
  status: string
  paymentMethod: string
  paymentStatus: string
  recipientName: string
  recipientPhone: string
  shippingAddress: string
  note?: string | null
  carrier?: string | null
  trackingCode?: string | null
  subtotal: number
  shippingFee: number
  discountAmount?: number
  totalAmount: number
  cancelReason?: string | null
  cancelledAt?: string | null
  paidAt?: string | null
  createdAt: string
  customer?: InvoiceCustomerInfo | null
  items: InvoiceItemData[]
}

export interface InvoiceDocumentProps {
  order: InvoiceOrderData
  backUrl?: string
  backLabel?: string
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  order,
  backUrl,
  backLabel = 'Quay lại chi tiết đơn hàng',
}) => {
  const isCancelled = order.status === 'cancelled'
  const orderStatusBadge = getOrderStatusBadge(order.status)
  const paymentStatusBadge = getPaymentStatusBadge(order.paymentStatus)
  const paymentMethodLabel = getPaymentMethodLabel(order.paymentMethod)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className={styles.invoiceScreenWrapper}>
      {/* 1. THANH ĐIỀU KHIỂN TRÊN MÀN HÌNH (Ẩn hoàn toàn khi in @media print) */}
      <aside className={styles.screenActions} aria-label="Thao tác hóa đơn">
        <div className={styles.actionsLeft}>
          {backUrl && (
            <Link to={backUrl} className={styles.backButton}>
              <ArrowLeft size={16} aria-hidden="true" />
              <span>{backLabel}</span>
            </Link>
          )}
        </div>

        <div className={styles.actionsRight}>
          <button
            type="button"
            onClick={handlePrint}
            className={styles.printButton}
            aria-label="In hóa đơn hoặc lưu dưới dạng PDF"
          >
            <Printer size={16} aria-hidden="true" />
            <span>In hóa đơn</span>
          </button>
        </div>
      </aside>

      {/* 2. KHUNG HÓA ĐƠN KHỔ A4 (In chuẩn @page { size: A4 portrait; margin: 12mm }) */}
      <article className={styles.invoiceSheet} id="invoice-sheet">
        {/* Dấu chìm ĐÃ HỦY cho đơn hàng bị hủy */}
        {isCancelled && (
          <div className={styles.cancelledStamp} aria-label="Đơn hàng đã hủy">
            <div className={styles.stampBorder}>
              <span className={styles.stampTitle}>ĐÃ HỦY</span>
              {order.cancelReason && (
                <span className={styles.stampReason}>
                  Lý do: {order.cancelReason}
                </span>
              )}
              {order.cancelledAt && (
                <span className={styles.stampDate}>
                  Ngày hủy: {formatDateTime(order.cancelledAt)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* PHẦN ĐẦU HÓA ĐƠN: THÔNG TIN CỬA HÀNG & TIÊU ĐỀ */}
        <header className={styles.header}>
          <div className={styles.shopBlock}>
            <div className={styles.brandTitle}>{BRAND_NAME}</div>
            <div className={styles.shopSlogan}>{STORE_POLICIES.slogan}</div>
            <div className={styles.shopContact}>
              <p>
                <strong>Địa chỉ:</strong> {STORE_INFO.address}
              </p>
              <p>
                <strong>Hotline:</strong> {STORE_INFO.hotline} |{' '}
                <strong>Email:</strong> {STORE_INFO.email}
              </p>
            </div>
          </div>

          <div className={styles.invoiceMetaBlock}>
            <h1 className={styles.invoiceTitle}>HÓA ĐƠN BÁN HÀNG</h1>
            <div className={styles.orderCodeBadge}>#{order.orderCode}</div>

            <table className={styles.metaTable}>
              <tbody>
                <tr>
                  <td>Ngày đặt:</td>
                  <td>
                    <strong>{formatDateTime(order.createdAt)}</strong>
                  </td>
                </tr>
                <tr>
                  <td>Trạng thái:</td>
                  <td>
                    <span
                      className={`${styles.statusText} ${
                        isCancelled ? styles.statusCancelled : styles.statusActive
                      }`}
                    >
                      {orderStatusBadge.label}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Phương thức:</td>
                  <td>{paymentMethodLabel}</td>
                </tr>
                <tr>
                  <td>Thanh toán:</td>
                  <td>
                    <span
                      className={
                        order.paymentStatus === 'paid'
                          ? styles.paymentPaid
                          : order.paymentStatus === 'refund_pending'
                            ? styles.paymentRefundPending
                            : order.paymentStatus === 'refunded'
                              ? styles.paymentRefunded
                              : styles.paymentUnpaid
                      }
                    >
                      {paymentStatusBadge.label}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </header>

        {isCancelled && (
          <div className={styles.cancelledAlertNotice} role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>
              <strong>Lưu ý:</strong> Đơn hàng này đã bị hủy vào{' '}
              {formatDateTime(order.cancelledAt || order.createdAt)}. Hóa đơn chỉ có giá trị lưu trữ đối chiếu.
            </span>
          </div>
        )}

        {/* KHỐI THÔNG TIN KHÁCH HÀNG & VẬN CHUYỂN */}
        <section className={styles.customerGrid} aria-label="Thông tin khách hàng và giao nhận">
          <div className={styles.infoCol}>
            <h2 className={styles.colHeading}>THÔNG TIN KHÁCH HÀNG</h2>
            <div className={styles.colContent}>
              <p>
                <span className={styles.label}>Người nhận:</span>{' '}
                <strong className={styles.valueHighlight}>{order.recipientName}</strong>
              </p>
              <p>
                <span className={styles.label}>Số điện thoại:</span>{' '}
                <span className={styles.value}>{order.recipientPhone}</span>
              </p>
              <p>
                <span className={styles.label}>Địa chỉ giao hàng:</span>{' '}
                <span className={styles.value}>{order.shippingAddress}</span>
              </p>
              {order.customer?.email && (
                <p>
                  <span className={styles.label}>Tài khoản:</span>{' '}
                  <span className={styles.value}>
                    {order.customer.fullName || order.recipientName} ({order.customer.email})
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className={styles.infoCol}>
            <h2 className={styles.colHeading}>THÔNG TIN GIAO NHẬN</h2>
            <div className={styles.colContent}>
              <p>
                <span className={styles.label}>Đơn vị vận chuyển:</span>{' '}
                <span className={styles.value}>{order.carrier || 'Chưa bàn giao'}</span>
              </p>
              <p>
                <span className={styles.label}>Mã vận đơn:</span>{' '}
                <span className={styles.value}>{order.trackingCode || 'Chưa cập nhật'}</span>
              </p>
              {order.paidAt && (
                <p>
                  <span className={styles.label}>Thời điểm thanh toán:</span>{' '}
                  <span className={styles.value}>{formatDateTime(order.paidAt)}</span>
                </p>
              )}
              <p>
                <span className={styles.label}>Ghi chú:</span>{' '}
                <span className={styles.value}>{order.note || 'Không có ghi chú'}</span>
              </p>
            </div>
          </div>
        </section>

        {/* BẢNG CHI TIẾT SẢN PHẨM (SNAPSHOT ORDER_ITEMS) */}
        <section className={styles.tableSection} aria-label="Chi tiết sản phẩm">
          <div className={styles.tableResponsive}>
            <table className={styles.itemsTable}>
              <thead>
                <tr>
                  <th style={{ width: '38px', textAlign: 'center' }}>STT</th>
                  <th style={{ textAlign: 'left' }}>Tên sản phẩm</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Phân loại</th>
                  <th style={{ width: '50px', textAlign: 'center' }}>SL</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, index) => {
                    const variantText =
                      [item.colorName, item.sizeName].filter(Boolean).join(' / ') ||
                      'Tiêu chuẩn'
                    return (
                      <tr key={item.id ?? index}>
                        <td style={{ textAlign: 'center' }}>{index + 1}</td>
                        <td>
                          <div className={styles.productName}>{item.productName}</div>
                          {item.sku && (
                            <div className={styles.skuText}>SKU: {item.sku}</div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>{variantText}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(item.lineTotal)}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '16px' }}>
                      Không có thông tin sản phẩm
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* BẢNG TỔNG KẾT TIỀN HÓA ĐƠN */}
        <section className={styles.summarySection} aria-label="Tổng kết thanh toán">
          <div className={styles.summarySpacer} />
          <div className={styles.summaryCard}>
            <div className={styles.summaryRow}>
              <span>Tạm tính tiền hàng:</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>

            <div className={styles.summaryRow}>
              <span>Phí vận chuyển:</span>
              <span>
                {order.shippingFee === 0 ? 'Miễn phí' : formatCurrency(order.shippingFee)}
              </span>
            </div>

            {(order.discountAmount || 0) > 0 && (
              <div className={`${styles.summaryRow} ${styles.discountRow}`}>
                <span>Giảm giá:</span>
                <span>-{formatCurrency(order.discountAmount || 0)}</span>
              </div>
            )}

            <div className={`${styles.summaryRow} ${styles.totalRow}`}>
              <span>TỔNG CỘNG THANH TOÁN:</span>
              <span className={styles.totalAmount}>{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </section>

        {/* CHỮ KÝ XÁC NHẬN */}
        <section className={styles.signaturesSection} aria-label="Xác nhận chữ ký">
          <div className={styles.signatureBox}>
            <div className={styles.signTitle}>KHÁCH HÀNG NHẬN HÀNG</div>
            <div className={styles.signNote}>(Ký và ghi rõ họ tên)</div>
            <div className={styles.signSpace} />
            <div className={styles.signName}>{order.recipientName}</div>
          </div>

          <div className={styles.signatureBox}>
            <div className={styles.signTitle}>ĐẠI DIỆN {BRAND_NAME}</div>
            <div className={styles.signNote}>(Ký và đóng dấu)</div>
            <div className={styles.signSpace} />
            <div className={styles.signName}>{BRAND_NAME} Official</div>
          </div>
        </section>

        {/* LỜI CẢM ƠN VÀ CHÍNH SÁCH ĐỔI TRẢ */}
        <footer className={styles.footerNote}>
          <p className={styles.thankYouText}>
            Cảm ơn quý khách đã tin tưởng và lựa chọn sản phẩm may đo thiết kế cao cấp của {BRAND_NAME}!
          </p>
          <p className={styles.policyText}>
            * <strong>Chính sách đổi trả:</strong> Quý khách được hỗ trợ đổi size / đổi mẫu trong vòng{' '}
            {STORE_POLICIES.returnPeriodDays} ngày kể từ ngày nhận hàng (sản phẩm giữ nguyên tem mác, chưa qua sử dụng).
            Mọi thắc mắc xin liên hệ Hotline: {STORE_INFO.hotline} hoặc Email: {STORE_INFO.email}.
          </p>
        </footer>
      </article>
    </div>
  )
}

export default InvoiceDocument
