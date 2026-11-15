import { forwardRef, useState, useId } from 'react'
import type { InputHTMLAttributes, FocusEvent } from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/utils/cn'
import styles from './PasswordInput.module.scss'

export interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  helperText?: string
  errorMessage?: string
  fullWidth?: boolean
  variant?: 'standard' | 'floating'
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      id,
      label,
      helperText,
      errorMessage,
      fullWidth = false,
      variant = 'standard',
      className,
      disabled,
      autoComplete = 'current-password',
      value,
      defaultValue,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const helperId = `${inputId}-helper`
    const errorId = `${inputId}-error`

    const [showPassword, setShowPassword] = useState(false)
    const [isFocused, setIsFocused] = useState(false)

    const hasError = Boolean(errorMessage)
    const describedBy = hasError
      ? errorId
      : helperText
        ? helperId
        : undefined

    const hasValue = Boolean(
      (value !== undefined && value !== null && String(value).length > 0) ||
      (defaultValue !== undefined && defaultValue !== null && String(defaultValue).length > 0),
    )

    const isFloating = isFocused || hasValue

    const togglePasswordVisibility = () => {
      if (!disabled) {
        setShowPassword((prev) => !prev)
      }
    }

    const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      onFocus?.(e)
    }

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      onBlur?.(e)
    }

    // 1. Chế độ FLOATING LABEL (Minimalist cho Trang Đăng nhập & Đăng ký)
    if (variant === 'floating') {
      return (
        <div
          className={cn(
            styles.floatingGroup,
            fullWidth && styles.fullWidth,
            isFloating && styles.isFloating,
            className,
          )}
        >
          <div
            className={cn(
              styles.floatingWrapper,
              hasError && styles.floatingError,
            )}
          >
            <input
              id={inputId}
              ref={ref}
              type={showPassword ? 'text' : 'password'}
              disabled={disabled}
              placeholder=" " // Khoảng trắng đơn cho selector CSS :not(:placeholder-shown)
              autoComplete={autoComplete}
              value={value}
              defaultValue={defaultValue}
              onFocus={handleFocus}
              onBlur={handleBlur}
              aria-invalid={hasError}
              aria-describedby={describedBy}
              className={styles.floatingInput}
              {...props}
            />

            {label && (
              <label htmlFor={inputId} className={styles.floatingLabel}>
                {label}
              </label>
            )}

            <button
              type="button"
              onClick={togglePasswordVisibility}
              disabled={disabled}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              aria-pressed={showPassword}
              tabIndex={0}
              className={styles.floatingToggleButton}
            >
              {showPassword ? (
                <EyeOff size={16} aria-hidden="true" />
              ) : (
                <Eye size={16} aria-hidden="true" />
              )}
            </button>
          </div>

          {hasError && (
            <div id={errorId} role="alert" className={styles.floatingErrorRow}>
              <AlertCircle size={13} className={styles.floatingErrorIcon} aria-hidden="true" />
              <span className={styles.floatingErrorText}>{errorMessage}</span>
            </div>
          )}

          {!hasError && helperText && (
            <div id={helperId} className={styles.floatingHelperRow}>
              <span className={styles.floatingHelperText}>{helperText}</span>
            </div>
          )}
        </div>
      )
    }

    // 2. Chế độ STANDARD (Giữ nguyên 100% cho các trang Checkout, Đổi mật khẩu tài khoản...)
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
            value={value}
            defaultValue={defaultValue}
            onFocus={onFocus}
            onBlur={onBlur}
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
