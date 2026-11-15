import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useMediaQuery } from '@/hooks'
import { AUTH_IMAGES } from '@/config/authImages'
import styles from './AuthSplitLayout.module.scss'

export interface AuthSplitLayoutProps {
  imagePosition: 'left' | 'right'
  imageSrc?: string
  children: ReactNode
}

/**
 * Component AuthSplitLayout:
 * - imagePosition 'left': Ảnh bên TRÁI, Form bên PHẢI (dùng cho Đăng ký).
 * - imagePosition 'right': Form bên TRÁI, Ảnh bên PHẢI (dùng cho Đăng nhập).
 * - Nút mũi tên ArrowLeft cố định góc trên bên trái màn hình (vùng bấm >= 44px, z-index cao).
 * - Desktop (>= 900px): Chia 2 cột 50/50, cột chứa form max-width 380-400px căn lề trái.
 * - Mobile (< 900px): Tháo hoàn toàn cột ảnh (không render ảnh), chỉ render cột form.
 * - Hiệu ứng trượt hoán đổi vị trí CSS transform 450ms mượt mà, tôn trọng prefers-reduced-motion.
 */
export const AuthSplitLayout = ({
  imagePosition,
  imageSrc = AUTH_IMAGES.login,
  children,
}: AuthSplitLayoutProps) => {
  const navigate = useNavigate()
  // Mobile (< 900px): BẮT BUỘC dùng useMediaQuery để tháo hoàn toàn cột ảnh
  const isDesktop = useMediaQuery('(min-width: 900px)')
  const [imageFailed, setImageFailed] = useState(false)

  // Đặt lại cờ lỗi khi imageSrc thay đổi
  const [prevSrc, setPrevSrc] = useState(imageSrc)
  if (prevSrc !== imageSrc) {
    setPrevSrc(imageSrc)
    setImageFailed(false)
  }

  // Hành vi nút quay lại: có lịch sử trong app thì navigate(-1), mở thẳng thì về '/'
  const handleBack = () => {
    if (
      typeof window !== 'undefined' &&
      window.history.state &&
      typeof window.history.state.idx === 'number' &&
      window.history.state.idx > 0
    ) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <div
      className={styles.authContainer}
      data-image-position={imagePosition}
    >
      {/* 3. NÚT QUAY LẠI: Cố định góc trên bên trái, vùng bấm >= 44px, hiển thị trên cả desktop & mobile */}
      <button
        type="button"
        onClick={handleBack}
        className={styles.backButton}
        aria-label="Quay lại"
      >
        <ArrowLeft size={20} aria-hidden="true" />
      </button>

      {/* 1. FORM COLUMN: Desktop 50% width, form max-width 380-400px, text-left */}
      <main id="main-content" className={styles.formPanel}>
        <div className={styles.formScrollContainer}>
          <div className={styles.formContent}>{children}</div>
        </div>
      </main>

      {/* 2. IMAGE COLUMN: Chỉ render trên màn hình >= 900px */}
      {isDesktop && (
        <aside className={styles.imagePanel} aria-hidden="true">
          <div className={styles.imageInner}>
            {!imageFailed ? (
              <img
                src={imageSrc}
                alt=""
                className={styles.authImage}
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className={styles.brandFallback}>
                <div className={styles.brandFallbackFrame}>
                  <span className={styles.brandMonogram}>MODE STUDIO</span>
                  <span className={styles.brandTagline}>
                    MAY ĐO &amp; THIẾT KẾ CAO CẤP
                  </span>
                  <span className={styles.brandSeason}>THU / ĐÔNG 2026</span>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  )
}

export default AuthSplitLayout
