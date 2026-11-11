import React, { useState, useRef, useMemo } from 'react'
import type { AdminDashboardRevenueData } from '@/types/adminDashboard'
import { formatCurrency, formatDate } from '@/utils/formatters'
import styles from './RevenueChart.module.scss'

interface RevenueChartProps {
  data: AdminDashboardRevenueData
  groupBy: 'day' | 'month'
  onGroupByChange: (groupBy: 'day' | 'month') => void
  isLoading?: boolean
}

type MetricType = 'revenue' | 'orders'

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  groupBy,
  onGroupByChange,
  isLoading = false,
}) => {
  const [metric, setMetric] = useState<MetricType>('revenue')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const timeline = useMemo(() => data.timeline || [], [data.timeline])

  // Kích thước SVG cố định theo hệ tọa độ viewBox
  const svgWidth = 800
  const svgHeight = 300
  const padding = { top: 25, right: 30, bottom: 40, left: 65 }
  const chartWidth = svgWidth - padding.left - padding.right
  const chartHeight = svgHeight - padding.top - padding.bottom

  // Tính max value cho thang đo Y
  const { maxVal, points, allZero } = useMemo(() => {
    if (timeline.length === 0) {
      return { maxVal: 100, points: [], allZero: true }
    }

    const values = timeline.map((item) =>
      metric === 'revenue' ? item.revenue : item.orders_count,
    )
    const rawMax = Math.max(...values, 0)
    const allZero = rawMax === 0

    // Đệm 15% lên đỉnh để đường biểu đồ không bị dính sát mép trên
    const baseMax = allZero ? (metric === 'revenue' ? 10000000 : 10) : rawMax
    // Làm tròn maxVal lên mốc đẹp
    let niceMax = baseMax
    if (metric === 'revenue') {
      const magnitude = Math.pow(10, Math.floor(Math.log10(baseMax)))
      niceMax = Math.ceil((baseMax * 1.15) / magnitude) * magnitude
    } else {
      niceMax = Math.max(Math.ceil(baseMax * 1.2), 4)
    }

    const n = timeline.length
    const points = timeline.map((item, i) => {
      const val = metric === 'revenue' ? item.revenue : item.orders_count
      const x = padding.left + (n > 1 ? (i / (n - 1)) * chartWidth : chartWidth / 2)
      const y = padding.top + chartHeight - (val / niceMax) * chartHeight
      return { x, y, val, item }
    })

    return { maxVal: niceMax, points, allZero }
  }, [timeline, metric, chartWidth, chartHeight, padding.left, padding.top])

  // Tạo đường dẫn SVG Path (line và area)
  const { linePathData, areaPathData } = useMemo(() => {
    if (points.length === 0) return { linePathData: '', areaPathData: '' }
    if (points.length === 1) {
      const p = points[0]
      const line = `M ${padding.left} ${p.y} L ${padding.left + chartWidth} ${p.y}`
      const area = `M ${padding.left} ${p.y} L ${padding.left + chartWidth} ${p.y} L ${padding.left + chartWidth} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`
      return { linePathData: line, areaPathData: area }
    }

    const first = points[0]
    let path = `M ${first.x} ${first.y}`

    // Dùng đường polyline mịn hoặc bezier
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`
    }

    const last = points[points.length - 1]
    const area = `${path} L ${last.x} ${padding.top + chartHeight} L ${first.x} ${padding.top + chartHeight} Z`

    return { linePathData: path, areaPathData: area }
  }, [points, chartWidth, chartHeight, padding.left, padding.top])

  // Các mốc trục Y (4 mức: 0, 1/3, 2/3, max)
  const yTicks = useMemo(() => {
    const ticks = []
    const count = 4
    for (let i = 0; i <= count; i++) {
      const val = (maxVal / count) * i
      const y = padding.top + chartHeight - (i / count) * chartHeight
      let label: string
      if (metric === 'revenue') {
        if (val === 0) label = '0 ₫'
        else if (val >= 1000000) label = `${(val / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`
        else label = `${(val / 1000).toLocaleString('vi-VN')} k`
      } else {
        label = `${Math.round(val)}`
      }
      ticks.push({ y, val, label })
    }
    return ticks
  }, [maxVal, chartHeight, padding.top, metric])

  // Xử lý hover tìm điểm gần nhất
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (points.length === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clientX = e.clientX - rect.left
    const svgX = (clientX / rect.width) * svgWidth

    // Tìm điểm gần nhất
    let closestIdx = 0
    let minDiff = Infinity
    points.forEach((p, idx) => {
      const diff = Math.abs(p.x - svgX)
      if (diff < minDiff) {
        minDiff = diff
        closestIdx = idx
      }
    })

    setHoveredIndex(closestIdx)
  }

  const handleMouseLeave = () => {
    setHoveredIndex(null)
  }

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null

  // Tính vị trí tooltip theo % relative container
  const tooltipStyle = useMemo(() => {
    if (!activePoint) return null
    const leftPercent = (activePoint.x / svgWidth) * 100
    const topPercent = (activePoint.y / svgHeight) * 100
    return {
      left: `${leftPercent}%`,
      top: `${topPercent}%`,
    }
  }, [activePoint, svgWidth, svgHeight])

  // Lọc nhãn trục X để không bị dày chữ
  const stepLabel = useMemo(() => {
    if (timeline.length <= 8) return 1
    if (timeline.length <= 16) return 2
    if (timeline.length <= 31) return Math.ceil(timeline.length / 7)
    return Math.ceil(timeline.length / 10)
  }, [timeline.length])

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>Biểu đồ doanh thu & đơn hàng</h3>
          <p className={styles.subtitle}>
            {metric === 'revenue' ? 'Doanh thu từ các đơn đã giao' : 'Số lượng đơn hàng đã giao thành công'}
          </p>
        </div>

        <div className={styles.controls}>
          {/* Toggle metric */}
          <div className={styles.toggleGroup}>
            <button
              type="button"
              className={`${styles.toggleBtn} ${metric === 'revenue' ? styles.active : ''}`}
              onClick={() => setMetric('revenue')}
            >
              Doanh thu
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${metric === 'orders' ? styles.active : ''}`}
              onClick={() => setMetric('orders')}
            >
              Số đơn
            </button>
          </div>

          {/* Toggle group_by */}
          <div className={styles.toggleGroup}>
            <button
              type="button"
              className={`${styles.toggleBtn} ${groupBy === 'day' ? styles.active : ''}`}
              onClick={() => onGroupByChange('day')}
              disabled={isLoading}
            >
              Ngày
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${groupBy === 'month' ? styles.active : ''}`}
              onClick={() => onGroupByChange('month')}
              disabled={isLoading}
            >
              Tháng
            </button>
          </div>
        </div>
      </div>

      <div className={styles.chartContainer} ref={containerRef}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Lưới ngang và nhãn trục Y */}
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
                y={tick.y + 4}
                textAnchor="end"
                className={styles.axisText}
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Vùng bóng mờ bên dưới đường biểu đồ */}
          {areaPathData && <path d={areaPathData} className={styles.areaPath} />}

          {/* Đường biểu đồ chính */}
          {linePathData && <path d={linePathData} className={styles.linePath} />}

          {/* Nhãn mốc trục X */}
          {points.map((p, idx) => {
            const isVisible = idx === 0 || idx === points.length - 1 || idx % stepLabel === 0
            if (!isVisible) return null
            return (
              <text
                key={idx}
                x={p.x}
                y={padding.top + chartHeight + 22}
                textAnchor="middle"
                className={styles.axisText}
              >
                {p.item.label}
              </text>
            )
          })}

          {/* Hover guideline & point */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={padding.top}
                x2={activePoint.x}
                y2={padding.top + chartHeight}
                className={styles.guideline}
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={5.5}
                className={styles.pointActive}
              />
            </g>
          )}
        </svg>

        {/* Hover Tooltip */}
        {activePoint && tooltipStyle && (
          <div className={styles.tooltip} style={tooltipStyle}>
            <div className={styles.tooltipDate}>
              {groupBy === 'day' ? formatDate(activePoint.item.date) : activePoint.item.label}
            </div>
            <div className={styles.tooltipValue}>
              {metric === 'revenue'
                ? formatCurrency(activePoint.item.revenue)
                : `${activePoint.item.orders_count.toLocaleString('vi-VN')} đơn hàng`}
            </div>
          </div>
        )}

        {/* Empty state notice */}
        {allZero && !isLoading && (
          <div className={styles.emptyOverlay}>
            Chưa có doanh số trong khoảng thời gian này
          </div>
        )}
      </div>
    </div>
  )
}

export default RevenueChart
