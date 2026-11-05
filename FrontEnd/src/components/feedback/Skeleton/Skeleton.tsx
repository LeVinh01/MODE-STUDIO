import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import styles from './Skeleton.module.scss'

export type SkeletonVariant = 'text' | 'rectangular' | 'circular'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant
  width?: string | number
  height?: string | number
  borderRadius?: string | number
}

export const Skeleton = ({
  variant = 'text',
  width,
  height,
  borderRadius,
  className,
  style,
  ...props
}: SkeletonProps) => {
  const variantClass = {
    text: styles.variantText,
    rectangular: styles.variantRectangular,
    circular: styles.variantCircular,
  }[variant]

  const customStyle = {
    ...style,
    ...(width !== undefined && {
      width: typeof width === 'number' ? `${width}px` : width,
    }),
    ...(height !== undefined && {
      height: typeof height === 'number' ? `${height}px` : height,
    }),
    ...(borderRadius !== undefined && {
      borderRadius:
        typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
    }),
  }

  return (
    <div
      aria-hidden="true"
      className={cn(styles.skeleton, variantClass, className)}
      style={customStyle}
      {...props}
    />
  )
}

export default Skeleton

