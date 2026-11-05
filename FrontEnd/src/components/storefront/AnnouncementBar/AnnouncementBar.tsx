import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { ANNOUNCEMENT_CONFIG } from '@/config/navigation'
import styles from './AnnouncementBar.module.scss'

export const AnnouncementBar = () => {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return !sessionStorage.getItem(ANNOUNCEMENT_CONFIG.storageKey)
    } catch {
      return true
    }
  })

  const handleDismiss = () => {
    setIsVisible(false)
    try {
      sessionStorage.setItem(ANNOUNCEMENT_CONFIG.storageKey, 'true')
    } catch {
      // Silently ignore storage errors
    }
  }

  if (!isVisible) {
    return null
  }

  return (
    <aside className={styles.announcementBar} aria-label="Thông báo ưu đãi">
      <div className={styles.contentWrapper}>
        <span className={styles.textFull}>{ANNOUNCEMENT_CONFIG.text}</span>
        <span className={styles.textShort}>{ANNOUNCEMENT_CONFIG.shortText}</span>
        {ANNOUNCEMENT_CONFIG.linkTo && (
          <Link to={ANNOUNCEMENT_CONFIG.linkTo} className={styles.link}>
            {ANNOUNCEMENT_CONFIG.linkText}
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Đóng thông báo"
        className={styles.dismissButton}
      >
        <X size={15} />
      </button>
    </aside>
  )
}

export default AnnouncementBar
