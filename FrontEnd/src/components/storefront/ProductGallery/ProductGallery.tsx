import { useState, useMemo, useRef, useEffect, type UIEvent } from 'react'
import { ZoomIn } from 'lucide-react'
import type { ProductImage } from '@/types/product'
import { useMediaQuery } from '@/hooks'
import { ImageLightbox } from '@/components/storefront/ImageLightbox'
import { cn } from '@/utils/cn'
import styles from './ProductGallery.module.scss'

export interface ProductGalleryProps {
  images: ProductImage[]
  selectedColorId?: number | null
  productName: string
  onImageClick?: (index: number) => void
}

export const ProductGallery = ({
  images,
  selectedColorId,
  productName,
  onImageClick,
}: ProductGalleryProps) => {
  const isDesktop = useMediaQuery('(min-width: 900px)')
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const sliderRef = useRef<HTMLDivElement>(null)

  const handleOpenLightbox = (index: number) => {
    if (onImageClick) {
      onImageClick(index)
      return
    }
    setLightboxIndex(index)
    setIsLightboxOpen(true)
  }

  // 1. Lọc ảnh theo màu đang chọn hoặc toàn bộ ảnh nếu không phân màu
  const displayImages = useMemo(() => {
    if (!images || images.length === 0) return []

    if (selectedColorId !== undefined && selectedColorId !== null) {
      const colorSpecific = images.filter(
        (img) => img.colorId === selectedColorId,
      )
      if (colorSpecific.length > 0) {
        return colorSpecific
      }
    }

    return images
  }, [images, selectedColorId])

  // Reset thanh cuộn mobile và activeIndex khi đổi màu sắc (state adjustment during render)
  const [prevColorId, setPrevColorId] = useState(selectedColorId)
  if (prevColorId !== selectedColorId) {
    setPrevColorId(selectedColorId)
    setActiveIndex(0)
  }

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.scrollTo({ left: 0, behavior: 'instant' })
    }
  }, [selectedColorId])

  // Theo dõi vị trí cuộn trên mobile để cập nhật chấm chỉ số
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    const width = target.clientWidth || 1
    const newIdx = Math.round(target.scrollLeft / width)
    if (newIdx !== activeIndex && newIdx >= 0 && newIdx < displayImages.length) {
      setActiveIndex(newIdx)
    }
  }

  if (displayImages.length === 0) {
    return (
      <div className={styles.galleryContainer} aria-label="Thư viện hình ảnh sản phẩm">
        <div className={styles.noImageFallback}>Chưa có hình ảnh</div>
      </div>
    )
  }

  return (
    <div className={styles.galleryContainer} aria-label="Thư viện hình ảnh sản phẩm">
      {/* DESKTOP (>= 900px):
          Hiển thị toàn bộ ảnh của màu đã chọn xếp dọc theo 1 cột duy nhất (width 100%, tỉ lệ 3:4, gap 4px).
      */}
      {isDesktop ? (
        <div className={styles.desktopGallery}>
          {displayImages.map((img, idx) => (
            <button
              key={img.id || idx}
              type="button"
              className={styles.imageItem}
              onClick={() => handleOpenLightbox(idx)}
              aria-label={`Xem ảnh lớn: ${img.altText || `${productName} – Góc nhìn ${idx + 1}`}`}
            >
              <img
                src={img.url}
                alt={img.altText || `${productName} – Góc nhìn ${idx + 1}`}
                className={styles.image}
                loading={idx === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
              <div className={styles.zoomHint} aria-hidden="true">
                <ZoomIn size={16} />
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* MOBILE (< 900px): Vuốt ngang scroll-snap 1 ảnh/màn hình kèm chấm chỉ số */
        <div className={styles.mobileSliderContainer}>
          <div
            ref={sliderRef}
            className={styles.mobileSlider}
            onScroll={handleScroll}
          >
            {displayImages.map((img, idx) => (
              <button
                key={img.id || idx}
                type="button"
                className={styles.mobileSlide}
                onClick={() => handleOpenLightbox(idx)}
                aria-label={`Xem ảnh lớn: ${img.altText || `${productName} – Góc nhìn ${idx + 1}`}`}
              >
                <img
                  src={img.url}
                  alt={img.altText || `${productName} – Góc nhìn ${idx + 1}`}
                  className={styles.image}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </button>
            ))}
          </div>

          {/* Dải chấm chỉ số nhỏ dưới ảnh khi có nhiều hơn 1 ảnh */}
          {displayImages.length > 1 && (
            <div className={styles.dotsIndicator} aria-hidden="true">
              {displayImages.map((_, idx) => (
                <span
                  key={idx}
                  className={cn(
                    styles.dot,
                    activeIndex === idx && styles.activeDot,
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* FULL-SCREEN IMAGE LIGHTBOX ALBUM */}
      <ImageLightbox
        isOpen={isLightboxOpen}
        images={displayImages}
        initialIndex={lightboxIndex}
        onClose={() => setIsLightboxOpen(false)}
        productName={productName}
      />
    </div>
  )
}

export default ProductGallery
