import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react'
import { productService } from '@/services/api/productService'
import type { Product } from '@/types/product'
import { formatCurrency } from '@/utils/formatters'
import styles from './ProductRow.module.scss'

export interface ProductRowProps {
  categorySlug?: string
  categorySlugs?: string[]
  title?: string
  viewAllHref?: string
}

interface ProductTileProps {
  product: Product
}

const ProductTile: React.FC<ProductTileProps> = ({ product }) => {
  const isWishlistEnabled = import.meta.env.VITE_ENABLE_WISHLIST === 'true'

  // Colors: Prefer backend computed colors (has name, hex, imageUrl), fallback to availableColors
  const colorList =
    product.colors && product.colors.length > 0
      ? product.colors
      : product.availableColors?.map((c) => ({
          name: c.name,
          hex: c.hexCode,
          imageUrl: null,
        })) ?? []

  const [activeImage, setActiveImage] = useState<string>(
    product.featuredImage || product.mainImage?.url || '/images/placeholder.jpg'
  )
  const [selectedColorName, setSelectedColorName] = useState<string>(
    colorList[0]?.name || ''
  )
  const [imageError, setImageError] = useState(false)

  const handleColorClick = (
    e: React.MouseEvent,
    color: { name: string; hex?: string | null; imageUrl?: string | null }
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedColorName(color.name)
    if (color.imageUrl) {
      setActiveImage(color.imageUrl)
      setImageError(false)
    }
  }

  const hasDiscount = Boolean(
    product.compareAtPrice && product.compareAtPrice > product.basePrice
  )

  const maxVisibleColors = 8
  const visibleColors = colorList.slice(0, maxVisibleColors)
  const remainingCount = colorList.length - maxVisibleColors

  return (
    <article className={styles.tile}>
      {/* 1. Image Container */}
      <div className={styles.imageContainer}>
        <Link
          to={`/products/${product.slug}`}
          className={styles.imageLink}
          tabIndex={-1}
          aria-hidden="true"
        >
          <img
            src={imageError ? '/images/placeholder.jpg' : activeImage}
            alt={product.name}
            className={styles.image}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        </Link>

        {/* Badge "BÁN CHẠY" bottom-left of image */}
        <span className={styles.bestSellerBadge}>BÁN CHẠY</span>

        {/* Wishlist Heart (ONLY if VITE_ENABLE_WISHLIST === 'true') */}
        {isWishlistEnabled && (
          <button
            type="button"
            className={styles.wishlistButton}
            aria-label={`Thêm ${product.name} vào danh sách yêu thích`}
          >
            <Heart size={18} />
          </button>
        )}
      </div>

      {/* 2. Color Dots */}
      {colorList.length > 0 && (
        <div
          className={styles.colorDots}
          role="group"
          aria-label="Màu sắc sản phẩm"
        >
          {visibleColors.map((color, idx) => {
            const isSelected = color.name === selectedColorName
            const dotStyle: React.CSSProperties = {
              backgroundColor: color.hex || '#e0e0e0',
            }

            return (
              <button
                key={`${color.name}-${idx}`}
                type="button"
                className={`${styles.colorDot} ${
                  isSelected ? styles.colorDotSelected : ''
                }`}
                style={dotStyle}
                onClick={(e) => handleColorClick(e, color)}
                aria-label={color.name}
                aria-pressed={isSelected}
                title={color.name}
              />
            )
          })}
          {remainingCount > 0 && (
            <span className={styles.remainingBadge}>+{remainingCount}</span>
          )}
        </div>
      )}

      {/* 3. Product Info */}
      <div className={styles.info}>
        <h3 className={styles.name}>
          <Link to={`/products/${product.slug}`} className={styles.nameLink}>
            {product.name}
          </Link>
        </h3>

        <div className={styles.priceContainer}>
          <span
            className={`${styles.price} ${hasDiscount ? styles.priceSale : ''}`}
          >
            {formatCurrency(product.basePrice)}
          </span>
          {hasDiscount && product.compareAtPrice && (
            <del className={styles.originalPrice}>
              {formatCurrency(product.compareAtPrice)}
            </del>
          )}
        </div>
      </div>
    </article>
  )
}

