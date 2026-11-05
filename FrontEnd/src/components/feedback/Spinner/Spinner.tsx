import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import styles from './Spinner.module.scss'

export type SpinnerSize = 'sm' | 'md' | 'lg'
export type SpinnerVariant = 'dark' | 'light' | 'bronze'

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: SpinnerSize
  variant?: SpinnerVariant
  label?: string
}

export const Spinner = ({
  size = 'md',
  variant = 'dark',
  label = 'Loading',
  className,
  ...props
}: SpinnerProps) => {
  const sizeClass = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
  }[size]

  const variantClass = {
    dark: styles.variantDark,
    light: styles.variantLight,
    bronze: styles.variantBronze,
  }[variant]

  return (
    <span
      role="status"
      aria-label={label}
      className={cn(styles.spinner, sizeClass, variantClass, className)}
      {...props}
    >
      <span className="visually-hidden">{label}</span>
    </span>
  )
}

export default Spinner

