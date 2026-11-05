import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { Spinner } from '@/components/feedback/Spinner'
import styles from './Button.module.scss'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface BaseButtonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
  children?: ReactNode
  className?: string
  to?: string
  href?: string
}

export type ButtonProps = BaseButtonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseButtonProps> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseButtonProps>

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      className,
      disabled,
      to,
      href,
      type = 'button',
      ...rest
    },
    ref,
  ) => {
    const isInteractiveDisabled = disabled || isLoading

    const variantClass = {
      primary: styles.variantPrimary,
      secondary: styles.variantSecondary,
      ghost: styles.variantGhost,
      link: styles.variantLink,
    }[variant]

    const sizeClass = {
      sm: styles.sizeSm,
      md: styles.sizeMd,
      lg: styles.sizeLg,
    }[size]

    const spinnerVariant = variant === 'primary' ? 'light' : 'dark'
    const spinnerSize = size === 'lg' ? 'md' : 'sm'

    const classNames = cn(
      styles.button,
      variantClass,
      sizeClass,
      fullWidth && styles.fullWidth,
      isLoading && styles.loading,
      isInteractiveDisabled && styles.disabled,
      className,
    )

    const content = (
      <>
        {isLoading && (
          <Spinner
            size={spinnerSize}
            variant={spinnerVariant}
            label="Đang tải..."
          />
        )}
        {!isLoading && leftIcon && <span className={styles.icon}>{leftIcon}</span>}
        {children && <span className={styles.contentWrapper}>{children}</span>}
        {!isLoading && rightIcon && <span className={styles.icon}>{rightIcon}</span>}
      </>
    )

    if (to) {
      return (
        <Link
          to={to}
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={classNames}
          aria-disabled={isInteractiveDisabled}
          tabIndex={isInteractiveDisabled ? -1 : undefined}
          {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </Link>
      )
    }

    if (href) {
      return (
        <a
          href={href}
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={classNames}
          aria-disabled={isInteractiveDisabled}
          tabIndex={isInteractiveDisabled ? -1 : undefined}
          {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </a>
      )
    }

    return (
      <button
        type={type}
        ref={ref as React.Ref<HTMLButtonElement>}
        disabled={isInteractiveDisabled}
        aria-busy={isLoading}
        className={classNames}
        {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {content}
      </button>
    )
  },
)

Button.displayName = 'Button'

export default Button

