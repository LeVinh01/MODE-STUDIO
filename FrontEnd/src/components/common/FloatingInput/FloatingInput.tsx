import { forwardRef, useId, useState } from 'react'
import type { InputHTMLAttributes, FocusEvent } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/utils/cn'
import styles from './FloatingInput.module.scss'

export interface FloatingInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'placeholder'> {
  label: string
  helperText?: string
  errorMessage?: string
  fullWidth?: boolean
}

/**
 * Component FloatingInput:
 * - Lúc đầu nhãn nằm TRONG ô nhập, chữ hoa, màu xám nhạt như placeholder.
 * - Khi focus, có ký tự, hoặc browser autofill: nhãn thu nhỏ (~11px) trượt lên trên.
 * - Trạng thái lỗi: đường gạch chân đỏ + icon AlertCircle + thông báo ngay dưới.
 */
export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  (
    {
      id,
      label,
      helperText,
      errorMessage,
      fullWidth = false,
      className,
      disabled,
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

    const [isFocused, setIsFocused] = useState(false)

    // Xác định ô đã có giá trị (state controlled hoặc uncontrolled)
    const hasValue = Boolean(
      (value !== undefined && value !== null && String(value).length > 0) ||
      (defaultValue !== undefined && defaultValue !== null && String(defaultValue).length > 0),
    )

    const isFloating = isFocused || hasValue
    const hasError = Boolean(errorMessage)

    const describedBy = hasError
      ? errorId
      : helperText
        ? helperId
        : undefined

    const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      onFocus?.(e)
    }

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      onBlur?.(e)
    }

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
            styles.inputWrapper,
            hasError && styles.hasError,
          )}
        >
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            placeholder=" " // Khoảng trắng đơn để :not(:placeholder-shown) CSS hoạt động
            value={value}
            defaultValue={defaultValue}
            onFocus={handleFocus}
            onBlur={handleBlur}
            aria-invalid={hasError}
            aria-describedby={describedBy}
            className={styles.input}
            {...props}
          />

          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        </div>

        {hasError && (
          <div id={errorId} role="alert" className={styles.errorRow}>
            <AlertCircle size={13} className={styles.errorIcon} aria-hidden="true" />
            <span className={styles.errorText}>{errorMessage}</span>
          </div>
        )}

        {!hasError && helperText && (
          <div id={helperId} className={styles.helperRow}>
            <span className={styles.helperText}>{helperText}</span>
          </div>
        )}
      </div>
    )
  },
)

FloatingInput.displayName = 'FloatingInput'

export default FloatingInput
