import type { HTMLAttributes } from 'react'
import type { Product } from '@/types/product'
import { ProductCard, ProductCardSkeleton } from '@/components/storefront/ProductCard'
import { cn } from '@/utils/cn'
import styles from './ProductCompactGrid.module.scss'

export interface ProductCompactGridProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  products: Product[]
  isLoading?: boolean
  skeletonCount?: number
  hideBadges?: boolean
  columns?: 4 | 6
}

/**
 * Component lưới sản phẩm thu gọn:
 * - Dùng chung cho trang /search và khối "Có thể bạn quan tâm" ở ProductDetailPage
 * - Mặc định 4 cột trên desktop, 2 cột trên mobile
 * - Hỗ trợ tùy chọn 6 cột (columns={6})
 * - Thẻ sản phẩm gọn gàng (chỉ tên 1 dòng cắt bằng ... + giá, tùy chọn ẩn badge)
 */
export const ProductCompactGrid = ({
  title,
  products,
  isLoading = false,
  skeletonCount = 4,
  hideBadges = false,
  columns = 4,
  className,
  ...props
}: ProductCompactGridProps) => {
  if (!isLoading && products.length === 0) {
    return null
  }

  return (
    <section className={cn(styles.section, className)} {...props}>
      {title && <h2 className={styles.title}>{title}</h2>}

      <div className={cn(styles.grid, columns === 6 && styles.grid6)}>
        {isLoading
          ? Array.from({ length: skeletonCount }).map((_, idx) => (
              <ProductCardSkeleton key={`compact-skeleton-${idx}`} compact />
            ))
          : products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                compact
                hideBadges={hideBadges}
              />
            ))}
      </div>
    </section>
  )
}

export default ProductCompactGrid
