import React, { useState } from 'react'
import type { DashboardCategoryRevenueData } from '@/types/adminDashboard'
import { formatCurrency } from '@/utils/formatters'
import styles from './DashboardCategoryRevenue.module.scss'

interface DashboardCategoryRevenueProps {
  categoryData?: DashboardCategoryRevenueData
}

export const DashboardCategoryRevenue: React.FC<DashboardCategoryRevenueProps> = ({
  categoryData,
}) => {
  const [mode, setMode] = useState<'root' | 'leaf'>('root')

  const rows = mode === 'root'
    ? categoryData?.root_groups || []
    : categoryData?.leaf_categories || []

  const totalDeliveredRevenue = categoryData?.total_delivered_revenue || 0
  const totalUnitsSold = categoryData?.total_units_sold || 0

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Doanh Thu Theo Danh Mục Sản Phẩm</h3>
          <p className={styles.subtitle}>
            Bảng xếp hạng đóng góp doanh thu của từng ngành hàng từ các đơn giao thành công
          </p>
        </div>

        {/* Toggle Root groups vs Leaf categories */}
        <div className={styles.toggleGroup} role="group" aria-label="Chế độ xem danh mục">
          <button
            type="button"
            className={`${styles.toggleBtn} ${mode === 'root' ? styles.active : ''}`}
            onClick={() => setMode('root')}
          >
            Nhóm chính (Nam / Nữ / Phụ kiện)
          </button>
          <button
            type="button"
            className={`${styles.toggleBtn} ${mode === 'leaf' ? styles.active : ''}`}
            onClick={() => setMode('leaf')}
          >
            Theo loại sản phẩm
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>
          Chưa có dữ liệu doanh thu theo danh mục trong khoảng thời gian này.
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.colRank}>Hạng</th>
                <th className={styles.colName}>Danh mục</th>
                <th className={styles.colUnits}>Sản lượng</th>
                <th className={styles.colRevenue}>Doanh thu</th>
                <th className={styles.colShare}>Tỷ trọng</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isTop = row.rank <= 3
                return (
                  <tr key={row.category_id ?? row.category_name}>
                    <td className={styles.colRank}>
                      <span className={`${styles.rankBadge} ${isTop ? styles.topRank : ''}`}>
                        {row.rank}
                      </span>
                    </td>
                    <td className={styles.colName}>{row.category_name}</td>
                    <td className={styles.colUnits}>
                      {row.units_sold.toLocaleString('vi-VN')}
                    </td>
                    <td className={styles.colRevenue}>
                      {formatCurrency(row.revenue)}
                    </td>
                    <td className={styles.colShare}>
                      <div className={styles.shareCell}>
                        <div className={styles.shareTrack}>
                          <div
                            className={styles.shareFill}
                            style={{ width: `${Math.min(100, Math.max(2, row.percent))}%` }}
                          />
                        </div>
                        <span className={styles.shareText}>{row.percent.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className={styles.tableFooter}>
                <td colSpan={2}>Tổng cộng (Đơn đã giao)</td>
                <td className={styles.colUnits}>
                  {totalUnitsSold.toLocaleString('vi-VN')}
                </td>
                <td className={styles.colRevenue}>
                  {formatCurrency(totalDeliveredRevenue)}
                </td>
                <td className={styles.colShare}>
                  <div className={styles.shareCell}>
                    <div className={styles.shareTrack}>
                      <div className={styles.shareFill} style={{ width: '100%' }} />
                    </div>
                    <span className={styles.shareText}>100.0%</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
