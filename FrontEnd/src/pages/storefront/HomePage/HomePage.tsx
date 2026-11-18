import React, { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import {
  HeroVideoBanner,
  CategoryIconGrid,
  ProductRow,
} from '@/components/storefront'
import {
  HOME_CONFIG,
  GENDER_HOME_CONFIG,
  type HomeGender,
} from '@/config/homeSections'
import styles from './HomePage.module.scss'

export const HomePage: React.FC = () => {
  const location = useLocation()

  // Derive gender from URL: /nam -> 'men', / or /nu -> 'women'
  const gender: HomeGender = useMemo(() => {
    if (location.pathname === '/nam' || location.pathname.startsWith('/nam/')) {
      return 'men'
    }
    return 'women'
  }, [location.pathname])

  const genderConfig = GENDER_HOME_CONFIG[gender]

  return (
    <div className={styles.homePage} key={gender}>
      {/* S1: Hero Video Banner */}
      <HeroVideoBanner config={HOME_CONFIG.hero} />

      {/* S2: Category Icon Grid (Leaf-only per gender, Uniqlo style) */}
      <CategoryIconGrid
        config={genderConfig.categoryGrid}
        gender={gender}
      />

      {/* S3: 4 Category Product Rows per gender (Empty rows are automatically hidden) */}
      {genderConfig.productRows.map((row) => (
        <ProductRow
          key={`${gender}-${row.title}`}
          categorySlugs={row.categorySlugs}
          title={row.title}
          viewAllHref={row.viewAllHref}
        />
      ))}
    </div>
  )
}

export default HomePage
