import type { HTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import type { Product } from '@/types/product'
import { Badge } from '@/components/common/Badge'
import { formatCurrency } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import styles from './ProductCard.module.scss'

export interface ProductCardProps extends HTMLAttributes<HTMLElement> {
  product: Product
  isNew?: boolean
  isWishlisted?: boolean
  onWishlistToggle?: (productId: string) => void
}

export const ProductCard = ({
  product,
  isNew,
  isWishlisted = false,
  onWishlistToggle,
  className,
  ...props
}: ProductCardProps) => {
  const primaryVariant = product.variants?.[0]
  const currentPrice = primaryVariant?.price ?? product.basePrice
  const originalPrice = primaryVariant?.originalPrice

  const discountPercent =
    originalPrice && originalPrice > currentPrice
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
      : 0

  const isOutOfStock =
    Boolean(product.isOutOfStock) ||
    (Boolean(product.variants?.length) &&
      product.variants.every((v) => v.stock <= 0))

  const isNewProduct = isNew !== undefined ? isNew : Boolean(product.isNew)

  // Prioritize featuredImage, then variant image
  const imageSrc = product.featuredImage || primaryVariant?.images?.[0]

  // Deduplicate colors for swatches
  const uniqueColors = product.variants?.reduce<
    Array<{ color: string; colorHex?: string }>
  >((acc, variant) => {
    if (!acc.some((c) => c.color === variant.color)) {
      acc.push({ color: variant.color, colorHex: variant.colorHex })
    }
    return acc
  }, []) ?? []

  return (
    <article className={cn(styles.card, className)} {...props}>
      {/* 1. Image Container (3:4 ratio) */}
      <div className={styles.imageContainer}>
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={product.name}
            className={styles.image}
            loading="lazy"
            width={300}
            height={400}
          />
        ) : (
          <div className={styles.imagePlaceholder} aria-hidden="true">
            <span className={styles.placeholderBrand}>MODE STUDIO</span>
            <span className={styles.placeholderLabel}>{product.category.name}</span>
          </div>
        )}

        {/* 2. Badges */}
        <div className={styles.badgeGroup}>
          {isOutOfStock ? (
            <Badge variant="default" size="sm">
              HẾT HÀNG
            </Badge>
          ) : (
            <>
              {discountPercent > 0 && (
                <Badge variant="error" size="sm">
                  -{discountPercent}%
                </Badge>
              )}
              {isNewProduct && (
                <Badge variant="luxury" size="sm">
                  MỚI
                </Badge>
              )}
            </>
          )}
        </div>

        {/* 3. Wishlist button: independent button, overlay on top of image, NOT inside <a> */}
        <button
          type="button"
          onClick={() => onWishlistToggle?.(product.id)}
          className={cn(styles.wishlistButton, isWishlisted && styles.wishlistActive)}
          aria-label={
            isWishlisted
              ? `Bỏ yêu thích sản phẩm ${product.name}`
              : `Thêm ${product.name} vào danh sách yêu thích`
          }
          aria-pressed={isWishlisted}
        >
          <Heart size={18} className={styles.heartIcon} />
        </button>
      </div>

      {/* 4. Product Details */}
      <div className={styles.details}>
        <span className={styles.categoryName}>{product.category.name}</span>

        {/* Title is the only link, stretches over the whole card via ::after */}
        <h3 className={styles.title}>
          <Link to={`/products/${product.slug}`} className={styles.titleLink}>
            {product.name}
          </Link>
        </h3>

        {/* Pricing */}
        <div className={styles.priceRow}>
          <span className={styles.currentPrice}>{formatCurrency(currentPrice)}</span>
          {originalPrice && originalPrice > currentPrice && (
            <span className={styles.originalPrice}>
              {formatCurrency(originalPrice)}
            </span>
          )}
        </div>

        {/* Color swatches */}
        {uniqueColors.length > 0 && (
          <div className={styles.swatchList} aria-label="Màu sắc sẵn có">
            {uniqueColors.map((colorItem) => (
              <span
                key={colorItem.color}
                className={styles.swatchDot}
                style={{
                  backgroundColor: colorItem.colorHex || 'var(--color-taupe)',
                }}
                title={colorItem.color}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

export default ProductCard

