import React from 'react'
import {
  HeroVideoBanner,
  CategoryIconGrid,
  ProductRow,
} from '@/components/storefront'
import { HOME_CONFIG } from '@/config/homeSections'
import styles from './HomePage.module.scss'

export const HomePage: React.FC = () => {
  return (
    <div className={styles.homePage}>
      {/* S1: Hero Video Banner */}
      <HeroVideoBanner config={HOME_CONFIG.hero} />

      {/* S2: Category Icon Grid (Leaf-only, Uniqlo style) */}
      <CategoryIconGrid config={HOME_CONFIG.categoryGrid} />

      {/* S3: 4 Category Product Rows (Empty rows are automatically hidden) */}
      {HOME_CONFIG.productRows.map((row) => (
        <ProductRow
          key={row.title}
          categorySlugs={row.categorySlugs}
          title={row.title}
          viewAllHref={row.viewAllHref}
        />
      ))}
    </div>
  )
}

export default HomePage
