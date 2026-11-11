import React from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  PackageCheck,
  Receipt,
  Users,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import type { AdminDashboardSummaryData } from '@/types/adminDashboard'
import { formatCurrency } from '@/utils/formatters'
import styles from './KpiCards.module.scss'

interface KpiCardsProps {
  summary: AdminDashboardSummaryData
}

export const KpiCards: React.FC<KpiCardsProps> = ({ summary }) => {
  return (
    <div className={styles.grid}>
      {/* 1. Doanh thu */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Doanh thu</span>
          <div className={styles.iconWrapper}>
            <TrendingUp />
          </div>
        </div>
        <div className={styles.cardValue}>{formatCurrency(summary.revenue)}</div>
        <div className={styles.cardFooter}>
          <span>Đơn đã giao trong kỳ</span>
        </div>
      </div>

      {/* 2. Đơn đã giao */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Đơn đã giao</span>
          <div className={styles.iconWrapper}>
            <PackageCheck />
          </div>
        </div>
        <div className={styles.cardValue}>{summary.delivered_orders_count.toLocaleString('vi-VN')}</div>
        <div className={styles.cardFooter}>
          <span>Tổng đặt: {summary.orders_count.toLocaleString('vi-VN')} đơn</span>
        </div>
      </div>

      {/* 3. Giá trị đơn TB */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Giá trị đơn TB</span>
          <div className={styles.iconWrapper}>
            <Receipt />
          </div>
        </div>
        <div className={styles.cardValue}>{formatCurrency(summary.average_order_value)}</div>
        <div className={styles.cardFooter}>
          <span>Doanh thu / đơn đã giao</span>
        </div>
      </div>

      {/* 4. Khách hàng mới */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Khách hàng mới</span>
          <div className={styles.iconWrapper}>
            <Users />
          </div>
        </div>
        <div className={styles.cardValue}>{summary.new_customers_count.toLocaleString('vi-VN')}</div>
        <div className={styles.cardFooter}>
          <span>Đăng ký mới trong kỳ</span>
        </div>
      </div>

      {/* 5. Tồn kho thấp */}
      <div className={`${styles.card} ${summary.low_stock_variants_count > 0 ? styles.warning : ''}`}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Sắp hết hàng</span>
          <div className={`${styles.iconWrapper} ${summary.low_stock_variants_count > 0 ? styles.warning : ''}`}>
            <AlertTriangle />
          </div>
        </div>
        <div className={styles.cardValue}>{summary.low_stock_variants_count.toLocaleString('vi-VN')}</div>
        <div className={styles.cardFooter}>
          <span>≤ ngưỡng tồn</span>
          <Link to="/admin/inventory" className={styles.cardLink}>
            Xem kho <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default KpiCards
