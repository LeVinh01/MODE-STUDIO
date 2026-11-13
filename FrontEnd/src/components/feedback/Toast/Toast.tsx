import { useEffect } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import styles from './Toast.module.scss'

export type ToastType = 'error' | 'success' | 'info'

export interface ToastProps {
  isOpen: boolean
  message: string
  type?: ToastType
  duration?: number
  onClose: () => void
}

export const Toast = ({
  isOpen,
  message,
  type = 'error',
  duration = 4000,
  onClose,
}: ToastProps) => {
  useEffect(() => {
    if (!isOpen || duration <= 0) return

    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [isOpen, duration, onClose])

  if (!isOpen || !message) return null

  const typeClass =
    type === 'error'
      ? styles.toastError
      : type === 'success'
        ? styles.toastSuccess
        : styles.toastInfo

  return (
    <div
      className={cn(styles.toastContainer, typeClass)}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      {type === 'error' && (
        <AlertCircle size={20} className={styles.icon} aria-hidden="true" />
      )}
      {type === 'success' && (
        <CheckCircle2 size={20} className={styles.icon} aria-hidden="true" />
      )}
      {type === 'info' && (
        <Info size={20} className={styles.icon} aria-hidden="true" />
      )}

      <span className={styles.message}>{message}</span>

      <button
        type="button"
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Đóng thông báo"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}
