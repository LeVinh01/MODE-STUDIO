import React, { useState } from 'react'
import { Info, TrendingUp, PackageCheck, Receipt, XCircle } from 'lucide-react'
import type { DashboardDeltaPercent, DashboardKpis, DashboardRange } from '@/types/adminDashboard'
import { getDeltaDisplay, RANGE_OPTIONS } from '../../dashboardTokens'
import { formatCurrency } from '@/utils/formatters'
import styles from './DashboardKpiCards.module.scss'

interface DashboardKpiCardsProps {
  currentKpis: DashboardKpis
  deltaPercent: DashboardDeltaPercent
  range: DashboardRange
}

interface KpiCardItem {
  id: string
  label: string
  value: string
  subtext?: string
  delta: number | null
  inverted?: boolean
  isPoints?: boolean
  formulaTooltip: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

export const DashboardKpiCards: React.FC<DashboardKpiCardsProps> = ({
  currentKpis,
  deltaPercent,
  range,
}) => {
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null)

  const rangeCfg = RANGE_OPTIONS.find((opt) => opt.value === range)
  const periodText = rangeCfg ? rangeCfg.periodText : 'kỳ trước'

  const cards: KpiCardItem[] = [
    {
      id: 'revenue',
      label: 'Doanh thu',
      value: formatCurrency(currentKpis.revenue),
      subtext: `Từ ${currentKpis.delivered_orders_count.toLocaleString('vi-VN')} đơn đã giao`,
      delta: deltaPercent.revenue,
      inverted: false,
      isPoints: false,
      formulaTooltip:
        'Tổng giá trị thanh toán của các đơn hàng đã giao thành công (status = delivered) trong kỳ (căn cứ thời điểm giao/hoàn tất thanh toán).',
      icon: TrendingUp,
    },
    {
      id: 'orders_count',
      label: 'Đơn hàng hợp lệ',
      value: `${currentKpis.orders_count.toLocaleString('vi-VN')} đơn`,
      subtext: `Tổng tạo: ${currentKpis.total_orders_count.toLocaleString('vi-VN')} (${currentKpis.cancelled_orders_count.toLocaleString('vi-VN')} đơn hủy)`,
      delta: deltaPercent.orders_count,
      inverted: false,
      isPoints: false,
      formulaTooltip:
        'Tổng số đơn hàng phát sinh trong kỳ trừ đi số đơn đã hủy (không tính đơn hủy). Phục vụ theo dõi sản lượng bán hàng thực tế.',
      icon: PackageCheck,
    },
    {
      id: 'aov',
      label: 'Giá trị đơn TB (AOV)',
      value: formatCurrency(currentKpis.average_order_value),
      subtext: 'Doanh thu / đơn đã giao',
      delta: deltaPercent.average_order_value,
      inverted: false,
      isPoints: false,
      formulaTooltip:
        'Doanh thu thuần chia cho số lượng đơn hàng đã giao thành công trong kỳ (AOV = Doanh thu / Đơn đã giao).',
      icon: Receipt,
    },
    {
      id: 'cancellation_rate',
      label: 'Tỷ lệ hủy đơn',
      value: `${(currentKpis.cancellation_rate ?? 0).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
      subtext: `${currentKpis.cancelled_orders_count.toLocaleString('vi-VN')} / ${currentKpis.total_orders_count.toLocaleString('vi-VN')} đơn phát sinh`,
      delta: deltaPercent.cancellation_rate,
      inverted: true, // Tăng tỷ lệ hủy là xấu
      isPoints: true, // Hiển thị biến động theo điểm phần trăm
      formulaTooltip:
        'Tỷ lệ phần trăm đơn hàng bị hủy trên tổng số đơn hàng phát sinh trong kỳ: (Số đơn hủy / Tổng số đơn tạo) × 100%. Biến động đo bằng điểm phần trăm (điểm %).',
      icon: XCircle,
    },
  ]

  return (
    <div className={styles.kpiGrid}>
      {cards.map((card) => {
        const Icon = card.icon
        const deltaInfo = getDeltaDisplay(card.delta, periodText, card.inverted, card.isPoints)

        return (
          <div key={card.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.labelRow}>
                <span className={styles.label}>{card.label}</span>
                <div className={styles.tooltipContainer}>
                  <button
                    type="button"
                    className={styles.infoBtn}
                    onClick={() =>
                      setActiveTooltipId(activeTooltipId === card.id ? null : card.id)
                    }
                    onMouseEnter={() => setActiveTooltipId(card.id)}
                    onMouseLeave={() => setActiveTooltipId(null)}
                    aria-label={`Công thức tính ${card.label}`}
                  >
                    <Info size={13} />
                  </button>
                  {activeTooltipId === card.id && (
                    <div className={styles.tooltipBubble} role="tooltip">
                      <div className={styles.tooltipTitle}>Công thức tính:</div>
                      <div>{card.formulaTooltip}</div>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.iconCircle}>
                <Icon size={14} />
              </div>
            </div>

            <div className={styles.bigValue}>{card.value}</div>

            <div className={styles.cardFooter}>
              <div
                className={`${styles.deltaRow} ${
                  deltaInfo.trendClass === 'positive'
                    ? styles.deltaPositive
                    : deltaInfo.trendClass === 'negative'
                    ? styles.deltaNegative
                    : styles.deltaNeutral
                }`}
                title={deltaInfo.screenReaderText}
              >
                <span className={styles.deltaArrow} aria-hidden="true">
                  {deltaInfo.arrow}
                </span>
                <span className={styles.deltaText}>{deltaInfo.text}</span>
              </div>
              {card.subtext && <div className={styles.subtext}>{card.subtext}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
