import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ProductImage } from '@/types/product'
import { Badge } from '@/components/common/Badge'
import { cn } from '@/utils/cn'
import styles from './ProductGallery.module.scss'

export interface ProductGalleryProps {
  images: ProductImage[]
  selectedColorId?: number | null
  productName: string
  isOutOfStock?: boolean
  isNew?: boolean
}

export const ProductGallery = ({
  images,
  selectedColorId,
  productName,
  isOutOfStock = false,
  isNew = false,
}: ProductGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [prevColorId, setPrevColorId] = useState(selectedColorId)

  // Reset activeIndex = 0 khi selectedColorId thay đổi
  if (prevColorId !== selectedColorId) {
    setPrevColorId(selectedColorId)
    setActiveIndex(0)
  }

  // Lọc danh sách ảnh theo màu đang chọn hoặc ảnh dùng chung (colorId === null)
  const displayImages = useMemo(() => {
    if (!images || images.length === 0) return []

    if (selectedColorId !== undefined && selectedColorId !== null) {
      const colorSpecific = images.filter(
        (img) => img.colorId === selectedColorId || img.colorId === null,
      )
      if (colorSpecific.length > 0) {
        return colorSpecific
      }
    }

    return images
  }, [images, selectedColorId])

  // Đảm bảo activeIndex hợp lệ trong giới hạn mảng ảnh
  const safeIndex =
    activeIndex >= 0 && activeIndex < displayImages.length ? activeIndex : 0
  const currentImage = displayImages[safeIndex]

  const handlePrev = () => {
    setActiveIndex((prev) =>
      prev === 0 ? displayImages.length - 1 : prev - 1,
    )
  }

  const handleNext = () => {
    setActiveIndex((prev) =>
      prev === displayImages.length - 1 ? 0 : prev + 1,
    )
  }

  return (
    <div className={styles.galleryContainer} aria-label="Bộ sưu tập hình ảnh sản phẩm">
      {/* 1. KHUNG ẢNH CHÍNH */}
      <div className={styles.mainImageWrapper}>
        {/* Overlay Badges */}
        <div className={styles.badgesOverlay}>
          {isOutOfStock && (
            <Badge variant="outline" size="sm">
              HẾT HÀNG
            </Badge>
          )}
          {!isOutOfStock && isNew && (
            <Badge variant="default" size="sm">
              MỚI
            </Badge>
          )}
        </div>

        {currentImage ? (
          <img
            src={currentImage.url}
            alt={currentImage.altText || `${productName} - Góc nhìn ${safeIndex + 1}`}
            className={styles.mainImage}
            loading="eager"
          />
        ) : (
          <div className={styles.noImageFallback}>Chưa có hình ảnh</div>
        )}

        {/* Nút điều hướng ảnh nếu có nhiều hơn 1 ảnh */}
        {displayImages.length > 1 && (
          <>
            <button
              type="button"
              className={cn(styles.navButton, styles.prev)}
              onClick={handlePrev}
              aria-label="Xem ảnh trước"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className={cn(styles.navButton, styles.next)}
              onClick={handleNext}
              aria-label="Xem ảnh tiếp theo"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {/* 2. DẢI THUMBNAILS PHỤ */}
      {displayImages.length > 1 && (
        <div className={styles.thumbnailList} role="tablist" aria-label="Danh sách ảnh thu nhỏ">
          {displayImages.map((img, idx) => {
            const isThumbActive = idx === safeIndex

            return (
              <button
                key={img.id || idx}
                type="button"
                role="tab"
                aria-selected={isThumbActive}
                className={cn(
                  styles.thumbnailItem,
                  isThumbActive && styles.active,
                )}
                onClick={() => setActiveIndex(idx)}
                aria-label={`Ảnh ${idx + 1}`}
              >
                <img
                  src={img.url}
                  alt={img.altText || `Thu nhỏ ${idx + 1}`}
                  loading="lazy"
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ProductGallery
