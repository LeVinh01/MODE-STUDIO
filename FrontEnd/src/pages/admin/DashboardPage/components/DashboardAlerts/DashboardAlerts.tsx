import React from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Clock, RotateCcw, ArrowRight } from 'lucide-react'
import type { DashboardAlertItem } from '@/types/adminDashboard'
import styles from './DashboardAlerts.module.scss'

interface DashboardAlertsProps {
  alerts: DashboardAlertItem[]
}

const DESIRED_ORDER = ['low_stock', 'pending_orders', 'refund_pending']

const ALERT_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ size?: number; className?: string }>
    themeClass: string
    defaultTitle: string
    defaultDescription: string
    defaultLink: string
    defaultLinkText: string
  }
> = {
  low_stock: {
    icon: AlertTriangle,
    themeClass: styles.amberAlert,
    defaultTitle: 'Biến thể sắp hết hàng',
    defaultDescription: 'Tồn kho ≤ 10 sản phẩm cần nhập thêm',
    defaultLink: '/admin/inventory',
    defaultLinkText: 'Kiểm tra kho hàng',
  },
  pending_orders: {
    icon: Clock,
    themeClass: styles.blueAlert,
    defaultTitle: 'Đơn hàng chờ xác nhận',
    defaultDescription: 'Đơn mới cần nhân viên duyệt',
    defaultLink: '/admin/orders?status=pending',
    defaultLinkText: 'Xem đơn chờ',
  },
  refund_pending: {
    icon: RotateCcw,
    themeClass: styles.redAlert,
    defaultTitle: 'Đơn chờ hoàn tiền',
    defaultDescription: 'Đơn hủy cần hoàn tiền qua ngân hàng/VNPay',
    defaultLink: '/admin/orders?payment_status=refund_pending',
    defaultLinkText: 'Xử lý hoàn tiền',
  },
}

export const DashboardAlerts: React.FC<DashboardAlertsProps> = ({ alerts = [] }) => {
  // Sort alerts in exact required priority: low_stock -> pending_orders -> refund_pending
  const alertMap = new Map(alerts.map((a) => [a.id, a]))

  const sortedAlerts = DESIRED_ORDER.map((id) => {
    const existing = alertMap.get(id)
    const config = ALERT_CONFIG[id]
    return {
      id,
      title: existing?.title || config.defaultTitle,
      count: existing ? existing.count : 0,
      description: existing?.description || config.defaultDescription,
      severity: existing?.severity || (id === 'refund_pending' ? 'danger' : 'warning'),
      link: existing?.link || config.defaultLink,
      link_text: existing?.link_text || config.defaultLinkText,
    }
  })

  return (
    <section className={styles.section} aria-label="Cảnh báo vận hành">
      <div className={styles.header}>
        <h3 className={styles.title}>Cảnh Báo Vận Hành & Tồn Kho</h3>
        <p className={styles.subtitle}>
          Danh sách tác vụ cần xử lý ngay theo thứ tự ưu tiên vận hành
        </p>
      </div>

      <div className={styles.alertGrid} role="list">
        {sortedAlerts.map((alert) => {
          const config = ALERT_CONFIG[alert.id]
          const Icon = config.icon
          const isZero = alert.count === 0

          return (
            <div
              key={alert.id}
              className={`${styles.alertCard} ${config.themeClass} ${
                isZero ? styles.isZero : ''
              }`}
              role="listitem"
            >
              <div className={styles.cardTop}>
                <div className={styles.iconSquare} aria-hidden="true">
                  <Icon size={16} />
                </div>
                <div className={styles.countBadge} aria-label={`${alert.count} mục`}>
                  {alert.count.toLocaleString('vi-VN')}
                </div>
              </div>

              <div className={styles.cardContent}>
                <h4 className={styles.cardTitle}>{alert.title}</h4>
                <p className={styles.cardHint}>{alert.description}</p>
              </div>

              <div className={styles.cardFooter}>
                <Link to={alert.link} className={styles.actionLink}>
                  <span>{alert.link_text}</span>
                  <ArrowRight size={13} className={styles.arrowIcon} aria-hidden="true" />
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
