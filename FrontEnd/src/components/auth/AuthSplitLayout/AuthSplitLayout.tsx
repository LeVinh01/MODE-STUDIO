import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useMediaQuery } from '@/hooks'
import { AUTH_IMAGES, type AuthImageData } from '@/config/authImages'
import { BRAND_NAME } from '@/config/brand'
import { cn } from '@/utils/cn'
import styles from './AuthSplitLayout.module.scss'

export interface AuthSplitLayoutProps {
  imagePosition: 'left' | 'right'
  imageData?: AuthImageData
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
  imageData,
  imageSrc,
  children,
}: AuthSplitLayoutProps) => {
  const navigate = useNavigate()
  // Mobile (< 900px): BẮT BUỘC dùng useMediaQuery để tháo hoàn toàn cột ảnh
  const isDesktop = useMediaQuery('(min-width: 900px)')

  // Xác định cấu hình ảnh hiện tại
  const currentImage: AuthImageData = imageData || {
    src: imageSrc || AUTH_IMAGES.login.src,
    alt: AUTH_IMAGES.login.alt,
    objectPosition: AUTH_IMAGES.login.objectPosition,
  }

  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  // Đặt lại cờ lỗi và tải khi src thay đổi
  const [prevSrc, setPrevSrc] = useState(currentImage.src)
  if (prevSrc !== currentImage.src) {
    setPrevSrc(currentImage.src)
    setImageLoaded(false)
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
            {/* Fallback card: hiển thị khi ảnh chưa tải xong hoặc khi tải ảnh thất bại */}
            {(!imageLoaded || imageFailed) && (
              <div className={styles.brandFallback}>
                <div className={styles.brandFallbackFrame}>
                  <span className={styles.brandMonogram}>{BRAND_NAME}</span>
                  <span className={styles.brandTagline}>
                    MAY ĐO &amp; THIẾT KẾ CAO CẤP
                  </span>
                  <span className={styles.brandSeason}>THU / ĐÔNG 2026</span>
                </div>
              </div>
            )}

            {!imageFailed && (
              <>
                <img
                  src={currentImage.src}
                  alt={currentImage.alt}
                  width={765}
                  height={1024}
                  loading="eager"
                  fetchPriority="high"
                  style={{ objectPosition: currentImage.objectPosition }}
                  className={cn(styles.authImage, imageLoaded && styles.authImageLoaded)}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageFailed(true)}
                />
                {imageLoaded && (
                  <div className={styles.imageOverlay} aria-hidden="true" />
                )}
              </>
            )}
          </div>
        </aside>
      )}
    </div>
  )
}

export default AuthSplitLayout
