import React from 'react'
import {
  HeroVideoBanner,
  CategoryIconGrid,
  PromoBanner,
  ProductRow,
  ClosingBanner,
} from '@/components/storefront'
import { HOME_CONFIG } from '@/config/homeSections'
import styles from './HomePage.module.scss'

export const HomePage: React.FC = () => {
  return (
    <div className={styles.homePage}>
      {/* S1: Hero Video Banner */}
      <HeroVideoBanner config={HOME_CONFIG.hero} />

      {/* S2: Category Icon Grid */}
      <CategoryIconGrid config={HOME_CONFIG.categoryGrid} />

      {/* S3 & S4: 4 Featured Categories (PromoBanner + ProductRow pairs) */}
      {HOME_CONFIG.featuredCategories.map((section) => (
        <React.Fragment key={section.categorySlug}>
          <PromoBanner config={section} />
          <ProductRow categorySlug={section.categorySlug} title={section.title} />
        </React.Fragment>
      ))}

      {/* S5: Closing Editorial Banner */}
      <ClosingBanner config={HOME_CONFIG.closingBanner} />
    </div>
  )
}

export default HomePage
