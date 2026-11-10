import { useState, useRef, useEffect, useCallback, useId } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'
import { Spinner } from '@/components/feedback'
import { cn } from '@/utils/cn'
import styles from './RowActionsMenu.module.scss'

export interface RowActionMenuItem {
  key: string
  label: string
  icon?: ReactNode
  danger?: boolean
  dividerBefore?: boolean
  disabled?: boolean
  onClick: () => void
}

export interface RowActionsMenuProps {
  items: RowActionMenuItem[]
  triggerAriaLabel: string
  disabled?: boolean
  isLoading?: boolean
  buttonSize?: 'md' | 'lg'
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

export const RowActionsMenu = ({
  items,
  triggerAriaLabel,
  disabled = false,
  isLoading = false,
  buttonSize = 'md',
  isOpen: controlledIsOpen,
  onOpenChange,
  className,
}: RowActionsMenuProps) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isControlled = typeof controlledIsOpen === 'boolean'
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen

  const setOpen = useCallback(
    (open: boolean) => {
      if (!isControlled) {
        setInternalIsOpen(open)
      }
      onOpenChange?.(open)
    },
    [isControlled, onOpenChange],
  )

  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const [position, setPosition] = useState<{ top: number; left: number; flipTop: boolean } | null>(
    null,
  )
  const [focusedIndex, setFocusedIndex] = useState(-1)

  const uniqueId = useId()
  const buttonId = `row-actions-btn-${uniqueId}`
  const menuId = `row-actions-menu-${uniqueId}`

  // Tính toán vị trí dropdown (Fixed position + Auto flip & align)
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return null
    const rect = triggerRef.current.getBoundingClientRect()

    // Bảo vệ: nếu nút trigger không có kích thước thực (bị ẩn hoặc display:none) hoặc không có trong DOM
    if (rect.width === 0 || rect.height === 0 || !document.body.contains(triggerRef.current)) {
      return null
    }

    const menuEl = menuRef.current
    const menuWidth = menuEl ? menuEl.offsetWidth : buttonSize === 'lg' ? 220 : 190
    const menuHeight = menuEl ? menuEl.offsetHeight : 95
    const margin = 4

    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const flipTop = spaceBelow < menuHeight + margin && spaceAbove >= menuHeight

    const top = flipTop ? rect.top - menuHeight - margin : rect.bottom + margin
    let left = rect.right - menuWidth

    if (left < 8) left = 8
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8
    }

    return {
      top: Math.round(top),
      left: Math.round(left),
      flipTop,
    }
  }, [buttonSize])

  // Lắng nghe sự kiện click ngoài, scroll, resize để tự động đóng
  useEffect(() => {
    if (!isOpen) return

    const handleClose = () => {
      setOpen(false)
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleClose)
    window.addEventListener('scroll', handleClose, true)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleClose)
      window.removeEventListener('scroll', handleClose, true)
    }
  }, [isOpen, setOpen])

  // Điều hướng focus giữa các mục menu
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.focus()
    }
  }, [isOpen, focusedIndex])

  // Xử lý phím tắt trên nút Kebab
  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return

    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const pos = calculatePosition()
      if (!pos) return
      setPosition(pos)
      setOpen(true)
      setFocusedIndex(0)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const pos = calculatePosition()
      if (!pos) return
      setPosition(pos)
      setOpen(true)
      setFocusedIndex(items.length - 1)
    }
  }

  const handleToggle = () => {
    if (disabled || isLoading) return
    const next = !isOpen
    if (next) {
      const pos = calculatePosition()
      if (!pos) return
      setPosition(pos)
      setOpen(true)
      setFocusedIndex(0)
    } else {
      setOpen(false)
    }
  }

  const handleItemClick = (item: RowActionMenuItem) => {
    if (item.disabled) return
    // Đóng menu trước khi gọi handler của item (ví dụ mở modal confirm)
    setOpen(false)
    item.onClick()
  }

  const sizeClass = buttonSize === 'lg' ? styles.sizeLg : styles.sizeMd

  return (
    <>
      <button
        ref={triggerRef}
        id={buttonId}
        type="button"
        className={cn(styles.kebabBtn, sizeClass, isOpen && styles.active, className)}
        title={triggerAriaLabel}
        aria-label={triggerAriaLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        disabled={disabled || isLoading}
        onClick={handleToggle}
        onKeyDown={handleTriggerKeyDown}
      >
        {isLoading ? (
          <Spinner size="sm" />
        ) : (
          <MoreVertical size={buttonSize === 'lg' ? 20 : 18} />
        )}
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-labelledby={buttonId}
            tabIndex={-1}
            className={cn(
              styles.dropdownMenu,
              buttonSize === 'lg' && styles.mobileMenu,
            )}
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setFocusedIndex((prev) => (prev + 1) % items.length)
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setFocusedIndex((prev) => (prev - 1 + items.length) % items.length)
              } else if (e.key === 'Home') {
                e.preventDefault()
                setFocusedIndex(0)
              } else if (e.key === 'End') {
                e.preventDefault()
                setFocusedIndex(items.length - 1)
              } else if (e.key === 'Tab') {
                setOpen(false)
              }
            }}
          >
            {items.map((item, index) => (
              <div key={item.key}>
                {item.dividerBefore && <div className={styles.divider} role="separator" />}
                <button
                  ref={(el) => {
                    itemRefs.current[index] = el
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={focusedIndex === index ? 0 : -1}
                  className={cn(
                    styles.menuItem,
                    item.danger && styles.dangerItem,
                    focusedIndex === index && styles.focused,
                  )}
                  disabled={item.disabled}
                  onClick={() => handleItemClick(item)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
