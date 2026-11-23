import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import type { AdminUnifiedDashboardData, DashboardRange } from '@/types/adminDashboard'
import adminDashboardService from '@/services/api/adminDashboardService'
import { getApiErrorMessage } from '@/utils/apiError'
import { Skeleton } from '@/components/feedback'
import { DashboardToolbar } from './components/DashboardToolbar/DashboardToolbar'
import { DashboardKpiCards } from './components/DashboardKpiCards/DashboardKpiCards'
import { DashboardRevenueChart } from './components/DashboardRevenueChart/DashboardRevenueChart'
import { DashboardTopProducts } from './components/DashboardTopProducts/DashboardTopProducts'
import { DashboardOrderStatusDonut } from './components/DashboardOrderStatusDonut/DashboardOrderStatusDonut'
import { DashboardCategoryRevenue } from './components/DashboardCategoryRevenue/DashboardCategoryRevenue'
import { DashboardAlerts } from './components/DashboardAlerts/DashboardAlerts'
import { DashboardItemPerformancePanel } from './components/DashboardItemPerformancePanel/DashboardItemPerformancePanel'
import styles from './DashboardPage.module.scss'

const VALID_RANGES: DashboardRange[] = [
  '7d',
  '30d',
  '90d',
  'this_month',
  'this_quarter',
  'this_year',
  'custom',
]

// Strict date format validator (YYYY-MM-DD)
const isValidDateString = (s: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s))

export const DashboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const rawRange = searchParams.get('range')
  const rawFrom = searchParams.get('from') || ''
  const rawTo = searchParams.get('to') || ''

  // Sanitize and resolve currentRange and custom dates with safe fallback to '30d'
  let currentRange: DashboardRange = '30d'
  let customFrom = ''
  let customTo = ''

  if (rawRange === 'custom') {
    if (isValidDateString(rawFrom) && isValidDateString(rawTo) && rawFrom <= rawTo) {
      currentRange = 'custom'
      customFrom = rawFrom
      customTo = rawTo
    } else {
      // Fallback: missing or invalid custom dates -> fall back to 30d
      currentRange = '30d'
    }
  } else if (rawRange && VALID_RANGES.includes(rawRange as DashboardRange)) {
    currentRange = rawRange as DashboardRange
  } else if (!rawRange && isValidDateString(rawFrom) && isValidDateString(rawTo) && rawFrom <= rawTo) {
    // Backward-compatibility: URL with only ?from=...&to=... (direct or legacy navigation)
    currentRange = 'custom'
    customFrom = rawFrom
    customTo = rawTo
  } else {
    currentRange = '30d'
  }

  const [dashboardData, setDashboardData] = useState<AdminUnifiedDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Normalize URL search params if someone lands on broken /admin?range=custom without dates
  useEffect(() => {
    if (rawRange === 'custom' && (!isValidDateString(rawFrom) || !isValidDateString(rawTo) || rawFrom > rawTo)) {
      setSearchParams({ range: '30d' }, { replace: true })
    }
  }, [rawRange, rawFrom, rawTo, setSearchParams])

  useEffect(() => {
    let ignore = false
    const controller = new AbortController()

    adminDashboardService
      .getDashboard(
        currentRange,
        currentRange === 'custom' ? customFrom : undefined,
        currentRange === 'custom' ? customTo : undefined,
        controller.signal,
      )
      .then((res) => {
        if (!ignore) {
          setDashboardData(res)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          if (!axios.isCancel(err) && !(err instanceof DOMException && err.name === 'AbortError')) {
            setError(getApiErrorMessage(err))
          }
          setIsLoading(false)
        }
      })

    return () => {
      ignore = true
      controller.abort()
    }
  }, [currentRange, customFrom, customTo])

  const handleRangeChange = (newRange: DashboardRange, from?: string, to?: string) => {
    setIsLoading(true)
    setError(null)
    const next = new URLSearchParams()
    if (newRange === 'custom' && from && to) {
      next.set('range', 'custom')
      next.set('from', from)
      next.set('to', to)
    } else {
      next.set('range', newRange)
    }
    setSearchParams(next, { replace: true })
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setError(null)
    adminDashboardService
      .getDashboard(
        currentRange,
        currentRange === 'custom' ? customFrom : undefined,
        currentRange === 'custom' ? customTo : undefined,
      )
      .then((res) => {
        setDashboardData(res)
        setIsLoading(false)
      })
      .catch((err) => {
        if (!axios.isCancel(err) && !(err instanceof DOMException && err.name === 'AbortError')) {
          setError(getApiErrorMessage(err))
        }
        setIsLoading(false)
      })
  }

  return (
    <section className={styles.pageContainer}>
      <header className={styles.header}>
        <h2 className={styles.pageTitle}>Tổng quan kinh doanh OMBRE</h2>
        <p className={styles.pageSubtitle}>
          Báo cáo số liệu hiệu suất kinh doanh, xu hướng doanh thu và cảnh báo vận hành
        </p>
      </header>

      {/* 1. TOOLBAR: RESTORED ORIGINAL UX + PRESETS & DATE RANGE FORM */}
      <DashboardToolbar
        key={`${currentRange}_${customFrom}_${customTo}_${dashboardData?.current_period?.from || ''}_${dashboardData?.current_period?.to || ''}`}
        currentRange={currentRange}
        periodInfo={dashboardData?.current_period}
        customFrom={customFrom}
        customTo={customTo}
        onRangeChange={handleRangeChange}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      {error && (
        <div className={styles.errorBanner} role="alert">
          <span>{error}</span>
          <button type="button" className={styles.retryBtn} onClick={handleRefresh}>
            Thử lại
          </button>
        </div>
      )}

      {/* Initial loading skeletons */}
      {isLoading && !dashboardData && (
        <div className={styles.skeletonContainer}>
          <div className={styles.skeletonGrid}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.skeletonCard}>
                <Skeleton variant="text" width="50%" height={14} />
                <Skeleton variant="text" width="80%" height={26} />
                <Skeleton variant="text" width="60%" height={12} />
              </div>
            ))}
          </div>
          <div className={styles.skeletonChart}>
            <Skeleton variant="rectangular" width="100%" height={260} />
          </div>
        </div>
      )}

      {dashboardData && (
        <>
          {/* 2. 4 KPI CARDS */}
          <DashboardKpiCards
            currentKpis={dashboardData.current}
            deltaPercent={dashboardData.delta_percent}
            range={dashboardData.range}
          />

          {/* 3. REVENUE STRAIGHT LINE CHART */}
          <DashboardRevenueChart
            timeSeries={dashboardData.revenue_time_series}
            isLoading={isLoading}
          />

          {/* 4. TWO COLUMNS: TOP PRODUCTS & ORDER STATUS DONUT */}
          <div className={styles.twoColumns}>
            <div className={styles.colLeft}>
              <DashboardTopProducts data={dashboardData.top_products} />
            </div>
            <div className={styles.colRight}>
              <DashboardOrderStatusDonut breakdown={dashboardData.order_status_breakdown} />
            </div>
          </div>

          {/* 5. REVENUE BY CATEGORY RANKED TABLE */}
          <DashboardCategoryRevenue categoryData={dashboardData.revenue_by_category} />

          {/* 6. PRODUCT / CATEGORY PERFORMANCE PANEL */}
          <DashboardItemPerformancePanel />

          {/* 7. OPERATIONAL ALERTS (RESTORED 3-CARD SIDE-BY-SIDE PRESENTATION) */}
          <DashboardAlerts alerts={dashboardData.alerts} />
        </>
      )}
    </section>
  )
}

export default DashboardPage
