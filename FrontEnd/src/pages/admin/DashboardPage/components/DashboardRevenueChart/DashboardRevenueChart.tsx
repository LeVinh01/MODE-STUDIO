import React, { useState, useMemo } from 'react'
import type { DashboardTimeSeries } from '@/types/adminDashboard'
import { formatCurrency, formatDate } from '@/utils/formatters'
import styles from './DashboardRevenueChart.module.scss'

interface DashboardRevenueChartProps {
  timeSeries: DashboardTimeSeries
  isLoading?: boolean
}

export const DashboardRevenueChart: React.FC<DashboardRevenueChartProps> = ({
  timeSeries,
  isLoading = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const timeline = useMemo(() => timeSeries?.timeline || [], [timeSeries])

  // Coordinate system for SVG viewBox
  const svgWidth = 800
  const svgHeight = 260
  const padding = { top: 20, right: 30, bottom: 35, left: 80 }
  const chartWidth = svgWidth - padding.left - padding.right
  const chartHeight = svgHeight - padding.top - padding.bottom

  const { maxVal, points, allZero } = useMemo(() => {
    if (timeline.length === 0) {
      return { maxVal: 10000000, points: [], allZero: true }
    }

    const values = timeline.map((item) => item.revenue)
    const rawMax = Math.max(...values, 0)
    const allZero = rawMax === 0

    const baseMax = allZero ? 10000000 : rawMax
    const magnitude = Math.pow(10, Math.floor(Math.log10(baseMax)) || 1)
    const niceMax = Math.ceil((baseMax * 1.15) / magnitude) * magnitude

    const n = timeline.length
    const points = timeline.map((item, i) => {
      const x = padding.left + (n > 1 ? (i / (n - 1)) * chartWidth : chartWidth / 2)
      const ratio = niceMax > 0 ? item.revenue / niceMax : 0
      const y = padding.top + chartHeight - ratio * chartHeight
      return { x, y, index: i, ...item }
    })

    return { maxVal: niceMax, points, allZero }
  }, [timeline, chartHeight, chartWidth, padding.left, padding.top])

  // Straight line segments (L x y) - NO bezier, no overshoot
  const linePath = useMemo(() => {
    if (points.length === 0) return ''
    if (points.length === 1) {
      return `M ${padding.left} ${points[0].y} L ${padding.left + chartWidth} ${points[0].y}`
    }

    return points.reduce((acc, pt, i) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`
      return `${acc} L ${pt.x} ${pt.y}`
    }, '')
  }, [points, chartWidth, padding.left])

  const areaPath = useMemo(() => {
    if (!linePath || points.length === 0) return ''
    const bottomY = padding.top + chartHeight
    const firstX = points[0].x
    const lastX = points[points.length - 1].x
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`
  }, [linePath, points, chartHeight, padding.top])

  // Nice round Y ticks (5 ticks: 0, 25%, 50%, 75%, 100%)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    value: Math.round(maxVal * pct),
    y: padding.top + chartHeight - pct * chartHeight,
  }))

  // Auto-thinned X-axis labels
  const xLabels = useMemo(() => {
    if (points.length === 0) return []
    const step = Math.max(1, Math.ceil(points.length / 8))
    return points.filter((_, i) => i % step === 0 || i === points.length - 1)
  }, [points])

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null

  const getGranularityLabel = () => {
    if (timeSeries.granularity === 'day') return 'Chu kỳ: Theo ngày'
    if (timeSeries.granularity === 'week') return 'Chu kỳ: Theo tuần'
    return 'Chu kỳ: Theo tháng'
  }

  return (
    <div className={styles.chartCard}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Xu Hướng Doanh Thu</h3>
          <p className={styles.subtitle}>
            Doanh thu ghi nhận từ các đơn hàng giao thành công
          </p>
        </div>
        <div className={styles.granularityBadge}>
          {getGranularityLabel()}
        </div>
      </div>

      <div className={styles.chartWrapper}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="revenueAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y axis */}
          {yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={padding.left + chartWidth}
                y2={tick.y}
                className={styles.gridLine}
              />
              <text
                x={padding.left - 10}
                y={tick.y + 3.5}
                textAnchor="end"
                className={styles.axisText}
              >
                {formatCurrency(tick.value)}
              </text>
            </g>
          ))}

          {/* X axis labels */}
          {xLabels.map((pt, idx) => (
            <text
              key={idx}
              x={pt.x}
              y={padding.top + chartHeight + 20}
              textAnchor="middle"
              className={styles.axisText}
            >
              {pt.label}
            </text>
          ))}

          {/* Area fill */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#revenueAreaGrad)"
              style={{ color: 'var(--admin-text-primary)' }}
            />
          )}

          {/* Straight line stroke */}
          {linePath && <path d={linePath} className={styles.lineStroke} />}

          {/* Hover guideline */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              y1={padding.top}
              x2={hoveredPoint.x}
              y2={padding.top + chartHeight}
              className={styles.hoverLine}
            />
          )}

          {/* Small square markers */}
          {points.length <= 40 &&
            points.map((pt, i) => (
              <rect
                key={i}
                x={pt.x - 2.5}
                y={pt.y - 2.5}
                width={5}
                height={5}
                className={
                  hoveredIndex === i ? styles.markerSquareActive : styles.markerSquare
                }
              />
            ))}

          {/* Interactive invisible hit targets */}
          {points.map((pt, i) => (
            <rect
              key={i}
              x={pt.x - (chartWidth / points.length) / 2}
              y={padding.top}
              width={chartWidth / points.length}
              height={chartHeight}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              aria-label={`${pt.label}: ${formatCurrency(pt.revenue)}`}
            />
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className={styles.tooltip}
            style={{
              left: `${(hoveredPoint.x / svgWidth) * 100}%`,
              top: `${(hoveredPoint.y / svgHeight) * 100}%`,
            }}
          >
            <div className={styles.tooltipDate}>
              {hoveredPoint.date ? formatDate(hoveredPoint.date) : hoveredPoint.label}
            </div>
            <div className={styles.tooltipVal}>
              {formatCurrency(hoveredPoint.revenue)}
            </div>
          </div>
        )}

        {allZero && !isLoading && (
          <div className={styles.emptyOverlay}>
            Không có doanh thu phát sinh trong khoảng thời gian này
          </div>
        )}
      </div>
    </div>
  )
}
