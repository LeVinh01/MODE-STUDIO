import React, { useState } from 'react'
import type { DashboardTopProducts as DashboardTopProductsType } from '@/types/adminDashboard'
import { formatCurrency } from '@/utils/formatters'
import styles from './DashboardTopProducts.module.scss'

interface DashboardTopProductsProps {
  data: DashboardTopProductsType
}

export const DashboardTopProducts: React.FC<DashboardTopProductsProps> = ({ data }) => {
  const [tab, setTab] = useState<'quantity' | 'revenue'>('quantity')

  const items = tab === 'quantity' ? data?.by_quantity || [] : data?.by_revenue || []
  const maxVal = Math.max(
    ...(items.map((it) => (tab === 'quantity' ? it.total_quantity : it.total_revenue)) || [1]),
    1,
  )

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Top 5 Sản Phẩm Bán Chạy</h3>
          <p className={styles.subtitle}>Hiệu suất sản phẩm từ các đơn đã giao thành công</p>
        </div>

        <div className={styles.tabGroup}>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'quantity' ? styles.active : ''}`}
            onClick={() => setTab('quantity')}
          >
            Số lượng
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${tab === 'revenue' ? styles.active : ''}`}
            onClick={() => setTab('revenue')}
          >
            Doanh thu
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>Chưa có dữ liệu sản phẩm trong kỳ.</div>
      ) : (
        <div className={styles.list}>
          {items.map((prod, index) => {
            const currentVal = tab === 'quantity' ? prod.total_quantity : prod.total_revenue
            const barPct = Math.min(100, Math.max(8, (currentVal / maxVal) * 100))

            return (
              <div key={prod.product_id ?? index} className={styles.itemRow}>
                <div className={styles.rankBadge}>{index + 1}</div>

                <div className={styles.imageCol}>
                  {prod.image_url ? (
                    <img
                      src={prod.image_url}
                      alt={prod.product_name}
                      className={styles.productImg}
                    />
                  ) : (
                    <div className={styles.imgPlaceholder}>―</div>
                  )}
                </div>

                <div className={styles.contentCol}>
                  <div className={styles.nameRow}>
                    <span className={styles.productName} title={prod.product_name}>
                      {prod.product_name}
                    </span>
                    <span className={styles.valLabel}>
                      {tab === 'quantity'
                        ? `${prod.total_quantity.toLocaleString('vi-VN')} chiếc`
                        : formatCurrency(prod.total_revenue)}
                    </span>
                  </div>

                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>

                  <div className={styles.subInfo}>
                    {tab === 'quantity' ? (
                      <span>Doanh thu: {formatCurrency(prod.total_revenue)}</span>
                    ) : (
                      <span>Đã bán: {prod.total_quantity.toLocaleString('vi-VN')} chiếc</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
