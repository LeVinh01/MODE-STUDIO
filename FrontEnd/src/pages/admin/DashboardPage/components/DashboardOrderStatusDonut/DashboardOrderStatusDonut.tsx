import React, { useState, useMemo } from 'react'
import type { DashboardOrderStatusBreakdown } from '@/types/adminDashboard'
import { DASHBOARD_THEME } from '../../dashboardTokens'
import styles from './DashboardOrderStatusDonut.module.scss'

interface DashboardOrderStatusDonutProps {
  breakdown: DashboardOrderStatusBreakdown
}

export const DashboardOrderStatusDonut: React.FC<DashboardOrderStatusDonutProps> = ({
  breakdown,
}) => {
  const [activeStatus, setActiveStatus] = useState<string | null>(null)

  const items = useMemo(() => breakdown?.items || [], [breakdown])
  const totalOrders = breakdown?.total_orders || 0

  // Hero donut geometry: thicker ring (~1.6x of 14px = 22px), large hero radius
  const size = 200
  const center = size / 2
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const strokeWidth = 22

  const segments = useMemo(() => {
    let currentOffset = 0
    const result = []

    for (const item of items) {
      const color =
        DASHBOARD_THEME.status[item.status as keyof typeof DASHBOARD_THEME.status] ||
        DASHBOARD_THEME.neutral

      const fraction = totalOrders > 0 ? item.count / totalOrders : 0
      const strokeLength = fraction * circumference
      const dashArray = `${strokeLength} ${circumference}`
      const dashOffset = -currentOffset
      currentOffset += strokeLength

      result.push({
        ...item,
        color,
        dashArray,
        dashOffset,
      })
    }

    return result
  }, [items, totalOrders, circumference])

  const activeItem = activeStatus ? items.find((it) => it.status === activeStatus) : null
  const displayCount = activeItem ? activeItem.count : totalOrders
  const displayLabel = activeItem ? activeItem.label : 'Tổng đơn'

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Phân Bổ Trạng Thái Đơn Hàng</h3>
        <p className={styles.subtitle}>Tỷ lệ các trạng thái đơn phát sinh trong kỳ</p>
      </div>

      <div className={styles.body}>
        <div className={styles.chartWrapper}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Background ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="var(--admin-border-subtle)"
              strokeWidth={strokeWidth}
            />

            {/* Status segments */}
            {totalOrders > 0 &&
              segments.map((seg) => {
                const isActive = activeStatus === seg.status
                return (
                  <circle
                    key={seg.status}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={isActive ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset={seg.dashOffset}
                    strokeLinecap="butt"
                    transform={`rotate(-90 ${center} ${center})`}
                    className={styles.segment}
                    tabIndex={0}
                    role="button"
                    aria-label={`${seg.label}: ${seg.count} đơn (${seg.percent}%)`}
                    onMouseEnter={() => setActiveStatus(seg.status)}
                    onMouseLeave={() => setActiveStatus(null)}
                    onFocus={() => setActiveStatus(seg.status)}
                    onBlur={() => setActiveStatus(null)}
                  />
                )
              })}
          </svg>

          <div className={styles.donutCenter}>
            <span className={styles.centerNumber}>
              {displayCount.toLocaleString('vi-VN')}
            </span>
            <span className={styles.centerLabel}>{displayLabel}</span>
          </div>
        </div>

        {/* Compact Legend (<= 35% width on desktop) */}
        <div className={styles.legend} role="list">
          {segments.map((seg) => (
            <div
              key={seg.status}
              role="listitem"
              tabIndex={0}
              className={`${styles.legendRow} ${
                activeStatus === seg.status ? styles.active : ''
              }`}
              onMouseEnter={() => setActiveStatus(seg.status)}
              onMouseLeave={() => setActiveStatus(null)}
              onFocus={() => setActiveStatus(seg.status)}
              onBlur={() => setActiveStatus(null)}
              aria-label={`${seg.label}: ${seg.count} đơn, chiếm ${seg.percent}%`}
            >
              <div className={styles.legendLeft}>
                <span
                  className={styles.legendDot}
                  style={{ backgroundColor: seg.color }}
                  aria-hidden="true"
                />
                <span className={styles.legendLabel}>{seg.label}</span>
              </div>
              <div className={styles.legendRight}>
                <span className={styles.legendCount}>
                  {seg.count.toLocaleString('vi-VN')}
                </span>
                <span className={styles.legendPercent}>{seg.percent}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
