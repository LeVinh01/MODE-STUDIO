import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'
import styles from './Badge.module.scss'

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'luxury'
  | 'outline'

export type BadgeSize = 'sm' | 'md'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  children: ReactNode
}

export const Badge = ({
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  className,
  ...props
}: BadgeProps) => {
  const variantClass = {
    default: styles.variantDefault,
    success: styles.variantSuccess,
    warning: styles.variantWarning,
    error: styles.variantError,
    info: styles.variantInfo,
    luxury: styles.variantLuxury,
    outline: styles.variantOutline,
  }[variant]

  const sizeClass = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
  }[size]

  return (
    <span
      className={cn(styles.badge, variantClass, sizeClass, className)}
      {...props}
    >
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  )
}

export default Badge

