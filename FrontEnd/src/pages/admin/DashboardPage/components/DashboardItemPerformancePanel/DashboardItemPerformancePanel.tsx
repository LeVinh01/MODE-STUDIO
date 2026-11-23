import React, { useState, useEffect, useMemo } from 'react'
import { Package, FolderTree } from 'lucide-react'
import type {
  DashboardRange,
  ItemPerformanceData,
  ItemPerformanceTargetType,
} from '@/types/adminDashboard'
import type { AdminCategoryItem } from '@/types/adminCategory'
import adminDashboardService from '@/services/api/adminDashboardService'
import { adminCategoryService } from '@/services/api/adminCategoryService'
import { getApiErrorMessage } from '@/utils/apiError'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { getDeltaDisplay } from '../../dashboardTokens'
import { SearchableCombobox } from '../SearchableCombobox/SearchableCombobox'
import styles from './DashboardItemPerformancePanel.module.scss'

export const DashboardItemPerformancePanel: React.FC = () => {
  const [targetType, setTargetType] = useState<ItemPerformanceTargetType>('product')
  const [targetId, setTargetId] = useState<number | null>(null)
  const [selectedItemName, setSelectedItemName] = useState<string>('')

  // Categories list for combobox
  const [categories, setCategories] = useState<AdminCategoryItem[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState<boolean>(true)

  // Range and granularity
  const [range, setRange] = useState<DashboardRange>('30d')
  const [customFrom, setCustomFrom] = useState<string>('')
  const [customTo, setCustomTo] = useState<string>('')
  const [granularity, setGranularity] = useState<'auto' | 'day' | 'week' | 'month'>('auto')

  // Series mode: revenue vs units
  const [chartSeries, setChartSeries] = useState<'revenue' | 'units'>('revenue')

  // Data & loading state
  const [performanceData, setPerformanceData] = useState<ItemPerformanceData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Hover state for chart
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Load categories for selector
  useEffect(() => {
    let ignore = false

    adminCategoryService
      .getCategories({ all: true })
      .then((catRes) => {
        if (!ignore) {
          setCategories(catRes.categories || [])
          setCategoriesLoading(false)
        }
      })
      .catch(() => {
        if (!ignore) {
          setCategories([])
          setCategoriesLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [])

  // Switch type clears selection
  const handleTypeChange = (newType: ItemPerformanceTargetType) => {
    if (newType === targetType) return
    setTargetType(newType)
    setTargetId(null)
    setSelectedItemName('')
    setPerformanceData(null)
    setError(null)
  }

  // Handle selection from combobox
  const handleSelect = (item: { id: number; name: string }) => {
    setTargetId(item.id)
    setSelectedItemName(item.name)
    setIsLoading(true)
    setError(null)
  }

  const handleClear = () => {
    setTargetId(null)
    setSelectedItemName('')
    setPerformanceData(null)
    setError(null)
  }

  // Fetch performance data when targetId or filters change
  useEffect(() => {
    if (targetId === null) {
      return
    }

    let ignore = false
    Promise.resolve().then(() => {
      if (!ignore) {
        setIsLoading(true)
      }
    })

    adminDashboardService
      .getItemPerformance({
        target_type: targetType,
        target_id: targetId,
        range,
        from: range === 'custom' ? customFrom : undefined,
        to: range === 'custom' ? customTo : undefined,
        granularity,
      })
      .then((data) => {
        if (!ignore) {
          setPerformanceData(data)
          if (data.target_name) {
            setSelectedItemName(data.target_name)
          }
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(getApiErrorMessage(err))
          setIsLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [targetType, targetId, range, customFrom, customTo, granularity])

  // Chart coordinate calculations
  const timeline = useMemo(() => performanceData?.timeline || [], [performanceData])

  const svgWidth = 720
  const svgHeight = 220
  const padding = { top: 20, right: 25, bottom: 30, left: 75 }
  const chartWidth = svgWidth - padding.left - padding.right
  const chartHeight = svgHeight - padding.top - padding.bottom

  const { maxVal, points } = useMemo(() => {
    if (timeline.length === 0) return { maxVal: 1, points: [] }

    const values = timeline.map((it) => (chartSeries === 'revenue' ? it.revenue : it.units_sold))
    const rawMax = Math.max(...values, 0)
    const baseMax = rawMax === 0 ? (chartSeries === 'revenue' ? 10000000 : 10) : rawMax

    const magnitude = Math.pow(10, Math.floor(Math.log10(baseMax)) || 1)
    const niceMax = Math.ceil((baseMax * 1.15) / magnitude) * magnitude

    const n = timeline.length
    const points = timeline.map((item, i) => {
      const val = chartSeries === 'revenue' ? item.revenue : item.units_sold
      const x = padding.left + (n > 1 ? (i / (n - 1)) * chartWidth : chartWidth / 2)
      const ratio = niceMax > 0 ? val / niceMax : 0
      const y = padding.top + chartHeight - ratio * chartHeight
      return { x, y, value: val, ...item }
    })

    return { maxVal: niceMax, points }
  }, [timeline, chartSeries, chartHeight, chartWidth, padding.left, padding.top])

  // Straight line path (L x y)
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

  const yTicks = [0, 0.33, 0.66, 1].map((pct) => ({
    value: Math.round(maxVal * pct),
    y: padding.top + chartHeight - pct * chartHeight,
  }))

  const xLabels = useMemo(() => {
    if (points.length === 0) return []
    const step = Math.max(1, Math.ceil(points.length / 7))
    return points.filter((_, i) => i % step === 0 || i === points.length - 1)
  }, [points])

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null

  // Delta helpers (Single arrow fix: delta.arrow + delta.text)
  const unitsDelta = getDeltaDisplay(performanceData?.delta.units_sold ?? null, 'kỳ trước')
  const revenueDelta = getDeltaDisplay(performanceData?.delta.revenue ?? null, 'kỳ trước')
  const shareDelta = getDeltaDisplay(
    performanceData?.delta.share_of_total_revenue ?? null,
    'kỳ trước',
    false,
    true,
  )

  return (
    <section className={styles.section} aria-label="Hiệu suất theo mặt hàng">
      <header className={styles.header}>
        <h3 className={styles.title}>Hiệu Suất Theo Mặt Hàng</h3>
        <p className={styles.subtitle}>
          Phân tích chuyên sâu sản lượng, doanh thu và tỷ trọng đóng góp của từng sản phẩm hoặc danh mục
        </p>
      </header>

      {/* Controls Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.controlsTop}>
          {/* Target Type Toggle */}
          <div className={styles.targetTypeGroup}>
            <button
              type="button"
              className={`${styles.typeBtn} ${targetType === 'product' ? styles.active : ''}`}
              onClick={() => handleTypeChange('product')}
            >
              Sản phẩm
            </button>
            <button
              type="button"
              className={`${styles.typeBtn} ${targetType === 'category' ? styles.active : ''}`}
              onClick={() => handleTypeChange('category')}
            >
              Danh mục
            </button>
          </div>

          {/* Searchable Combobox */}
          <div className={styles.selectorWrapper}>
            <SearchableCombobox
              targetType={targetType}
              selectedId={targetId}
              selectedName={selectedItemName || performanceData?.target_name}
              categories={categories}
              onSelect={handleSelect}
              onClear={handleClear}
              disabled={targetType === 'category' && categoriesLoading}
            />
          </div>
        </div>

        {/* Presets and Granularity */}
        <div className={styles.presetsRow}>
          <div className={styles.rangeGroup} role="group" aria-label="Khoảng thời gian phân tích">
            {(
              [
                { id: '7d', label: '7 ngày' },
                { id: '30d', label: '30 ngày' },
                { id: '90d', label: '90 ngày' },
                { id: 'this_month', label: 'Tháng này' },
                { id: 'this_quarter', label: 'Quý này' },
                { id: 'this_year', label: 'Năm nay' },
                { id: 'custom', label: 'Tùy chọn' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                className={`${styles.rangeBtn} ${range === p.id ? styles.active : ''}`}
                onClick={() => setRange(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className={styles.granularityGroup} title="Chu kỳ tổng hợp trục thời gian">
            <button
              type="button"
              className={`${styles.granBtn} ${granularity === 'auto' ? styles.active : ''}`}
              onClick={() => setGranularity('auto')}
            >
              Tự động
            </button>
            <button
              type="button"
              className={`${styles.granBtn} ${granularity === 'day' ? styles.active : ''}`}
              onClick={() => setGranularity('day')}
            >
              Ngày
            </button>
            <button
              type="button"
              className={`${styles.granBtn} ${granularity === 'week' ? styles.active : ''}`}
              onClick={() => setGranularity('week')}
            >
              Tuần
            </button>
            <button
              type="button"
              className={`${styles.granBtn} ${granularity === 'month' ? styles.active : ''}`}
              onClick={() => setGranularity('month')}
            >
              Tháng
            </button>
          </div>
        </div>

        {/* Custom date range inputs */}
        {range === 'custom' && (
          <div className={styles.customDateRow}>
            <span>Từ:</span>
            <input
              type="date"
              className={styles.dateInput}
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <span>Đến:</span>
            <input
              type="date"
              className={styles.dateInput}
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className={styles.loadingSpinner}>Đang tải dữ liệu hiệu suất mặt hàng...</div>
      ) : error ? (
        <div className={styles.emptyState}>{error}</div>
      ) : targetId === null ? (
        /* Neutral empty prompt when no item is selected */
        <div className={styles.emptyPrompt}>
          <div className={styles.promptIcon} aria-hidden="true">
            {targetType === 'product' ? <Package size={26} /> : <FolderTree size={26} />}
          </div>
          <h4 className={styles.promptTitle}>
            {targetType === 'product' ? 'Chưa chọn sản phẩm để phân tích' : 'Chưa chọn danh mục để phân tích'}
          </h4>
          <p className={styles.promptText}>
            {targetType === 'product'
              ? 'Vui lòng bấm vào ô tìm kiếm ở góc trên bên phải để chọn hoặc gõ tên sản phẩm cần xem xu hướng doanh thu và sản lượng.'
              : 'Vui lòng chọn một danh mục cụ thể hoặc "Tất cả danh mục" ở góc trên bên phải để xem phân tích số liệu.'}
          </p>
        </div>
      ) : performanceData ? (
        <>
          {/* 3 Summary Metrics Cards */}
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Sản lượng đã bán</span>
              <span className={styles.metricValue}>
                {performanceData.summary.units_sold.toLocaleString('vi-VN')}
              </span>
              <span
                className={`${styles.metricDelta} ${
                  unitsDelta.trendClass === 'positive'
                    ? styles.deltaPositive
                    : unitsDelta.trendClass === 'negative'
                    ? styles.deltaNegative
                    : styles.deltaNeutral
                }`}
              >
                <span className={styles.deltaArrow} aria-hidden="true">{unitsDelta.arrow}</span>
                <span>{unitsDelta.text}</span>
              </span>
            </div>

            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Doanh thu ghi nhận</span>
              <span className={styles.metricValue}>
                {formatCurrency(performanceData.summary.revenue)}
              </span>
              <span
                className={`${styles.metricDelta} ${
                  revenueDelta.trendClass === 'positive'
                    ? styles.deltaPositive
                    : revenueDelta.trendClass === 'negative'
                    ? styles.deltaNegative
                    : styles.deltaNeutral
                }`}
              >
                <span className={styles.deltaArrow} aria-hidden="true">{revenueDelta.arrow}</span>
                <span>{revenueDelta.text}</span>
              </span>
            </div>

            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Tỷ trọng doanh thu</span>
              <span className={styles.metricValue}>
                {performanceData.summary.share_of_total_revenue.toFixed(1)}%
              </span>
              <span
                className={`${styles.metricDelta} ${
                  shareDelta.trendClass === 'positive'
                    ? styles.deltaPositive
                    : shareDelta.trendClass === 'negative'
                    ? styles.deltaNegative
                    : styles.deltaNeutral
                }`}
              >
                <span className={styles.deltaArrow} aria-hidden="true">{shareDelta.arrow}</span>
                <span>{shareDelta.text}</span>
              </span>
            </div>
          </div>

          {/* Performance Chart with straight lines */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <span className={styles.chartTitle}>
                Biểu đồ xu hướng: {performanceData.target_name}
              </span>
              <div className={styles.seriesToggle} role="group" aria-label="Loại số liệu biểu đồ">
                <button
                  type="button"
                  className={`${styles.seriesBtn} ${
                    chartSeries === 'revenue' ? styles.active : ''
                  }`}
                  onClick={() => setChartSeries('revenue')}
                >
                  Doanh thu (VND)
                </button>
                <button
                  type="button"
                  className={`${styles.seriesBtn} ${
                    chartSeries === 'units' ? styles.active : ''
                  }`}
                  onClick={() => setChartSeries('units')}
                >
                  Sản lượng (SP)
                </button>
              </div>
            </div>

            <div className={styles.chartWrapper}>
              <svg
                className={styles.svg}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                preserveAspectRatio="none"
              >
                {/* Y Ticks & Grid */}
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
                      y={tick.y + 3}
                      textAnchor="end"
                      className={styles.axisText}
                    >
                      {chartSeries === 'revenue'
                        ? formatCurrency(tick.value)
                        : tick.value.toLocaleString('vi-VN')}
                    </text>
                  </g>
                ))}

                {/* X Labels */}
                {xLabels.map((pt, idx) => (
                  <text
                    key={idx}
                    x={pt.x}
                    y={padding.top + chartHeight + 18}
                    textAnchor="middle"
                    className={styles.axisText}
                  >
                    {pt.label}
                  </text>
                ))}

                {/* Straight line stroke */}
                {linePath && <path d={linePath} className={styles.lineStroke} />}

                {/* Hover line */}
                {hoveredPoint && (
                  <line
                    x1={hoveredPoint.x}
                    y1={padding.top}
                    x2={hoveredPoint.x}
                    y2={padding.top + chartHeight}
                    className={styles.hoverLine}
                  />
                )}

                {/* Square markers */}
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

                {/* Invisible hit targets */}
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
                  />
                ))}
              </svg>

              {/* Tooltip */}
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
                    {chartSeries === 'revenue'
                      ? formatCurrency(hoveredPoint.value)
                      : `${hoveredPoint.value.toLocaleString('vi-VN')} sản phẩm`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}

export default DashboardItemPerformancePanel
