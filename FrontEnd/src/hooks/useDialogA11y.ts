import { useEffect, useRef } from 'react'

export interface UseDialogA11yOptions {
  isOpen: boolean
  onClose: () => void
  closeOnEsc?: boolean
  containerRef: React.RefObject<HTMLElement | null>
  initialFocusRef?: React.RefObject<HTMLElement | null>
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useDialogA11y({
  isOpen,
  onClose,
  closeOnEsc = true,
  containerRef,
  initialFocusRef,
}: UseDialogA11yOptions) {
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  // 1. Manage body scroll lock and focus restore
  useEffect(() => {
    if (!isOpen) return

    // Save triggering active element to restore focus when dialog closes
    previousActiveElementRef.current = document.activeElement as HTMLElement | null

    // Lock background scrolling
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Initial focus: custom target or first focusable element inside container
    const timer = setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus()
      } else if (containerRef.current) {
        const focusables = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        if (focusables.length > 0) {
          focusables[0].focus()
        } else {
          containerRef.current.focus()
        }
      }
    }, 50)

    return () => {
      clearTimeout(timer)
      document.body.style.overflow = originalOverflow

      // Restore focus to previous active element
      if (
        previousActiveElementRef.current &&
        typeof previousActiveElementRef.current.focus === 'function'
      ) {
        previousActiveElementRef.current.focus()
      }
    }
  }, [isOpen, containerRef, initialFocusRef])

  // 2. Keyboard listeners: Escape key and Focus Trap (Tab cycling)
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key to close
      if (event.key === 'Escape' && closeOnEsc) {
        event.stopPropagation()
        onClose()
        return
      }

      // Focus trap for Tab and Shift+Tab
      if (event.key === 'Tab' && containerRef.current) {
        const focusableElements = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        )

        if (focusableElements.length === 0) {
          event.preventDefault()
          return
        }

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (event.shiftKey) {
          // Shift + Tab: if on first element, wrap around to last
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement.focus()
          }
        } else {
          // Tab: if on last element, wrap around to first
          if (document.activeElement === lastElement) {
            event.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeOnEsc, onClose, containerRef])
}

export default useDialogA11y

