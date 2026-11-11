import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import type {
  AdminDashboardRevenueData,
  AdminDashboardSummaryData,
  AdminDashboardTopProductItem,
} from '@/types/adminDashboard'
import adminDashboardService from '@/services/api/adminDashboardService'
import { getTodayVn, getDaysAgoVn } from '@/utils/formatters'
import { getApiErrorMessage } from '@/utils/apiError'
import { Skeleton } from '@/components/feedback'
import DateRangeFilter from './components/DateRangeFilter/DateRangeFilter'
import KpiCards from './components/KpiCards/KpiCards'
import RevenueChart from './components/RevenueChart/RevenueChart'
import OrderStatusChart from './components/OrderStatusChart/OrderStatusChart'
import TopProductsTable from './components/TopProductsTable/TopProductsTable'
import styles from './DashboardPage.module.scss'

export const DashboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  // Default range: 30 days (inclusive)
  const defaultFrom = getDaysAgoVn(29)
  const defaultTo = getTodayVn()

  const fromParam = searchParams.get('from') || defaultFrom
  const toParam = searchParams.get('to') || defaultTo

  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day')
  const [summary, setSummary] = useState<AdminDashboardSummaryData | null>(null)
  const [revenue, setRevenue] = useState<AdminDashboardRevenueData | null>(null)
  const [topProducts, setTopProducts] = useState<AdminDashboardTopProductItem[]>([])

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isRevenueLoading, setIsRevenueLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all dashboard data with AbortController
  const fetchData = useCallback(
    (from: string, to: string, currentGroupBy: 'day' | 'month') => {
      const controller = new AbortController()

      Promise.all([
        adminDashboardService.getSummary({ from, to }, controller.signal),
        adminDashboardService.getRevenue({ from, to, group_by: currentGroupBy }, controller.signal),
        adminDashboardService.getTopProducts({ from, to, limit: 5 }, controller.signal),
      ])
        .then(([summaryRes, revenueRes, topProductsRes]) => {
          setSummary(summaryRes)
          setRevenue(revenueRes)
          setTopProducts(topProductsRes)
          setIsLoading(false)
        })
        .catch((err) => {
          if (axios.isCancel(err) || (err instanceof DOMException && err.name === 'AbortError')) {
            return
          }
          setError(getApiErrorMessage(err))
          setIsLoading(false)
        })

      return () => controller.abort()
    },
    [],
  )

  // Fetch only revenue when group_by changes
  const handleGroupByChange = async (newGroupBy: 'day' | 'month') => {
    if (newGroupBy === groupBy) return
    setGroupBy(newGroupBy)
    setIsRevenueLoading(true)

    try {
      const res = await adminDashboardService.getRevenue({
        from: fromParam,
        to: toParam,
        group_by: newGroupBy,
      })
      setRevenue(res)
    } catch (err) {
      if (!axios.isCancel(err)) {
        setError(getApiErrorMessage(err))
      }
    } finally {
      setIsRevenueLoading(false)
    }
  }

  // Update URL search parameters when date range changes
  const handleRangeChange = (newFrom: string, newTo: string) => {
    setIsLoading(true)
    setError(null)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('from', newFrom)
        next.set('to', newTo)
        return next
      },
      { replace: true },
    )
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setError(null)
    fetchData(fromParam, toParam, groupBy)
  }

  useEffect(() => {
    const cancel = fetchData(fromParam, toParam, groupBy)
    return cancel
  }, [fromParam, toParam, groupBy, fetchData])

  return (
    <section className={styles.pageContainer}>
      <div className={styles.header}>
        <h2 className={styles.pageTitle}>Tổng quan kinh doanh</h2>
        <p className={styles.pageSubtitle}>
          Báo cáo doanh số bán hàng, phân tích đơn hàng và hiệu suất sản phẩm
        </p>
      </div>

      <DateRangeFilter
        key={`${fromParam}_${toParam}`}
        from={fromParam}
        to={toParam}
        onRangeChange={handleRangeChange}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button type="button" className={styles.retryBtn} onClick={handleRefresh}>
            Thử lại
          </button>
        </div>
      )}

      {/* Skeletons khi tải lần đầu */}
      {isLoading && !summary && (
        <>
          <div className={styles.skeletonKpiGrid}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={styles.skeletonKpiCard}>
                <Skeleton variant="text" width="60%" height={16} />
                <Skeleton variant="text" width="80%" height={28} />
                <Skeleton variant="text" width="40%" height={14} />
              </div>
            ))}
          </div>
          <div className={styles.chartsRow}>
            <div className={styles.skeletonChartCard}>
              <Skeleton variant="rectangular" width="100%" height="100%" borderRadius={8} />
            </div>
            <div className={styles.skeletonChartCard}>
              <Skeleton variant="rectangular" width="100%" height="100%" borderRadius={8} />
            </div>
          </div>
          <div className={styles.skeletonTableCard}>
            <Skeleton variant="rectangular" width="100%" height="100%" borderRadius={8} />
          </div>
        </>
      )}

      {/* Dữ liệu thật khi đã tải xong */}
      {summary && (
        <>
          <KpiCards summary={summary} />

          <div className={styles.chartsRow}>
            {revenue && (
              <RevenueChart
                data={revenue}
                groupBy={groupBy}
                onGroupByChange={handleGroupByChange}
                isLoading={isRevenueLoading}
              />
            )}

            <OrderStatusChart ordersByStatus={summary.orders_by_status} />
          </div>

          <TopProductsTable products={topProducts} isLoading={isLoading} />
        </>
      )}
    </section>
  )
}

export default DashboardPage
