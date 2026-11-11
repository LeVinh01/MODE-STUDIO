import React, { useMemo } from 'react'
import type { OrderStatus } from '@/types/order'
import styles from './OrderStatusChart.module.scss'

interface OrderStatusChartProps {
  ordersByStatus: Record<OrderStatus, number>
}

interface StatusConfig {
  key: OrderStatus
  label: string
  color: string
}

const STATUS_CONFIGS: StatusConfig[] = [
  { key: 'pending', label: 'Chờ xử lý', color: '#d97706' },
  { key: 'confirmed', label: 'Đã xác nhận', color: '#2563eb' },
  { key: 'shipping', label: 'Đang giao', color: '#6366f1' },
  { key: 'delivered', label: 'Đã giao', color: '#16a34a' },
  { key: 'cancelled', label: 'Đã hủy', color: '#dc2626' },
]

export const OrderStatusChart: React.FC<OrderStatusChartProps> = ({ ordersByStatus }) => {
  const { totalOrders, segments } = useMemo(() => {
    const total = Object.values(ordersByStatus || {}).reduce((acc, cur) => acc + (cur || 0), 0)

    const radius = 65
    const circumference = 2 * Math.PI * radius
    let accumulatedOffset = 0
    const items = []

    for (const cfg of STATUS_CONFIGS) {
      const count = ordersByStatus?.[cfg.key] || 0
      const fraction = total > 0 ? count / total : 0
      const strokeLength = fraction * circumference
      const dashArray = `${strokeLength} ${circumference}`
      const dashOffset = -accumulatedOffset

      accumulatedOffset += strokeLength

      items.push({
        ...cfg,
        count,
        percent: Math.round(fraction * 100),
        dashArray,
        dashOffset,
      })
    }

    return { totalOrders: total, segments: items }
  }, [ordersByStatus])

  const radius = 65
  const strokeWidth = 24
  const size = 170
  const center = size / 2

  return (
    <div className={styles.card}>
      <div className={styles.titleArea}>
        <h3 className={styles.title}>Trạng thái đơn hàng</h3>
        <p className={styles.subtitle}>Phân bổ theo ngày tạo đơn</p>
      </div>

      <div className={styles.chartBody}>
        <div className={styles.donutWrapper}>
          <svg className={styles.donutSvg} viewBox={`0 0 ${size} ${size}`}>
            {/* Vòng nền xám nhạt */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="var(--color-gray-100)"
              strokeWidth={strokeWidth}
            />

            {/* Các phân đoạn trạng thái */}
            {totalOrders > 0 ? (
              segments.map((seg) => {
                if (seg.count === 0) return null
                return (
                  <circle
                    key={seg.key}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset={seg.dashOffset}
                    strokeLinecap="butt"
                  />
                )
              })
            ) : (
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke="var(--color-gray-200)"
                strokeWidth={strokeWidth}
              />
            )}
          </svg>

          <div className={styles.donutCenter}>
            <span className={styles.centerTotal}>{totalOrders.toLocaleString('vi-VN')}</span>
            <span className={styles.centerLabel}>Tổng đơn tạo</span>
          </div>
        </div>

        {/* Danh sách nhãn trạng thái */}
        <div className={styles.legendList}>
          {segments.map((seg) => (
            <div key={seg.key} className={styles.legendItem}>
              <div className={styles.legendLeft}>
                <span className={styles.legendDot} style={{ backgroundColor: seg.color }} />
                <span className={styles.legendName}>{seg.label}</span>
              </div>
              <div className={styles.legendRight}>
                <span className={styles.legendCount}>{seg.count.toLocaleString('vi-VN')}</span>
                <span className={styles.legendPercent}>{seg.percent}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chú thích bắt buộc theo yêu cầu nghiệp vụ */}
      <div className={styles.footerNote}>
        * Tính theo ngày tạo đơn, nên có thể lệch vài đơn so với số đơn đã giao trong kỳ.
      </div>
    </div>
  )
}

export default OrderStatusChart
