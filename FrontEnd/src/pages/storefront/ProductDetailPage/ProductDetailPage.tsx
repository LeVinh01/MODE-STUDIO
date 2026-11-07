import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AlertCircle, Info, Minus, Plus } from 'lucide-react'
import { Breadcrumbs, type BreadcrumbItem } from '@/components/navigation/Breadcrumbs'
import { Button } from '@/components/common/Button'
import { ProductGallery } from '@/components/storefront/ProductGallery'
import { VariantSelector } from '@/components/storefront/VariantSelector'
import { ProductCard } from '@/components/storefront/ProductCard'
import { productService } from '@/services/api/productService'
import type { Product } from '@/types/product'
import { formatCurrency } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import styles from './ProductDetailPage.module.scss'

export const ProductDetailPage = () => {
  const { slug } = useParams<{ slug: string }>()

  // 1. Data states
  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isNotFound, setIsNotFound] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState<number>(0)

  // 2. Selection states
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null)
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState<number>(1)
  const [sizeWarning, setSizeWarning] = useState<string | null>(null)
  const [showCartNotice, setShowCartNotice] = useState<boolean>(false)

  // Reset toàn bộ state lựa chọn khi slug đổi
  const [prevSlug, setPrevSlug] = useState(slug)
  if (prevSlug !== slug) {
    setPrevSlug(slug)
    setSelectedColorId(null)
    setSelectedSizeId(null)
    setQuantity(1)
    setSizeWarning(null)
    setShowCartNotice(false)
    setErrorMessage(null)
    setIsNotFound(false)
    setIsLoading(true)
    setProduct(null)
    setRelatedProducts([])
  }

  // 3. Tải dữ liệu sản phẩm khi slug thay đổi
  useEffect(() => {
    if (!slug) return

    // Cuộn mượt lên đầu trang khi chuyển sang xem sản phẩm khác
    window.scrollTo({ top: 0, behavior: 'smooth' })

    const controller = new AbortController()
    const { signal } = controller

    const loadProductData = async () => {
      try {
        const data = await productService.getProductBySlug(slug, signal)
        setProduct(data)

        // Cập nhật document.title theo tên sản phẩm
        document.title = `${data.name} | MODE STUDIO`

        // A. Xác định màu sắc mặc định
        // Ưu tiên: màu của ảnh chính (hoặc ảnh đầu tiên có colorId) -> fallback màu đầu tiên còn hàng
        const mainImg = data.images?.find((img) => img.isMain) || data.images?.[0]
        let initialColorId: number | null = null

        if (mainImg?.colorId !== undefined && mainImg.colorId !== null) {
          const colorExists = data.variants?.some(
            (v) => v.isActive !== false && v.colorId === mainImg.colorId,
          )
          if (colorExists) {
            initialColorId = mainImg.colorId
          }
        }

        if (initialColorId === null && data.variants && data.variants.length > 0) {
          // Tìm màu đầu tiên có tồn kho > 0
          const colorStockMap = new Map<number, number>()
          data.variants.forEach((v) => {
            if (v.isActive === false || v.colorId === undefined) return
            colorStockMap.set(
              v.colorId,
              (colorStockMap.get(v.colorId) ?? 0) + v.stock,
            )
          })

          const inStockEntry = Array.from(colorStockMap.entries()).find(
            ([, stock]) => stock > 0,
          )
          if (inStockEntry) {
            initialColorId = inStockEntry[0]
          } else {
            // Nếu tất cả đều hết hàng, lấy màu đầu tiên
            const firstActiveVariant = data.variants.find(
              (v) => v.isActive !== false && v.colorId !== undefined,
            )
            initialColorId = firstActiveVariant?.colorId ?? null
          }
        }
        setSelectedColorId(initialColorId)

        // B. Xác định size mặc định
        // KHÔNG tự chọn size, TRỪ KHI sản phẩm chỉ có duy nhất One Size
        if (data.variants && data.variants.length > 0) {
          const sizeSet = new Set<number>()
          data.variants.forEach((v) => {
            if (v.isActive !== false && v.sizeId !== undefined) {
              sizeSet.add(v.sizeId)
            }
          })
          if (sizeSet.size === 1) {
            setSelectedSizeId(Array.from(sizeSet)[0])
          }
        }

        // C. Tải sản phẩm liên quan (cùng category, perPage 5 để trừ sản phẩm hiện tại ra 4)
        if (data.category?.slug) {
          try {
            const relatedRes = await productService.getProducts(
              { category: data.category.slug, perPage: 5 },
              signal,
            )
            const filtered = relatedRes.items
              .filter((item) => item.id !== data.id)
              .slice(0, 4)
            setRelatedProducts(filtered)
          } catch {
            // Không làm gián đoạn trang chi tiết nếu tải sản phẩm liên quan thất bại
          }
        }
      } catch (err: unknown) {
        if (!signal.aborted) {
          const axiosStatus = (err as { response?: { status?: number } })?.response
            ?.status
          if (axiosStatus === 404) {
            setIsNotFound(true)
          } else {
            setErrorMessage(
              'Không thể tải thông tin thiết kế. Quý khách vui lòng thử lại sau giây lát.',
            )
          }
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadProductData()

    return () => {
      controller.abort()
      document.title = 'MODE STUDIO'
    }
  }, [slug, retryCount])

  // 4. Tính toán giá, giảm giá, tồn kho biến thể
  const currentPrice = product?.basePrice ?? 0
  const originalPrice = product?.compareAtPrice ?? null
  const discountPercent =
    originalPrice && originalPrice > currentPrice
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
      : 0

  const activeVariant = product?.variants?.find(
    (v) =>
      v.isActive !== false &&
      v.colorId === selectedColorId &&
      v.sizeId === selectedSizeId,
  )

  const isOverallOutOfStock =
    product &&
    (product.inStock === false ||
      (product.variants &&
        product.variants.length > 0 &&
        product.variants.every((v) => v.stock <= 0)))

  const isVariantOutOfStock = Boolean(activeVariant && activeVariant.stock <= 0)
  const maxStock = activeVariant ? Math.min(activeVariant.stock, 10) : 1

  // 5. Handlers lựa chọn màu & size
  const handleSelectColor = (colorId: number) => {
    setSelectedColorId(colorId)
    setSizeWarning(null)

    // Nếu size hiện tại đã chọn không còn hàng ở màu mới, reset size về null (trừ khi là One Size)
    if (selectedSizeId !== null && product?.variants) {
      const isSizeStillInStock = product.variants.some(
        (v) =>
          v.isActive !== false &&
          v.colorId === colorId &&
          v.sizeId === selectedSizeId &&
          v.stock > 0,
      )

      const sizeCount = new Set(
        product.variants.map((v) => v.sizeId).filter(Boolean),
      ).size
      if (!isSizeStillInStock && sizeCount > 1) {
        setSelectedSizeId(null)
      }
    }
  }

  const handleSelectSize = (sizeId: number) => {
    setSelectedSizeId(sizeId)
    setSizeWarning(null)
  }

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => {
      const next = prev + delta
      if (next < 1) return 1
      if (next > maxStock) return maxStock
      return next
    })
  }

  // 6. Handler Thêm vào giỏ hàng
  const handleAddToCart = () => {
    if (!product) return

    // Kiểm tra xem đã chọn size chưa (nếu sản phẩm có nhiều size)
    const hasMultipleSizes =
      product.variants &&
      new Set(product.variants.map((v) => v.sizeId).filter(Boolean)).size > 1

    if (hasMultipleSizes && selectedSizeId === null) {
      setSizeWarning('Vui lòng chọn kích cỡ')
      return
    }

    if (isOverallOutOfStock || isVariantOutOfStock) {
      return
    }

    // Hiển thị thông báo trung thực (cartSlice chưa có trong Redux store)
    setShowCartNotice(true)
    setTimeout(() => {
      setShowCartNotice(false)
    }, 4000)
  }

  // Breadcrumbs items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Trang Chủ', to: '/' },
    { label: 'Bộ Sưu Tập', to: '/products' },
  ]
  if (product) {
    breadcrumbItems.push({
      label: product.category.name,
      to: `/products?category=${product.category.slug}`,
    })
    breadcrumbItems.push({
      label: product.name,
    })
  }

  // =========================================================================
  // RENDER: LOADING STATE
  // =========================================================================
  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.breadcrumbsWrapper}>
            <div className={styles.skeletonLine} style={{ width: '220px' }} />
          </div>
          <div className={styles.mainLayout}>
            <div className={styles.skeletonGallery} />
            <div className={styles.detailsColumn}>
              <div className={styles.skeletonLine} style={{ width: '120px' }} />
              <div className={cn(styles.skeletonLine, styles.lg)} />
              <div className={cn(styles.skeletonLine, styles.md)} />
              <div className={styles.skeletonLine} style={{ width: '180px' }} />
              <div className={cn(styles.skeletonLine, styles.btn)} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // RENDER: 404 NOT FOUND STATE
  // =========================================================================
  if (isNotFound) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.centeredBox}>
            <h1 className={styles.stateTitle}>Thiết Kế Không Tồn Tại</h1>
            <p className={styles.stateDescription}>
              Rất tiếc, sản phẩm quý khách đang tìm kiếm không tồn tại hoặc đã ngừng
              phát hành trong bộ sưu tập hiện tại.
            </p>
            <Link to="/products">
              <Button variant="primary" size="md">
                Khám Phá Bộ Sưu Tập
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // RENDER: GENERAL ERROR STATE
  // =========================================================================
  if (errorMessage || !product) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.centeredBox}>
            <AlertCircle size={40} color="var(--color-error, #b91c1c)" />
            <h1 className={styles.stateTitle}>Không Thể Tải Thiết Kế</h1>
            <p className={styles.stateDescription}>{errorMessage}</p>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setRetryCount((c) => c + 1)}
            >
              Thử Lại
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // RENDER: PRODUCT DETAIL CONTENT
  // =========================================================================
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* 1. BREADCRUMBS */}
        <div className={styles.breadcrumbsWrapper}>
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        {/* 2. MAIN 2-COLUMN LAYOUT */}
        <div className={styles.mainLayout}>
          {/* CỘT TRÁI: GALLERY HÌNH ẢNH */}
          <div className={styles.galleryColumn}>
            <ProductGallery
              images={product.images || []}
              selectedColorId={selectedColorId}
              productName={product.name}
              isOutOfStock={Boolean(isOverallOutOfStock)}
              isNew={Boolean(product.isNew)}
            />
          </div>

          {/* CỘT PHẢI: CHI TIẾT & ĐẶT HÀNG */}
          <div className={styles.detailsColumn}>
            {/* Header info: Brand, Name, SKU */}
            <div className={styles.headerInfo}>
              {product.brand && (
                <span className={styles.brandName}>{product.brand.name}</span>
              )}
              <h1 className={styles.productTitle}>{product.name}</h1>
              {activeVariant?.sku && (
                <span className={styles.skuText}>Mã thiết kế: {activeVariant.sku}</span>
              )}
            </div>

            {/* Price section */}
            <div className={styles.priceSection}>
              <span className={styles.currentPrice}>
                {formatCurrency(currentPrice)}
              </span>
              {originalPrice && originalPrice > currentPrice && (
                <>
                  <span className={styles.originalPrice}>
                    {formatCurrency(originalPrice)}
                  </span>
                  <span className={styles.discountBadge}>-{discountPercent}%</span>
                </>
              )}
            </div>

            {/* Color & Size Variant Selectors */}
            {product.variants && product.variants.length > 0 && (
              <VariantSelector
                variants={product.variants}
                selectedColorId={selectedColorId}
                onSelectColor={handleSelectColor}
                selectedSizeId={selectedSizeId}
                onSelectSize={handleSelectSize}
                sizeWarning={sizeWarning}
              />
            )}

            {/* Quantity & Add to Cart Section */}
            <div className={styles.purchaseSection}>
              {/* Quantity selector */}
              {!isOverallOutOfStock && !isVariantOutOfStock && (
                <div className={styles.quantityRow}>
                  <span className={styles.quantityLabel}>Số lượng:</span>
                  <div className={styles.quantityControl}>
                    <button
                      type="button"
                      className={styles.qtyBtn}
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                      aria-label="Giảm số lượng"
                    >
                      <Minus size={14} />
                    </button>
                    <span className={styles.qtyValue}>{quantity}</span>
                    <button
                      type="button"
                      className={styles.qtyBtn}
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= maxStock}
                      aria-label="Tăng số lượng"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {activeVariant && activeVariant.stock <= 5 && (
                    <span className={styles.stockWarning}>
                      * Chỉ còn {activeVariant.stock} sản phẩm
                    </span>
                  )}
                </div>
              )}

              {/* Action Button: Thêm vào giỏ */}
              <div className={styles.actionButtons}>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={Boolean(isOverallOutOfStock || isVariantOutOfStock)}
                  onClick={handleAddToCart}
                >
                  {isOverallOutOfStock
                    ? 'HẾT HÀNG'
                    : isVariantOutOfStock
                      ? 'BIẾN THỂ TẠM HẾT HÀNG'
                      : 'THÊM VÀO GIỎ HÀNG'}
                </Button>
              </div>

              {/* Thông báo trung thực về tính năng giỏ hàng */}
              {showCartNotice && (
                <div className={styles.noticeNotification} role="status">
                  <Info size={18} />
                  <span>
                    Tính năng giỏ hàng sẽ được hoàn thiện ở bước sau.
                  </span>
                </div>
              )}
            </div>

            {/* Description & Material & Policy note */}
            <div className={styles.infoSection}>
              {/* Mô tả sản phẩm */}
              {product.description && (
                <div className={styles.infoBlock}>
                  <h2 className={styles.infoTitle}>Mô Tả Thiết Kế</h2>
                  <p className={styles.infoContent}>{product.description}</p>
                </div>
              )}

              {/* Chất liệu sản phẩm */}
              {product.material && (
                <div className={styles.infoBlock}>
                  <h2 className={styles.infoTitle}>Chất Liệu & Hoàn Thiện</h2>
                  <p className={styles.infoContent}>{product.material}</p>
                </div>
              )}

              {/* Khối chính sách (dòng chờ nội dung rõ ràng) */}
              <div className={styles.infoBlock}>
                <h2 className={styles.infoTitle}>Chính Sách Dịch Vụ</h2>
                <p className={styles.policyNote}>
                  * Nội dung chính sách vận chuyển và đổi trả đang được cập nhật.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. SẢN PHẨM LIÊN QUAN (ẨN NẾU RỖNG) */}
        {relatedProducts.length > 0 && (
          <section
            className={styles.relatedSection}
            aria-label="Thiết kế cùng bộ sưu tập"
          >
            <h2 className={styles.relatedTitle}>Thiết Kế Cùng Bộ Sưu Tập</h2>
            <div className={styles.relatedGrid}>
              {relatedProducts.map((relProduct) => (
                <ProductCard key={relProduct.id} product={relProduct} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default ProductDetailPage
