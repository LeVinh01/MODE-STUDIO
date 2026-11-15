import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PromoCategorySectionConfig } from '@/config/homeSections'
import { productService } from '@/services/api/productService'
import type { Product } from '@/types/product'
import { formatCurrency } from '@/utils/formatters'
import styles from './PromoBanner.module.scss'

interface PromoBannerProps {
  config: PromoCategorySectionConfig
}

export const PromoBanner: React.FC<PromoBannerProps> = ({ config }) => {
  const [bestSeller, setBestSeller] = useState<Product | null>(null)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    let isMounted = true
    const fetchBestSeller = async () => {
      try {
        const response = await productService.getProducts({
          category: config.categorySlug,
          sort: 'best_selling',
          perPage: 1,
        })
        if (isMounted && response.items && response.items.length > 0) {
          setBestSeller(response.items[0])
        }
      } catch {
        // Fallback silently if fetching best-seller fails
      }
    }

    fetchBestSeller()
    return () => {
      isMounted = false
    }
  }, [config.categorySlug])

  const hasDiscount = Boolean(
    bestSeller &&
      bestSeller.compareAtPrice &&
      bestSeller.compareAtPrice > bestSeller.basePrice
  )

  return (
    <section
      className={styles.section}
      aria-label={config.title}
      data-header-theme="dark"
    >
      <Link to={config.ctaHref} className={styles.bannerLink}>
        {/* Background Image / Fallback */}
        <div className={styles.imageWrapper}>
          {!imageError && (
            <img
              src={config.bannerImage}
              alt=""
              aria-hidden="true"
              className={styles.bannerImage}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          )}
          <div className={styles.gradientOverlay} />
        </div>

        {/* Content bottom-left */}
        <div className={styles.content}>
          <h2 className={styles.title}>{config.title}</h2>
          <p className={styles.description}>{config.description}</p>

          {bestSeller && (
            <div className={styles.productHighlight}>
              <span className={styles.productName}>{bestSeller.name}</span>
              <div className={styles.pricing}>
                <span
                  className={`${styles.price} ${
                    hasDiscount ? styles.priceSale : ''
                  }`}
                >
                  {formatCurrency(bestSeller.basePrice)}
                </span>
                {hasDiscount && bestSeller.compareAtPrice && (
                  <span className={styles.originalPrice}>
                    {formatCurrency(bestSeller.compareAtPrice)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </Link>
    </section>
  )
}
