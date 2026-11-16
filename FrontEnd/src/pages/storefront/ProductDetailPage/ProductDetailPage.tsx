import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AlertCircle, ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react'
import { Breadcrumbs, type BreadcrumbItem } from '@/components/navigation/Breadcrumbs'
import { Button } from '@/components/common/Button'
import { Toast } from '@/components/feedback'
import { Modal } from '@/components/feedback/Modal'
import { ProductGallery } from '@/components/storefront/ProductGallery'
import { ProductCompactGrid } from '@/components/storefront'
import { productService } from '@/services/api/productService'
import type { Product } from '@/types/product'
import { formatCurrency } from '@/utils/formatters'
import { useAppDispatch } from '@/store/hooks'
import { addToCart } from '@/store/slices/cartSlice'
import { setCartDrawerOpen } from '@/store/slices/uiSlice'
import { STORE_POLICIES } from '@/config/store'
import { SIZE_GUIDE_DATA, SIZE_MEASUREMENT_TIPS } from '@/config/sizeGuide'
import { cn } from '@/utils/cn'
import styles from './ProductDetailPage.module.scss'

const MAX_LINE_QUANTITY = 20

export const ProductDetailPage = () => {
  const { slug } = useParams<{ slug: string }>()
  const dispatch = useAppDispatch()

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
  const [quantityInput, setQuantityInput] = useState<string>('1')
  const [sizeWarning, setSizeWarning] = useState<string | null>(null)
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false)
  const [addToCartError, setAddToCartError] = useState<string | null>(null)

  // 3. UI states (Size guide Modal & Accordion)
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState<boolean>(false)
  const [openAccordion, setOpenAccordion] = useState<string | null>(null)
  const sizeGuideBtnRef = useRef<HTMLButtonElement>(null)

  const toggleAccordion = (id: string) => {
    setOpenAccordion((prev) => (prev === id ? null : id))
  }

  // Reset toàn bộ state lựa chọn khi slug đổi
  const [prevSlug, setPrevSlug] = useState(slug)
  if (prevSlug !== slug) {
    setPrevSlug(slug)
    setSelectedColorId(null)
    setSelectedSizeId(null)
    setQuantity(1)
    setQuantityInput('1')
    setSizeWarning(null)
    setIsAddingToCart(false)
    setAddToCartError(null)
    setErrorMessage(null)
    setIsNotFound(false)
    setIsLoading(true)
    setProduct(null)
    setRelatedProducts([])
    setOpenAccordion(null)
  }

  // 4. Tải dữ liệu sản phẩm khi slug thay đổi
  useEffect(() => {
    if (!slug) return

    window.scrollTo({ top: 0, behavior: 'smooth' })

    const controller = new AbortController()
    const { signal } = controller

    const loadProductData = async () => {
      try {
        const data = await productService.getProductBySlug(slug, signal)
        setProduct(data)
        document.title = `${data.name} | MODE STUDIO`

        // A. Xác định màu sắc mặc định
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
            const firstActiveVariant = data.variants.find(
              (v) => v.isActive !== false && v.colorId !== undefined,
            )
            initialColorId = firstActiveVariant?.colorId ?? null
          }
        }
        setSelectedColorId(initialColorId)

        // B. Xác định size mặc định (chỉ tự chọn nếu là One Size)
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

        // C. Tải sản phẩm liên quan (cùng category, tối đa 6 sản phẩm cho lưới compact)
        if (data.category?.slug) {
          try {
            const relatedRes = await productService.getProducts(
              { category: data.category.slug, perPage: 12 },
              signal,
            )
            const filtered = relatedRes.items
              .filter((item) => item.id !== data.id)
              .slice(0, 6)
            setRelatedProducts(filtered)
          } catch {
            // Im lặng nếu không tải được sản phẩm liên quan
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

  // 5. Trích xuất danh sách màu sắc & kích cỡ từ variants
  const uniqueColors = useMemo(() => {
    if (!product?.variants) return []
    const map = new Map<
      number,
      { id: number; name: string; hexCode?: string; totalStock: number }
    >()

    product.variants.forEach((v) => {
      if (v.isActive === false || v.colorId === undefined) return
      const existing = map.get(v.colorId)
      if (existing) {
        existing.totalStock += v.stock
      } else {
        map.set(v.colorId, {
          id: v.colorId,
          name: v.color,
          hexCode: v.colorHex,
          totalStock: v.stock,
        })
      }
    })

    return Array.from(map.values())
  }, [product])

  const uniqueSizes = useMemo(() => {
    if (!product?.variants) return []
    const map = new Map<
      number,
      { id: number; name: string; sortOrder: number }
    >()

    product.variants.forEach((v) => {
      if (v.isActive === false || v.sizeId === undefined) return
      if (!map.has(v.sizeId)) {
        map.set(v.sizeId, {
          id: v.sizeId,
          name: v.size,
          sortOrder: v.sizeSortOrder ?? 0,
        })
      }
    })

    return Array.from(map.values()).sort((a, b) => a.sortOrder - b.sortOrder)
  }, [product])

  const isOneSize =
    uniqueSizes.length === 1 &&
    (uniqueSizes[0].name.toLowerCase().includes('one size') ||
      uniqueSizes.length === 1)

  const activeColor = uniqueColors.find((c) => c.id === selectedColorId)

  // 6. Tính toán giá, giảm giá, tồn kho biến thể
  const currentPrice = product?.basePrice ?? 0
  const originalPrice = product?.compareAtPrice ?? null

  const activeVariant = product?.variants?.find(
    (v) =>
      v.isActive !== false &&
      v.colorId === selectedColorId &&
      v.sizeId === selectedSizeId,
  )

  const maxAllowedStock = activeVariant
    ? Math.min(Math.max(0, activeVariant.stock), MAX_LINE_QUANTITY)
    : 1

  const isOverallOutOfStock =
    product &&
    (product.inStock === false ||
      (product.variants &&
        product.variants.length > 0 &&
        product.variants.every((v) => v.stock <= 0)))

  const isVariantOutOfStock = Boolean(activeVariant && activeVariant.stock <= 0)

  const isSelectorDisabled = Boolean(
    !activeVariant ||
      isOverallOutOfStock ||
      isVariantOutOfStock ||
      (activeVariant?.stock ?? 0) <= 0 ||
      isAddingToCart,
  )

  // Điều chỉnh số lượng khi activeVariant thay đổi hoặc khi tồn kho thấp hơn số lượng đang chọn
  const [prevVariantId, setPrevVariantId] = useState<string | null>(null)
  if ((activeVariant?.id ?? null) !== prevVariantId) {
    setPrevVariantId(activeVariant?.id ?? null)
    setQuantity(1)
    setQuantityInput('1')
  } else if (activeVariant && maxAllowedStock > 0 && quantity > maxAllowedStock) {
    setQuantity(maxAllowedStock)
    setQuantityInput(String(maxAllowedStock))
  }

  // Handlers lựa chọn màu & size
  const handleSelectColor = (colorId: number) => {
    setSelectedColorId(colorId)
    setSizeWarning(null)
    setAddToCartError(null)

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
    setAddToCartError(null)
  }

  // Handlers điều chỉnh số lượng
  const handleQuantityChange = (delta: number) => {
    if (isSelectorDisabled) return
    const next = Math.max(1, Math.min(maxAllowedStock, quantity + delta))
    setQuantity(next)
    setQuantityInput(String(next))
    setAddToCartError(null)
  }

  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSelectorDisabled) return
    const cleaned = e.target.value.replace(/[^0-9]/g, '')
    setQuantityInput(cleaned)
    const parsed = parseInt(cleaned, 10)
    if (!isNaN(parsed) && parsed >= 1) {
      const clamped = Math.min(parsed, maxAllowedStock)
      setQuantity(clamped)
    }
  }

  const handleQuantityInputBlur = () => {
    if (isSelectorDisabled) {
      setQuantity(1)
      setQuantityInput('1')
      return
    }
    const parsed = parseInt(quantityInput, 10)
    if (isNaN(parsed) || parsed < 1) {
      setQuantity(1)
      setQuantityInput('1')
      setAddToCartError(null)
    } else if (parsed > maxAllowedStock) {
      setQuantity(maxAllowedStock)
      setQuantityInput(String(maxAllowedStock))
      if (activeVariant && activeVariant.stock < parsed) {
        setAddToCartError(`Chỉ còn ${activeVariant.stock} sản phẩm`)
      } else if (parsed > MAX_LINE_QUANTITY) {
        setAddToCartError(
          `Số lượng tối đa cho mỗi sản phẩm trong giỏ hàng là ${MAX_LINE_QUANTITY}.`,
        )
      }
    } else {
      setQuantity(parsed)
      setQuantityInput(String(parsed))
      setAddToCartError(null)
    }
  }

  // 7. Handler Thêm vào giỏ hàng
  const handleAddToCart = async () => {
    if (!product) return
    setAddToCartError(null)

    if (uniqueColors.length > 0 && selectedColorId === null) {
      setSizeWarning('Vui lòng chọn màu sắc')
      return
    }

    if (uniqueSizes.length > 0 && selectedSizeId === null) {
      setSizeWarning('Vui lòng chọn kích cỡ')
      return
    }

    if (!activeVariant) {
      setSizeWarning('Biến thể sản phẩm không khả dụng')
      return
    }

    if (isOverallOutOfStock || isVariantOutOfStock) {
      return
    }

    const stock = activeVariant.stock ?? 0
    if (stock <= 0) {
      setAddToCartError('Sản phẩm đã hết hàng trong kho.')
      return
    }

    if (quantity > maxAllowedStock) {
      setQuantity(maxAllowedStock)
      setQuantityInput(String(maxAllowedStock))
      setAddToCartError(`Chỉ còn ${stock} sản phẩm`)
      return
    }

    setIsAddingToCart(true)

    try {
      const result = await dispatch(
        addToCart({
          variantId: Number(activeVariant.id),
          quantity,
          stockQuantity: activeVariant.stock,
        }),
      ).unwrap()

      if (result?.clamped) {
        setAddToCartError(`Chỉ còn ${activeVariant.stock} sản phẩm`)
      }

      // Giỏ hàng drawer sẽ tự động mở lên
      dispatch(setCartDrawerOpen(true))
    } catch (err: unknown) {
      const apiError = err as {
        message?: string
        errors?: { quantity?: string[] }
        available_stock?: number
      }
      if (apiError?.available_stock !== undefined) {
        if (apiError.available_stock <= 0) {
          setAddToCartError('Sản phẩm đã hết hàng trong kho.')
        } else {
          setAddToCartError(`Chỉ còn ${apiError.available_stock} sản phẩm`)
        }
      } else if (apiError?.errors?.quantity?.[0]) {
        setAddToCartError(apiError.errors.quantity[0])
      } else {
        setAddToCartError(
          apiError?.message || 'Không thể thêm sản phẩm vào giỏ hàng.',
        )
      }
    } finally {
      setIsAddingToCart(false)
    }
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
  // RENDER: PRODUCT DETAIL CONTENT (ẢNH LÀ TRỌNG TÂM, THÔNG TIN NHỎ GỌN)
  // =========================================================================
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* 1. BREADCRUMBS: 11px xám, nhỏ, đặt sát trên thư viện ảnh */}
        <div className={styles.breadcrumbsWrapper}>
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        {/* 2. MAIN 2-COLUMN LAYOUT: Cột trái ảnh (~67%), Cột phải bảng thông tin sticky (max-width ~380px) */}
        <div className={styles.mainLayout}>
          {/* CỘT TRÁI: THƯ VIỆN ẢNH (Lưới 2 cột desktop, tỉ lệ 4:5, vuốt ngang mobile) */}
          <div className={styles.galleryColumn}>
            <ProductGallery
              images={product.images || []}
              selectedColorId={selectedColorId}
              productName={product.name}
            />
          </div>

          {/* CỘT PHẢI: BẢNG THÔNG TIN HẸP (Sticky, font sans-serif chữ nhỏ) */}
          <aside className={styles.detailsColumn} aria-label="Thông tin sản phẩm">
            {/* Nhãn MỚI và Thương hiệu (11px, chữ hoa, màu xám) */}
            <div className={styles.metaRow}>
              {product.isNew && <span className={styles.newLabel}>MỚI</span>}
              {product.brand && (
                <span className={styles.brandName}>{product.brand.name}</span>
              )}
            </div>

            {/* Tên sản phẩm (14px, chữ hoa, weight 400, line-height 1.4) */}
            <h1 className={styles.productName}>{product.name}</h1>

            {/* Giá sản phẩm (14px ngay dưới tên, giá cũ gạch ngang nếu có) */}
            <div className={styles.priceRow}>
              <span className={styles.currentPrice}>
                {formatCurrency(currentPrice)}
              </span>
              {originalPrice && originalPrice > currentPrice && (
                <span className={styles.originalPrice}>
                  {formatCurrency(originalPrice)}
                </span>
              )}
            </div>

            {/* Đường kẻ mỏng 1px */}
            <hr className={styles.divider} />

            {/* Bộ chọn Màu sắc (12px chữ hoa, ô vuông 22-24px, viền mỏng) */}
            {uniqueColors.length > 0 && (
              <div className={styles.colorSection}>
                <span className={styles.colorLabel}>
                  {activeColor?.name || 'MÀU SẮC'}
                </span>
                <div
                  className={styles.colorList}
                  role="radiogroup"
                  aria-label="Chọn màu sắc"
                >
                  {uniqueColors.map((color) => {
                    const isSelected = color.id === selectedColorId
                    return (
                      <button
                        key={color.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`Màu ${color.name}`}
                        title={color.name}
                        className={cn(
                          styles.colorSwatch,
                          isSelected && styles.colorActive,
                        )}
                        style={{ backgroundColor: color.hexCode || '#111111' }}
                        onClick={() => handleSelectColor(color.id)}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Bộ chọn Kích cỡ (12px chữ hoa, ô chữ nhật cao ~36px, link bảng size) */}
            {uniqueSizes.length > 0 && (
              <div className={styles.sizeSection}>
                <div className={styles.sizeHeader}>
                  <span className={styles.sizeLabel}>KÍCH CỠ</span>
                  {!isOneSize && (
                    <button
                      ref={sizeGuideBtnRef}
                      type="button"
                      onClick={() => setIsSizeGuideOpen(true)}
                      className={styles.sizeGuideLink}
                      aria-haspopup="dialog"
                    >
                      Bảng hướng dẫn chọn size
                    </button>
                  )}
                </div>

                {isOneSize ? (
                  <div className={styles.oneSizeBadge}>
                    {uniqueSizes[0].name} (Freesize)
                  </div>
                ) : (
                  <div
                    className={styles.sizeList}
                    role="radiogroup"
                    aria-label="Chọn kích cỡ"
                  >
                    {uniqueSizes.map((size) => {
                      const isSelected = size.id === selectedSizeId
                      const variantForSize = product.variants?.find(
                        (v) =>
                          v.isActive !== false &&
                          v.colorId === selectedColorId &&
                          v.sizeId === size.id,
                      )
                      const isAvailable = Boolean(
                        variantForSize && variantForSize.stock > 0,
                      )

                      return (
                        <button
                          key={size.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          disabled={!isAvailable}
                          aria-label={`Size ${size.name}${!isAvailable ? ' - Hết hàng' : ''}`}
                          className={cn(
                            styles.sizeBtn,
                            isSelected && styles.sizeActive,
                            !isAvailable && styles.sizeDisabled,
                          )}
                          onClick={() => handleSelectSize(size.id)}
                        >
                          {size.name}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Thông báo lỗi khi chưa chọn size */}
                {sizeWarning && (
                  <div className={styles.sizeWarning} role="alert">
                    {sizeWarning}
                  </div>
                )}
              </div>
            )}

            {/* Bộ chọn Số lượng */}
            <div className={styles.quantitySection}>
              <div className={styles.quantityHeader}>
                <span className={styles.quantityLabel}>SỐ LƯỢNG</span>
              </div>
              <div className={styles.quantityRow}>
                <div
                  className={cn(
                    styles.quantityControl,
                    isSelectorDisabled && styles.quantityDisabled,
                  )}
                  role="group"
                  aria-label="Chọn số lượng"
                >
                  <button
                    type="button"
                    className={styles.qtyBtn}
                    onClick={() => handleQuantityChange(-1)}
                    disabled={isSelectorDisabled || quantity <= 1}
                    aria-label="Giảm số lượng"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={styles.qtyInput}
                    value={quantityInput}
                    onChange={handleQuantityInputChange}
                    onBlur={handleQuantityInputBlur}
                    disabled={isSelectorDisabled}
                    aria-label="Số lượng sản phẩm"
                  />
                  <button
                    type="button"
                    className={styles.qtyBtn}
                    onClick={() => handleQuantityChange(1)}
                    disabled={isSelectorDisabled || quantity >= maxAllowedStock}
                    aria-label="Tăng số lượng"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Thông báo tồn kho thấp (12px khi còn ít <= 5) */}
            {activeVariant && activeVariant.stock > 0 && activeVariant.stock <= 5 && (
              <div className={styles.stockLowText}>
                * Chỉ còn {activeVariant.stock} sản phẩm
              </div>
            )}

            {/* Nút THÊM VÀO GIỎ HÀNG (Viền đen 1px, nền trắng, cao 46px, full-width) */}
            <button
              type="button"
              className={styles.addToCartBtn}
              disabled={Boolean(
                isOverallOutOfStock || isVariantOutOfStock || isAddingToCart,
              )}
              onClick={handleAddToCart}
            >
              {isAddingToCart
                ? 'ĐANG THÊM...'
                : isOverallOutOfStock
                  ? 'HẾT HÀNG'
                  : isVariantOutOfStock
                    ? 'BIẾN THỂ TẠM HẾT HÀNG'
                    : 'THÊM VÀO GIỎ HÀNG'}
            </button>

            {/* Lỗi thêm giỏ hàng (nếu có từ server) */}
            {addToCartError && (
              <div className={styles.errorAlert} role="alert">
                <AlertCircle size={14} aria-hidden="true" />
                <span>{addToCartError}</span>
              </div>
            )}

            {/* Toast thông báo lỗi thêm vào giỏ hàng */}
            <Toast
              isOpen={Boolean(addToCartError)}
              message={addToCartError || ''}
              type="error"
              onClose={() => setAddToCartError(null)}
            />

            {/* Mô tả sản phẩm (13px, line-height 1.6, màu chữ thường) */}
            {product.description && (
              <div className={styles.descriptionText}>
                {product.description}
              </div>
            )}

            {/* Các mục thu gọn Accordion (12px chữ hoa, kẻ mỏng giữa các mục) */}
            <div className={styles.accordionSection}>
              {/* Mục 1: Chất liệu và bảo quản (chỉ hiện khi có material) */}
              {product.material && (
                <div className={styles.accordionItem}>
                  <button
                    type="button"
                    className={styles.accordionHeader}
                    onClick={() => toggleAccordion('material')}
                    aria-expanded={openAccordion === 'material'}
                  >
                    <span>CHẤT LIỆU VÀ BẢO QUẢN</span>
                    {openAccordion === 'material' ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                  {openAccordion === 'material' && (
                    <div className={styles.accordionContent}>
                      <p>
                        <strong>Chất liệu:</strong> {product.material}
                      </p>
                      <p style={{ marginTop: '6px' }}>
                        <strong>Bảo quản:</strong> Giặt tay nhẹ nhàng ở nhiệt độ
                        thường hoặc giặt khô chuyên nghiệp. Không sử dụng thuốc tẩy.
                        Ủi ở nhiệt độ thấp nếu cần.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Mục 2: Giao hàng và đổi trả */}
              <div className={styles.accordionItem}>
                <button
                  type="button"
                  className={styles.accordionHeader}
                  onClick={() => toggleAccordion('shipping')}
                  aria-expanded={openAccordion === 'shipping'}
                >
                  <span>GIAO HÀNG &amp; ĐỔI TRẢ</span>
                  {openAccordion === 'shipping' ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>
                {openAccordion === 'shipping' && (
                  <div className={styles.accordionContent}>
                    <p>
                      • Miễn phí vận chuyển tiêu chuẩn cho đơn hàng từ{' '}
                      {(STORE_POLICIES.freeShippingThreshold / 1000000).toLocaleString(
                        'vi-VN',
                      )}{' '}
                      triệu đồng toàn quốc.
                    </p>
                    <p style={{ marginTop: '6px' }}>
                      • Hỗ trợ đổi kích cỡ hoặc đổi trả linh hoạt trong vòng{' '}
                      {STORE_POLICIES.returnPeriodDays} ngày kể từ ngày nhận hàng
                      đối với sản phẩm còn nguyên tem mác.
                    </p>
                    <Link to="/help" className={styles.accordionLink}>
                      Xem chi tiết chính sách dịch vụ →
                    </Link>
                  </div>
                )}
              </div>

              {/* Mục 3: Kích thước sản phẩm (Mở modal hướng dẫn chọn size) */}
              <div className={styles.accordionItem}>
                <button
                  type="button"
                  className={styles.accordionHeader}
                  onClick={() => setIsSizeGuideOpen(true)}
                >
                  <span>KÍCH THƯỚC SẢN PHẨM</span>
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* 3. KHỐI CÓ THỂ BẠN QUAN TÂM (Lưới compact dùng chung, tiêu đề 12px chữ hoa) */}
        {relatedProducts.length > 0 && (
          <ProductCompactGrid
            title="CÓ THỂ BẠN QUAN TÂM"
            products={relatedProducts}
            className={styles.relatedSection}
            hideBadges
            columns={6}
          />
        )}
      </div>

      {/* Modal Bảng hướng dẫn chọn size chuẩn */}
      <Modal
        isOpen={isSizeGuideOpen}
        onClose={() => {
          setIsSizeGuideOpen(false)
          sizeGuideBtnRef.current?.focus()
        }}
        title="Bảng Hướng Dẫn Chọn Kích Cỡ"
        size="lg"
      >
        <div className={styles.sizeGuideModalContent}>
          <p className={styles.sizeGuideNote}>
            Bảng thông số kích cỡ may đo chuẩn của MODE STUDIO (tính bằng cm và kg).
            Quý khách vui lòng đối chiếu số đo cơ thể để lựa chọn kích cỡ vừa vặn
            nhất:
          </p>

          <div className={styles.sizeGuideTableWrapper}>
            <table className={styles.sizeGuideTable}>
              <thead>
                <tr>
                  <th scope="col">Kích cỡ</th>
                  <th scope="col">Vòng ngực</th>
                  <th scope="col">Vòng eo</th>
                  <th scope="col">Vòng mông</th>
                  <th scope="col">Chiều cao gợi ý</th>
                  <th scope="col">Cân nặng gợi ý</th>
                </tr>
              </thead>
              <tbody>
                {SIZE_GUIDE_DATA.map((row) => (
                  <tr key={row.size}>
                    <td className={styles.sizeGuideCellBold}>{row.size}</td>
                    <td>{row.bust} cm</td>
                    <td>{row.waist} cm</td>
                    <td>{row.hips} cm</td>
                    <td>{row.height} cm</td>
                    <td>{row.weight} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.sizeGuideTips}>
            <h4 className={styles.sizeGuideTipsTitle}>
              Lời khuyên từ thợ may đo MODE STUDIO:
            </h4>
            <ul className={styles.sizeGuideTipsList}>
              {SIZE_MEASUREMENT_TIPS.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ProductDetailPage
