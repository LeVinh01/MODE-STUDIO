import { useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useDialogA11y } from '@/hooks/useDialogA11y'
import styles from './Drawer.module.scss'

export type DrawerPosition = 'left' | 'right'
export type DrawerSize = 'sm' | 'md' | 'lg'

export interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  position?: DrawerPosition
  title?: ReactNode
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: DrawerSize
  closeOnOverlayClick?: boolean
  closeOnEsc?: boolean
  showCloseButton?: boolean
  className?: string
}

export const Drawer = ({
  isOpen,
  onClose,
  position = 'left',
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEsc = true,
  showCloseButton = true,
  className,
}: DrawerProps) => {
  const generatedId = useId()
  const titleId = `${generatedId}-drawer-title`
  const descId = `${generatedId}-drawer-desc`

  const drawerRef = useRef<HTMLDivElement>(null)

  // Manage scroll lock, focus trap, and Esc key
  useDialogA11y({
    isOpen,
    onClose,
    closeOnEsc,
    containerRef: drawerRef,
  })

  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose()
    }
  }

  const positionClass =
    position === 'right' ? styles.positionRight : styles.positionLeft

  const sizeClass = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
  }[size]

  const drawerContent = (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      data-testid="drawer-backdrop"
    >
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(styles.drawerDialog, positionClass, sizeClass, className)}
      >
        {(title || showCloseButton) && (
          <div className={styles.header}>
            <div className={styles.headerContent}>
              {title && (
                <h3 id={titleId} className={styles.title}>
                  {title}
                </h3>
              )}
              {description && (
                <p id={descId} className={styles.description}>
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng bảng chọn"
                className={styles.closeButton}
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        <div className={styles.body}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  )

  return createPortal(drawerContent, document.body)
}

export default Drawer

