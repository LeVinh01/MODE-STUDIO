import React, { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { DashboardPeriodInfo, DashboardRange } from '@/types/adminDashboard'
import { getTodayVn, getDaysAgoVn, getStartOfMonthVn } from '@/utils/formatters'
import styles from './DashboardToolbar.module.scss'

interface DashboardToolbarProps {
  currentRange: DashboardRange
  periodInfo?: DashboardPeriodInfo
  customFrom?: string
  customTo?: string
  onRangeChange: (range: DashboardRange, from?: string, to?: string) => void
  onRefresh: () => void
  isLoading?: boolean
}

export const DashboardToolbar: React.FC<DashboardToolbarProps> = ({
  currentRange,
  periodInfo,
  customFrom = '',
  customTo = '',
  onRangeChange,
  onRefresh,
  isLoading = false,
}) => {
  const defaultTo = getTodayVn()
  const defaultFrom = getDaysAgoVn(29)

  const initialFrom = customFrom || periodInfo?.from || defaultFrom
  const initialTo = customTo || periodInfo?.to || defaultTo

  const [inputFrom, setInputFrom] = useState(initialFrom)
  const [inputTo, setInputTo] = useState(initialTo)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Determine active preset
  const getActivePreset = (): DashboardRange | 'custom' => {
    if (currentRange !== 'custom') {
      return currentRange
    }
    const today = getTodayVn()
    const last7 = getDaysAgoVn(6)
    const last30 = getDaysAgoVn(29)
    const last90 = getDaysAgoVn(89)
    const monthStart = getStartOfMonthVn()

    const fromVal = customFrom || inputFrom
    const toVal = customTo || inputTo

    if (toVal === today && fromVal === last7) return '7d'
    if (toVal === today && fromVal === last30) return '30d'
    if (toVal === today && fromVal === last90) return '90d'
    if (toVal === today && fromVal === monthStart) return 'this_month'
    return 'custom'
  }

  const activePreset = getActivePreset()

  const handleSelectPreset = (preset: DashboardRange) => {
    setErrorMsg(null)
    onRangeChange(preset)
  }

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputFrom || !inputTo) {
      setErrorMsg('Vui lòng chọn cả từ ngày và đến ngày')
      return
    }

    if (inputFrom > inputTo) {
      setErrorMsg('Từ ngày không được lớn hơn đến ngày')
      return
    }

    const dFrom = new Date(inputFrom)
    const dTo = new Date(inputTo)
    const diffDays = Math.ceil((dTo.getTime() - dFrom.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays > 366) {
      setErrorMsg('Khoảng thời gian không được vượt quá 366 ngày')
      return
    }

    setErrorMsg(null)
    onRangeChange('custom', inputFrom, inputTo)
  }

  const isApplyDisabled =
    isLoading ||
    !inputFrom ||
    !inputTo ||
    (currentRange === 'custom' && inputFrom === customFrom && inputTo === customTo)

  return (
    <div className={styles.container}>
      <div className={styles.mainRow}>
        {/* Preset Group (Restored original buttons + 90d) */}
        <div className={styles.presetGroup} role="group" aria-label="Chọn khoảng thời gian nhanh">
          <button
            type="button"
            className={`${styles.presetBtn} ${activePreset === '7d' ? styles.active : ''}`}
            onClick={() => handleSelectPreset('7d')}
          >
            7 ngày qua
          </button>
          <button
            type="button"
            className={`${styles.presetBtn} ${activePreset === '30d' ? styles.active : ''}`}
            onClick={() => handleSelectPreset('30d')}
          >
            30 ngày qua
          </button>
          <button
            type="button"
            className={`${styles.presetBtn} ${activePreset === '90d' ? styles.active : ''}`}
            onClick={() => handleSelectPreset('90d')}
          >
            90 ngày qua
          </button>
          <button
            type="button"
            className={`${styles.presetBtn} ${activePreset === 'this_month' ? styles.active : ''}`}
            onClick={() => handleSelectPreset('this_month')}
          >
            Tháng này
          </button>
        </div>

        {/* Custom Range Form (Restored original inline date controls) */}
        <form className={styles.customRangeForm} onSubmit={handleApplyCustom}>
          <div className={styles.dateInputWrapper}>
            <span>Từ:</span>
            <input
              type="date"
              className={styles.dateInput}
              value={inputFrom}
              max={getTodayVn()}
              onChange={(e) => {
                setInputFrom(e.target.value)
                setErrorMsg(null)
              }}
              aria-label="Từ ngày"
            />
          </div>
          <div className={styles.dateInputWrapper}>
            <span>Đến:</span>
            <input
              type="date"
              className={styles.dateInput}
              value={inputTo}
              max={getTodayVn()}
              onChange={(e) => {
                setInputTo(e.target.value)
                setErrorMsg(null)
              }}
              aria-label="Đến ngày"
            />
          </div>

          <button
            type="submit"
            className={styles.applyBtn}
            disabled={isApplyDisabled}
          >
            Áp dụng
          </button>

          <button
            type="button"
            className={styles.refreshBtn}
            onClick={onRefresh}
            disabled={isLoading}
            title="Tải lại dữ liệu"
            aria-label="Làm mới dữ liệu"
          >
            <RefreshCw className={isLoading ? styles.spinning : ''} size={14} />
            <span>Làm mới</span>
          </button>
        </form>
      </div>

      {/* Date Span Badge & Inline Error */}
      <div className={styles.footerRow}>
        {periodInfo && (
          <div className={styles.periodBadge}>
            <span>Kỳ xem: {periodInfo.from} ― {periodInfo.to}</span>
            <span className={styles.durationTag}>({periodInfo.duration_days} ngày)</span>
          </div>
        )}

        {errorMsg && <div className={styles.errorMessage} role="alert">{errorMsg}</div>}
      </div>
    </div>
  )
}
export default DashboardToolbar
