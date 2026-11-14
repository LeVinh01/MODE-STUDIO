import type { HTMLAttributes } from 'react'
import { Skeleton } from '@/components/feedback/Skeleton'
import { cn } from '@/utils/cn'
import styles from './ProductCard.module.scss'

export interface ProductCardSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  compact?: boolean
}

export const ProductCardSkeleton = ({
  compact = false,
  className,
  ...props
}: ProductCardSkeletonProps) => {
  return (
    <div
      className={cn(styles.card, compact && styles.compact, className)}
      aria-hidden="true"
      {...props}
    >
      <div className={styles.imageContainer}>
        <Skeleton variant="rectangular" width="100%" height="100%" />
      </div>

      <div className={styles.details}>
        {!compact && <Skeleton variant="text" width="35%" height="0.6875rem" />}
        <Skeleton variant="text" width="85%" height="0.875rem" />
        <Skeleton variant="text" width="45%" height="0.875rem" />
        {!compact && (
          <div className={styles.swatchList}>
            <Skeleton variant="circular" width="0.75rem" height="0.75rem" />
            <Skeleton variant="circular" width="0.75rem" height="0.75rem" />
            <Skeleton variant="circular" width="0.75rem" height="0.75rem" />
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductCardSkeleton

