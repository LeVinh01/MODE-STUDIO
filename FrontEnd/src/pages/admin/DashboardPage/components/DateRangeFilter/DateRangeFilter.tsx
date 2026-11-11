import React, { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { DashboardPresetPeriod } from '@/types/adminDashboard'
import { getTodayVn, getDaysAgoVn, getStartOfMonthVn } from '@/utils/formatters'
import styles from './DateRangeFilter.module.scss'

interface DateRangeFilterProps {
  from: string
  to: string
  onRangeChange: (from: string, to: string) => void
  onRefresh: () => void
  isLoading?: boolean
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  from,
  to,
  onRangeChange,
  onRefresh,
  isLoading = false,
}) => {
  const [customFrom, setCustomFrom] = useState(from)
  const [customTo, setCustomTo] = useState(to)
  const [error, setError] = useState<string | null>(null)

  // Determine preset from current from/to
  const getActivePreset = (): DashboardPresetPeriod => {
    const today = getTodayVn()
    const last7 = getDaysAgoVn(6)
    const last30 = getDaysAgoVn(29)
    const monthStart = getStartOfMonthVn()

    if (to === today && from === last7) return '7days'
    if (to === today && from === last30) return '30days'
    if (to === today && from === monthStart) return 'this_month'
    return 'custom'
  }

  const activePreset = getActivePreset()

  const handleSelectPreset = (preset: DashboardPresetPeriod) => {
    const today = getTodayVn()
    setError(null)

    if (preset === '7days') {
      onRangeChange(getDaysAgoVn(6), today)
    } else if (preset === '30days') {
      onRangeChange(getDaysAgoVn(29), today)
    } else if (preset === 'this_month') {
      onRangeChange(getStartOfMonthVn(), today)
    }
  }

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customFrom || !customTo) {
      setError('Vui lòng chọn cả từ ngày và đến ngày')
      return
    }

    if (customFrom > customTo) {
      setError('Từ ngày không được lớn hơn đến ngày')
      return
    }

    setError(null)
    onRangeChange(customFrom, customTo)
  }

  return (
    <div className={styles.container}>
      <div className={styles.presetGroup}>
        <button
          type="button"
          className={`${styles.presetBtn} ${activePreset === '7days' ? styles.active : ''}`}
          onClick={() => handleSelectPreset('7days')}
        >
          7 ngày qua
        </button>
        <button
          type="button"
          className={`${styles.presetBtn} ${activePreset === '30days' ? styles.active : ''}`}
          onClick={() => handleSelectPreset('30days')}
        >
          30 ngày qua
        </button>
        <button
          type="button"
          className={`${styles.presetBtn} ${activePreset === 'this_month' ? styles.active : ''}`}
          onClick={() => handleSelectPreset('this_month')}
        >
          Tháng này
        </button>
      </div>

      <form className={styles.customRangeForm} onSubmit={handleApplyCustom}>
        <div className={styles.dateInputWrapper}>
          <span>Từ:</span>
          <input
            type="date"
            className={styles.dateInput}
            value={customFrom}
            max={getTodayVn()}
            onChange={(e) => setCustomFrom(e.target.value)}
          />
        </div>
        <div className={styles.dateInputWrapper}>
          <span>Đến:</span>
          <input
            type="date"
            className={styles.dateInput}
            value={customTo}
            max={getTodayVn()}
            onChange={(e) => setCustomTo(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className={styles.applyBtn}
          disabled={isLoading || (customFrom === from && customTo === to)}
        >
          Áp dụng
        </button>

        <button
          type="button"
          className={styles.refreshBtn}
          onClick={onRefresh}
          disabled={isLoading}
          title="Tải lại dữ liệu"
        >
          <RefreshCw className={isLoading ? 'spin-animation' : ''} />
          <span>Làm mới</span>
        </button>
      </form>

      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  )
}

export default DateRangeFilter
