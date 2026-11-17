import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useDialogA11y } from '@/hooks/useDialogA11y'
import type { ProductImage } from '@/types/product'
import { cn } from '@/utils/cn'
import styles from './ImageLightbox.module.scss'

export interface ImageLightboxProps {
  isOpen: boolean
  images: ProductImage[]
  initialIndex?: number
  onClose: () => void
  productName?: string
}

export const ImageLightbox = ({
  isOpen,
  images,
  initialIndex = 0,
  onClose,
  productName = 'Sản phẩm',
}: ImageLightboxProps) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const activeThumbRef = useRef<HTMLButtonElement | null>(null)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isZoomed, setIsZoomed] = useState(false)
  const [hasError, setHasError] = useState(false)

  // 1. Quản lý a11y: khóa cuộn body, focus trap, phím Esc và trả focus khi đóng
  useDialogA11y({
    isOpen,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: closeBtnRef,
  })

  // 2. Đồng bộ chỉ số ảnh khi mở album hoặc danh sách ảnh thay đổi (State adjustment during render)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  const [prevInitialIndex, setPrevInitialIndex] = useState(initialIndex)

  if (prevIsOpen !== isOpen || prevInitialIndex !== initialIndex) {
    setPrevIsOpen(isOpen)
    setPrevInitialIndex(initialIndex)
    if (isOpen) {
      const validIndex = Math.max(0, Math.min(initialIndex, images.length - 1))
      setCurrentIndex(validIndex)
      setIsZoomed(false)
      setHasError(false)
    }
  }

  // 3. Điều hướng ảnh tiếp theo / trước đó
  const handleNext = useCallback(() => {
    if (images.length <= 1) return
    setIsZoomed(false)
    setHasError(false)
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }, [images.length])

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return
    setIsZoomed(false)
    setHasError(false)
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }, [images.length])

  const handleSelectIndex = (index: number) => {
    if (index === currentIndex) return
    setIsZoomed(false)
    setHasError(false)
    setCurrentIndex(index)
  }

  // 4. Preload ảnh liền kề (next / prev) để tối ưu hiệu năng
  useEffect(() => {
    if (!isOpen || images.length <= 1) return
    const nextIdx = (currentIndex + 1) % images.length
    const prevIdx = (currentIndex - 1 + images.length) % images.length
    if (images[nextIdx]?.url) {
      const nextImg = new Image()
      nextImg.src = images[nextIdx].url
    }
    if (images[prevIdx]?.url) {
      const prevImg = new Image()
      prevImg.src = images[prevIdx].url
    }
  }, [isOpen, currentIndex, images])

  // 5. Tự động cuộn thumbnail đang chọn vào giữa thanh xem trước (cả cuộn dọc trên desktop và ngang trên mobile)
  useEffect(() => {
    if (isOpen && activeThumbRef.current) {
      activeThumbRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      })
    }
  }, [isOpen, currentIndex])

  // 6. Điều hướng bằng phím ArrowLeft / ArrowRight
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleNext, handlePrev])

  // 7. Xử lý cử chỉ vuốt (touch swipe) trên thiết bị di động
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null

    // Yêu cầu vuốt ngang tối thiểu 40px và độ lệch ngang lớn hơn độ lệch dọc
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        handleNext()
      } else {
        handlePrev()
      }
    }
  }

  // 8. Đóng khi click vào vùng backdrop (không click vào ảnh hoặc nút)
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation()
    setIsZoomed((prev) => !prev)
  }

  if (!isOpen || typeof document === 'undefined' || images.length === 0) {
    return null
  }

  const currentImage = images[currentIndex] || images[0]
  const imageAlt =
    currentImage.altText ||
    `${productName} – Ảnh ${currentIndex + 1} trên ${images.length}`

  const hasMultipleImages = images.length > 1

  return createPortal(
    <div
      ref={dialogRef}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Album ảnh sản phẩm"
      tabIndex={-1}
      onClick={handleBackdropClick}
    >
      {/* NÚT ĐÓNG X Ở GÓC TRÊN BÊN PHẢI */}
      <button
        ref={closeBtnRef}
        type="button"
        onClick={onClose}
        className={styles.closeButton}
        aria-label="Đóng album ảnh"
        title="Đóng album ảnh (Esc)"
      >
        <X size={24} strokeWidth={1.5} aria-hidden="true" />
      </button>

      {/* THÂN ALBUM */}
      <div className={styles.albumBody} onClick={handleBackdropClick}>
        {/* THUMBNAIL RAIL: Cột dọc bên trái trên desktop >= 1024px, dải ngang ở dưới trên mobile < 1024px */}
        {hasMultipleImages && (
          <aside
            className={styles.thumbnailRailContainer}
            aria-label="Danh sách ảnh thu nhỏ"
            onClick={handleBackdropClick}
          >
            <div
              className={styles.thumbnailRail}
              role="tablist"
              aria-label="Danh sách ảnh thu nhỏ"
            >
              {images.map((img, idx) => {
                const isSelected = idx === currentIndex
                return (
                  <button
                    key={img.id || idx}
                    ref={isSelected ? activeThumbRef : null}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    aria-label={`Xem ảnh ${idx + 1}`}
                    className={cn(
                      styles.thumbnailButton,
                      isSelected && styles.activeThumbnail,
                    )}
                    onClick={() => handleSelectIndex(idx)}
                  >
                    <img
                      src={img.url}
                      alt=""
                      className={styles.thumbnailImage}
                      loading="lazy"
                    />
                  </button>
                )
              })}
            </div>
          </aside>
        )}

        {/* KHÔNG GIAN HIỂN THỊ CHÍNH (STAGE) */}
        <main
          className={styles.stage}
          onClick={handleBackdropClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Nút lùi ảnh (ẩn khi chỉ có 1 ảnh) */}
          {hasMultipleImages && (
            <button
              type="button"
              onClick={handlePrev}
              className={cn(styles.navButton, styles.prevButton)}
              aria-label="Xem ảnh trước"
              title="Ảnh trước (Mũi tên trái)"
            >
              <ChevronLeft size={28} strokeWidth={1.5} aria-hidden="true" />
            </button>
          )}

          {/* Khung hiển thị ảnh lớn */}
          <div className={styles.imageWrapper} onClick={handleBackdropClick}>
            {!hasError ? (
              <img
                key={currentImage.url}
                src={currentImage.url}
                alt={imageAlt}
                className={cn(styles.mainImage, isZoomed && styles.isZoomed)}
                onClick={handleImageClick}
                onError={() => setHasError(true)}
                loading="eager"
                decoding="sync"
              />
            ) : (
              <div className={styles.fallbackBox} role="alert">
                <span className={styles.fallbackBrand}>MODE STUDIO</span>
                <span>Không thể tải hình ảnh</span>
              </div>
            )}
          </div>

          {/* Nút tiến ảnh (ẩn khi chỉ có 1 ảnh) */}
          {hasMultipleImages && (
            <button
              type="button"
              onClick={handleNext}
              className={cn(styles.navButton, styles.nextButton)}
              aria-label="Xem ảnh tiếp theo"
              title="Ảnh tiếp theo (Mũi tên phải)"
            >
              <ChevronRight size={28} strokeWidth={1.5} aria-hidden="true" />
            </button>
          )}

          {/* Bộ đếm n / total nhỏ gọn ở phía dưới căn giữa */}
          {hasMultipleImages && (
            <div
              className={styles.counter}
              aria-live="polite"
              aria-atomic="true"
            >
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </main>
      </div>
    </div>,
    document.body,
  )
}

export default ImageLightbox
