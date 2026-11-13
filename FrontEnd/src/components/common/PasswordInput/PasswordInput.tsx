import { forwardRef, useState, useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/utils/cn'
import styles from './PasswordInput.module.scss'

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  helperText?: string
  errorMessage?: string
  fullWidth?: boolean
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      id,
      label,
      helperText,
      errorMessage,
      fullWidth = false,
      className,
      disabled,
      autoComplete = 'current-password',
      ...props
    },
    ref,
  ) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const helperId = `${inputId}-helper`
    const errorId = `${inputId}-error`

    const [showPassword, setShowPassword] = useState(false)

    const hasError = Boolean(errorMessage)
    const describedBy = hasError
      ? errorId
      : helperText
        ? helperId
        : undefined

    const togglePasswordVisibility = () => {
      if (!disabled) {
        setShowPassword((prev) => !prev)
      }
    }

    return (
      <div className={cn(styles.inputGroup, fullWidth && styles.fullWidth)}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}

        <div className={styles.inputWrapper}>
          <input
            id={inputId}
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            disabled={disabled}
            autoComplete={autoComplete}
            aria-invalid={hasError}
            aria-describedby={describedBy}
            className={cn(
              styles.input,
              hasError && styles.hasError,
              className,
            )}
            {...props}
          />

          <button
            type="button"
            onClick={togglePasswordVisibility}
            disabled={disabled}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={showPassword}
            tabIndex={0}
            className={styles.toggleButton}
          >
            {showPassword ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
          </button>
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

PasswordInput.displayName = 'PasswordInput'

export default PasswordInput