export const ProductRow: React.FC<ProductRowProps> = ({
  categorySlug,
  categorySlugs,
  title,
  viewAllHref,
}) => {
  const activeSlugs = React.useMemo(() => {
    if (categorySlugs && categorySlugs.length > 0) {
      return categorySlugs.join(',')
    }
    return categorySlug || ''
  }, [categorySlug, categorySlugs])

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(() => Boolean(activeSlugs))
  const [pageIndex, setPageIndex] = useState(0)
  const [imageCenterY, setImageCenterY] = useState<number>(245)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!activeSlugs) {
      return
    }

    let isMounted = true

    const fetchProducts = async () => {
      setLoading(true)
      setProducts([])
      setPageIndex(0)
      try {
        const response = await productService.getProducts({
          category: activeSlugs,
          sort: 'best_selling',
          perPage: 8,
        })
        if (isMounted) {
          setProducts(response.items || [])
        }
      } catch {
        if (isMounted) {
          setProducts([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchProducts()
    return () => {
      isMounted = false
    }
  }, [activeSlugs])

  // Measure first image height to center navigation buttons vertically on image
  useEffect(() => {
    const updateCenterY = () => {
      if (wrapperRef.current) {
        const firstImg = wrapperRef.current.querySelector('img')
        if (firstImg && firstImg.offsetHeight > 0) {
          setImageCenterY(firstImg.offsetHeight / 2)
        }
      }
    }

    updateCenterY()
    const timer = setTimeout(updateCenterY, 300)
    window.addEventListener('resize', updateCenterY)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateCenterY)
    }
  }, [products, loading])

  if (!loading && products.length === 0) {
    return null
  }

  // Chunk products into pages of 4 items
  const PAGE_SIZE = 4
  const pages: Product[][] = []
  for (let i = 0; i < products.length; i += PAGE_SIZE) {
    pages.push(products.slice(i, i + PAGE_SIZE))
  }
  const totalPages = Math.max(1, pages.length)

  const handlePrev = () => {
    setPageIndex((prev) => (prev > 0 ? prev - 1 : totalPages - 1))
  }

  const handleNext = () => {
    setPageIndex((prev) => (prev < totalPages - 1 ? prev + 1 : 0))
  }

  const showNavButtons = !loading && totalPages > 1

  return (
    <section
      className={styles.section}
      aria-label={title || 'Sản phẩm nổi bật'}
      data-header-theme="light"
    >
      <div className={styles.wrapper} ref={wrapperRef}>
        {/* Row Header with Title & View All Link */}
        {title && (
          <div className={styles.rowHeader}>
            <h2 className={styles.rowTitle}>{title}</h2>
            {viewAllHref && (
              <Link to={viewAllHref} className={styles.viewAllLink}>
                Xem tất cả
              </Link>
            )}
          </div>
        )}

        {/* Navigation Arrow Left */}
        {showNavButtons && (
          <button
            type="button"
            className={`${styles.navButton} ${styles.navPrev}`}
            style={{ top: `${imageCenterY}px` }}
            onClick={handlePrev}
            aria-label="Xem sản phẩm trước"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {/* Carousel / Grid container */}
        <div className={styles.slider}>
          <div
            className={styles.sliderTrack}
            style={{ transform: `translateX(-${pageIndex * 100}%)` }}
          >
            {loading ? (
              <div className={styles.grid}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className={styles.skeletonTile}>
                    <div className={styles.skeletonImage} />
                    <div className={styles.skeletonText} />
                    <div className={styles.skeletonPrice} />
                  </div>
                ))}
              </div>
            ) : (
              pages.map((pageItems, pIdx) => (
                <div key={pIdx} className={styles.grid}>
                  {pageItems.map((product) => (
                    <ProductTile key={product.id} product={product} />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Navigation Arrow Right */}
        {showNavButtons && (
          <button
            type="button"
            className={`${styles.navButton} ${styles.navNext}`}
            style={{ top: `${imageCenterY}px` }}
            onClick={handleNext}
            aria-label="Xem sản phẩm tiếp theo"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>
    </section>
  )
}

export default ProductRow
