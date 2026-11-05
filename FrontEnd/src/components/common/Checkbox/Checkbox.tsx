import { forwardRef, useEffect, useId, useRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/utils/cn'
import styles from './Checkbox.module.scss'

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode
  helperText?: string
  errorMessage?: string
  indeterminate?: boolean
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      id,
      label,
      helperText,
      errorMessage,
      indeterminate = false,
      checked,
      disabled,
      className,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId()
    const checkboxId = id || generatedId
    const helperId = `${checkboxId}-helper`
    const errorId = `${checkboxId}-error`

    const innerRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
      const element = (ref && 'current' in ref && ref.current) || innerRef.current
      if (element) {
        element.indeterminate = indeterminate
      }
    }, [indeterminate, ref])

    const setRefs = (node: HTMLInputElement | null) => {
      innerRef.current = node
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref && 'current' in ref) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(ref as any).current = node
      }
    }

    const hasError = Boolean(errorMessage)
    const describedBy = hasError
      ? errorId
      : helperText
        ? helperId
        : undefined

    return (
      <div className={cn(styles.checkboxContainer, className)}>
        <label
          htmlFor={checkboxId}
          className={cn(
            styles.labelWrapper,
            disabled && styles.disabledWrapper,
            hasError && styles.hasError,
          )}
        >
          <input
            id={checkboxId}
            type="checkbox"
            ref={setRefs}
            checked={checked}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={describedBy}
            className={styles.nativeCheckbox}
            {...props}
          />

          <span
            className={cn(
              styles.customControl,
              indeterminate && styles.indeterminate,
            )}
            aria-hidden="true"
          >
            {indeterminate ? (
              <Minus className={styles.minusIcon} />
            ) : (
              checked && <Check className={styles.checkIcon} />
            )}
          </span>

          {label && <span className={styles.labelText}>{label}</span>}
        </label>

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

Checkbox.displayName = 'Checkbox'

export default Checkbox

