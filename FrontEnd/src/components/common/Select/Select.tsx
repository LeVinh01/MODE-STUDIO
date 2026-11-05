import { forwardRef, useId } from 'react'
import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import styles from './Select.module.scss'

export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  helperText?: string
  errorMessage?: string
  options?: SelectOption[]
  placeholder?: string
  fullWidth?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      id,
      label,
      helperText,
      errorMessage,
      options,
      placeholder,
      children,
      fullWidth = false,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId()
    const selectId = id || generatedId
    const helperId = `${selectId}-helper`
    const errorId = `${selectId}-error`

    const hasError = Boolean(errorMessage)
    const describedBy = hasError
      ? errorId
      : helperText
        ? helperId
        : undefined

    return (
      <div className={cn(styles.selectGroup, fullWidth && styles.fullWidth)}>
        {label && (
          <label htmlFor={selectId} className={styles.label}>
            {label}
          </label>
        )}

        <div className={styles.selectWrapper}>
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={describedBy}
            className={cn(
              styles.select,
              hasError && styles.hasError,
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}

            {options
              ? options.map((opt) => (
                  <option
                    key={String(opt.value)}
                    value={opt.value}
                    disabled={opt.disabled}
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <span className={styles.chevron} aria-hidden="true">
            <ChevronDown size={16} />
          </span>
        </div>

        {hasError && (
          <span id={errorId} role="alert" className={styles.errorMessage}>
            {errorMessage}
          </span>
        )}

        {!hasError && helperText && (
          <span id={helperId} className={styles.helperText}>
            {helperText}
          </span>
        )}
      </div>
    )
  },
)

Select.displayName = 'Select'

export default Select

