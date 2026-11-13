import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { AdminDashboardSummaryData } from '@/types/adminDashboard'
import { KPI_CARDS_CONFIG } from '@/config/kpiConfig'
import styles from './KpiCards.module.scss'

interface KpiCardsProps {
  summary: AdminDashboardSummaryData
}

export const KpiCards: React.FC<KpiCardsProps> = ({ summary }) => {
  return (
    <div className={styles.grid}>
      {KPI_CARDS_CONFIG.map((card) => {
        const Icon = card.icon
        const isWarning = card.isWarning?.(summary) ?? false

        return (
          <div
            key={card.id}
            className={`${styles.card} ${isWarning ? styles.warning : ''}`}
          >
            <div>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>{card.title}</span>
                <div
                  className={`${styles.iconWrapper} ${
                    isWarning ? styles.warning : ''
                  }`}
                >
                  <Icon size={16} />
                </div>
              </div>
              <p className={styles.cardDefinition} title={card.definition}>
                {card.definition}
              </p>
            </div>

            <div className={styles.cardValue}>{card.getValue(summary)}</div>

            <div className={styles.cardFooter}>
              <span>{card.getFooter(summary)}</span>
              {card.link && (
                <Link to={card.link.to} className={styles.cardLink}>
                  {card.link.text} <ArrowRight size={12} />
                </Link>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default KpiCards
