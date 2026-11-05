import { forwardRef, useId } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import styles from './Textarea.module.scss'

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helperText?: string
  errorMessage?: string
  fullWidth?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      id,
      label,
      helperText,
      errorMessage,
      fullWidth = false,
      className,
      disabled,
      rows = 4,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId()
    const textareaId = id || generatedId
    const helperId = `${textareaId}-helper`
    const errorId = `${textareaId}-error`

    const hasError = Boolean(errorMessage)
    const describedBy = hasError
      ? errorId
      : helperText
        ? helperId
        : undefined

    return (
      <div className={cn(styles.textareaGroup, fullWidth && styles.fullWidth)}>
        {label && (
          <label htmlFor={textareaId} className={styles.label}>
            {label}
          </label>
        )}

        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          className={cn(
            styles.textarea,
            hasError && styles.hasError,
            className,
          )}
          {...props}
        />

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

Textarea.displayName = 'Textarea'

export default Textarea

