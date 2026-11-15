import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react'
import { productService } from '@/services/api/productService'
import type { Product } from '@/types/product'
import { formatCurrency } from '@/utils/formatters'
import styles from './ProductRow.module.scss'

interface ProductRowProps {
  categorySlug: string
  title?: string
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

        {/* Badge "Bán chạy" bottom-left of image */}
        <span className={styles.bestSellerBadge}>Bán chạy</span>

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
  title,
}) => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isMounted = true
    const fetchProducts = async () => {
      setLoading(true)
      try {
        const response = await productService.getProducts({
          category: categorySlug,
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
  }, [categorySlug])

  const scrollLeft = () => {
    if (trackRef.current) {
      const scrollAmount = trackRef.current.clientWidth * 0.75
      trackRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (trackRef.current) {
      const scrollAmount = trackRef.current.clientWidth * 0.75
      trackRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  if (!loading && products.length === 0) {
    return null
  }

  return (
    <section className={styles.section} aria-label={title || 'Sản phẩm nổi bật'}>
      <div className={styles.container}>
        {/* Navigation Arrow Left */}
        <button
          type="button"
          className={`${styles.navButton} ${styles.navPrev}`}
          onClick={scrollLeft}
          aria-label="Cuộn sang trái"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Product Track */}
        <div className={styles.track} ref={trackRef}>
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className={styles.skeletonTile}>
                  <div className={styles.skeletonImage} />
                  <div className={styles.skeletonText} />
                  <div className={styles.skeletonPrice} />
                </div>
              ))
            : products.map((product) => (
                <ProductTile key={product.id} product={product} />
              ))}
        </div>

        {/* Navigation Arrow Right */}
        <button
          type="button"
          className={`${styles.navButton} ${styles.navNext}`}
          onClick={scrollRight}
          aria-label="Cuộn sang phải"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </section>
  )
}
