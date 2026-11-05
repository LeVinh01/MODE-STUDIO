import type { HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import styles from './Breadcrumbs.module.scss'

export interface BreadcrumbItem {
  label: string
  to?: string
  href?: string
}

export interface BreadcrumbsProps extends HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[]
  separator?: ReactNode
  ariaLabel?: string
}

export const Breadcrumbs = ({
  items,
  separator = <ChevronRight size={14} />,
  ariaLabel = 'Đường dẫn liên kết',
  className,
  ...props
}: BreadcrumbsProps) => {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(styles.breadcrumbsNav, className)}
      {...props}
    >
      <ol className={styles.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={`${item.label}-${index}`} className={styles.item}>
              {isLast ? (
                <span
                  aria-current="page"
                  className={styles.currentPage}
                >
                  {item.label}
                </span>
              ) : item.to ? (
                <Link to={item.to} className={styles.link}>
                  {item.label}
                </Link>
              ) : item.href ? (
                <a href={item.href} className={styles.link}>
                  {item.label}
                </a>
              ) : (
                <span className={styles.link}>{item.label}</span>
              )}

              {!isLast && (
                <span className={styles.separator} aria-hidden="true">
                  {separator}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumbs

