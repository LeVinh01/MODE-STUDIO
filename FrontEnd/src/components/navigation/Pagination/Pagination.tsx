import { useMemo } from 'react'
import type { HTMLAttributes } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import styles from './Pagination.module.scss'

export interface PaginationProps
  extends Omit<HTMLAttributes<HTMLElement>, 'onChange'> {
  page: number
  totalPages: number
  onChange: (page: number) => void
  siblingCount?: number
  ariaLabel?: string
}

export const Pagination = ({
  page,
  totalPages,
  onChange,
  siblingCount = 1,
  ariaLabel = 'Phân trang',
  className,
  ...props
}: PaginationProps) => {
  const paginationRange = useMemo(() => {
    // Total page numbers shown = siblingCount + firstPage + lastPage + currentPage + 2*dots
    const totalPageNumbers = siblingCount + 5

    // If totalPages is smaller than the slots we want to show
    if (totalPages <= totalPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const leftSibling = Math.max(page - siblingCount, 1)
    const rightSibling = Math.min(page + siblingCount, totalPages)

    const shouldShowLeftDots = leftSibling > 2
    const shouldShowRightDots = rightSibling < totalPages - 2

    // Case 1: No left dots to show, but right dots should be shown
    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1)
      return [...leftRange, '…', totalPages]
    }

    // Case 2: No right dots to show, but left dots should be shown
    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1,
      )
      return [1, '…', ...rightRange]
    }

    // Case 3: Both left and right dots should be shown
    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSibling - leftSibling + 1 },
        (_, i) => leftSibling + i,
      )
      return [1, '…', ...middleRange, '…', totalPages]
    }

    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }, [totalPages, page, siblingCount])

  if (totalPages <= 1) {
    return null
  }

  return (
    <nav
      role="navigation"
      aria-label={ariaLabel}
      className={cn(styles.paginationNav, className)}
      {...props}
    >
      <ul className={styles.list}>
        {/* Previous page button */}
        <li className={styles.item}>
          <button
            type="button"
            onClick={() => onChange(page - 1)}
            disabled={page <= 1}
            aria-label="Trang trước"
            className={styles.navButton}
          >
            <ChevronLeft size={18} />
          </button>
        </li>

        {/* Page buttons / Ellipsis */}
        {paginationRange.map((item, index) => {
          if (item === '…') {
            return (
              <li key={`ellipsis-${index}`} className={styles.item}>
                <span className={styles.ellipsis} aria-hidden="true">
                  …
                </span>
              </li>
            )
          }

          const pageNumber = item as number
          const isCurrent = pageNumber === page

          return (
            <li key={pageNumber} className={styles.item}>
              <button
                type="button"
                onClick={() => onChange(pageNumber)}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Trang ${pageNumber}`}
                className={cn(
                  styles.pageButton,
                  isCurrent && styles.activePage,
                )}
              >
                {pageNumber}
              </button>
            </li>
          )
        })}

        {/* Next page button */}
        <li className={styles.item}>
          <button
            type="button"
            onClick={() => onChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Trang sau"
            className={styles.navButton}
          >
            <ChevronRight size={18} />
          </button>
        </li>
      </ul>
    </nav>
  )
}

export default Pagination

