import React from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import type { AdminDashboardTopProductItem } from '@/types/adminDashboard'
import { formatCurrency } from '@/utils/formatters'
import styles from './TopProductsTable.module.scss'

interface TopProductsTableProps {
  products: AdminDashboardTopProductItem[]
  isLoading?: boolean
}

export const TopProductsTable: React.FC<TopProductsTableProps> = ({ products }) => {
  const getRankClass = (idx: number) => {
    if (idx === 0) return styles.rank1
    if (idx === 1) return styles.rank2
    if (idx === 2) return styles.rank3
    return ''
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>Top 5 sản phẩm bán chạy</h3>
          <p className={styles.subtitle}>Tổng hợp từ các đơn hàng đã giao thành công trong kỳ</p>
        </div>
      </div>

      {products.length === 0 ? (
        <div className={styles.emptyState}>Chưa có dữ liệu bán hàng trong kỳ này</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th} style={{ width: '60px' }}>
                  Hạng
                </th>
                <th className={styles.th}>Sản phẩm</th>
                <th className={styles.th} style={{ width: '130px' }}>
                  Số lượng bán
                </th>
                <th className={styles.th} style={{ width: '180px' }}>
                  Doanh thu mang lại
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((item, idx) => (
                <tr key={item.product_id ?? idx} className={styles.tr}>
                  <td className={styles.td}>
                    <span className={`${styles.rankBadge} ${getRankClass(idx)}`}>{idx + 1}</span>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.productCell}>
                      <img
                        src={item.image_url || 'https://placehold.co/80x100/f3f4f6/9ca3af?text=No+Image'}
                        alt={item.product_name}
                        className={styles.thumbnail}
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src =
                            'https://placehold.co/80x100/f3f4f6/9ca3af?text=No+Image'
                        }}
                      />
                      <div className={styles.productInfo}>
                        {item.product_id ? (
                          <Link
                            to={`/admin/products/${item.product_id}/edit`}
                            className={styles.productName}
                          >
                            <span>{item.product_name}</span>
                            <ExternalLink size={12} />
                          </Link>
                        ) : (
                          <span className={styles.productName}>
                            {item.product_name}
                            <span className={styles.deletedBadge}>(Đã xóa)</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.quantity}>
                      {item.total_quantity.toLocaleString('vi-VN')} chiếc
                    </span>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.revenue}>{formatCurrency(item.total_revenue)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default TopProductsTable
