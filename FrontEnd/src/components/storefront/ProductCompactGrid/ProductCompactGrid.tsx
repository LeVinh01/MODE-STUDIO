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
}

/**
 * Component lưới sản phẩm thu gọn:
 * - Dùng chung cho trang /search và khối "Có thể bạn quan tâm" ở ProductDetailPage
 * - Desktop lớn (>=1280px) 6 cột, Desktop (>=1024px) 5 cột, Tablet 3 cột, Mobile 2 cột
 * - Thẻ sản phẩm gọn gàng (chỉ tên 1 dòng cắt bằng ... + giá)
 */
export const ProductCompactGrid = ({
  title,
  products,
  isLoading = false,
  skeletonCount = 6,
  className,
  ...props
}: ProductCompactGridProps) => {
  if (!isLoading && products.length === 0) {
    return null
  }

  return (
    <section className={cn(styles.section, className)} {...props}>
      {title && <h2 className={styles.title}>{title}</h2>}

      <div className={styles.grid}>
        {isLoading
          ? Array.from({ length: skeletonCount }).map((_, idx) => (
              <ProductCardSkeleton key={`compact-skeleton-${idx}`} compact />
            ))
          : products.map((product) => (
              <ProductCard key={product.id} product={product} compact />
            ))}
      </div>
    </section>
  )
}

export default ProductCompactGrid
