import type { HTMLAttributes } from 'react'
import { Skeleton } from '@/components/feedback/Skeleton'
import { cn } from '@/utils/cn'
import styles from './ProductCard.module.scss'

export type ProductCardSkeletonProps = HTMLAttributes<HTMLDivElement>

export const ProductCardSkeleton = ({
  className,
  ...props
}: ProductCardSkeletonProps) => {
  return (
    <div
      className={cn(styles.card, className)}
      aria-hidden="true"
      {...props}
    >
      <div className={styles.imageContainer}>
        <Skeleton variant="rectangular" width="100%" height="100%" />
      </div>

      <div className={styles.details}>
        <Skeleton variant="text" width="35%" height="0.6875rem" />
        <Skeleton variant="text" width="85%" height="1rem" />
        <Skeleton variant="text" width="45%" height="1rem" />
        <div className={styles.swatchList}>
          <Skeleton variant="circular" width="0.75rem" height="0.75rem" />
          <Skeleton variant="circular" width="0.75rem" height="0.75rem" />
          <Skeleton variant="circular" width="0.75rem" height="0.75rem" />
        </div>
      </div>
    </div>
  )
}

export default ProductCardSkeleton

