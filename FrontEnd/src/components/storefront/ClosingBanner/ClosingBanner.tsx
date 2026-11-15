import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { ClosingBannerSectionConfig } from '@/config/homeSections'
import styles from './ClosingBanner.module.scss'

interface ClosingBannerProps {
  config: ClosingBannerSectionConfig
}

export const ClosingBanner: React.FC<ClosingBannerProps> = ({ config }) => {
  const [imageError, setImageError] = useState(false)

  return (
    <section className={styles.section} aria-label={config.title}>
      {/* Background Image & Overlay */}
      <div className={styles.imageWrapper}>
        {!imageError && (
          <img
            src={config.image}
            alt=""
            aria-hidden="true"
            className={styles.bannerImage}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        )}
        <div className={styles.overlay} />
      </div>

      {/* Content bottom-left */}
      <div className={styles.content}>
        <h2 className={styles.title}>{config.title}</h2>
        {config.subtitle && <p className={styles.subtitle}>{config.subtitle}</p>}
        <Link to={config.ctaHref} className={styles.ctaLink}>
          <span>{config.ctaLabel}</span>
          <ArrowRight size={20} className={styles.ctaArrow} />
        </Link>
      </div>
    </section>
  )
}
