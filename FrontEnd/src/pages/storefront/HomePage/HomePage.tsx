import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Sparkles,
  Truck,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { Skeleton, EmptyState } from '@/components/feedback'
import { ProductCard, ProductCardSkeleton } from '@/components/storefront/ProductCard'
import { STORE_SERVICE_HIGHLIGHTS } from '@/config/store'
import { formatCurrency } from '@/utils/formatters'
import { productService } from '@/services/api/productService'
import type { Product } from '@/types/product'
import styles from './HomePage.module.scss'

interface CategoryCounts {
  women: number | null
  men: number | null
  accessories: number | null
}

export const HomePage = () => {
  // Feature flag AI Styling
  const isAiStylingEnabled = import.meta.env.VITE_ENABLE_AI_STYLING === 'true'

  // Wishlist state (local storage / in-memory mockup)
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({
    '1': true,
  })

  const handleToggleWishlist = (productId: string) => {
    setWishlist((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }))
  }

  // 1. Data states
  const [newArrivals, setNewArrivals] = useState<Product[]>([])
  const [isLoadingNewArrivals, setIsLoadingNewArrivals] = useState<boolean>(true)
  const [newArrivalsError, setNewArrivalsError] = useState<string | null>(null)

  const [categoryCounts, setCategoryCounts] = useState<CategoryCounts>({
    women: null,
    men: null,
    accessories: null,
  })
  const [isLoadingCounts, setIsLoadingCounts] = useState<boolean>(true)

  const [aiOutfitItems, setAiOutfitItems] = useState<Product[]>([])
  const [isLoadingAiOutfits, setIsLoadingAiOutfits] = useState<boolean>(true)

  const [bestSellingProducts, setBestSellingProducts] = useState<Product[]>([])

  // 2. Retry trigger
  const [retryTrigger, setRetryTrigger] = useState<number>(0)
  const handleRetry = useCallback(() => {
    setRetryTrigger((prev) => prev + 1)
  }, [])

  // 3. Fetch data with AbortController
  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    const loadHomePageData = async () => {
      // A. Fetch "Hàng Mới Về" (4 sản phẩm mới nhất)
      setIsLoadingNewArrivals(true)
      setNewArrivalsError(null)
      try {
        const res = await productService.getProducts(
          { sort: 'newest', perPage: 4 },
          signal,
        )
        setNewArrivals(res.items)
      } catch (err: unknown) {
        if (!signal.aborted) {
          const message =
            err instanceof Error
              ? err.message
              : 'Không thể tải danh sách hàng mới về.'
          setNewArrivalsError(message)
        }
      } finally {
        if (!signal.aborted) {
          setIsLoadingNewArrivals(false)
        }
      }

      // B. Fetch số lượng thiết kế trên các thẻ danh mục (chạy song song)
      setIsLoadingCounts(true)
      try {
        const [womenRes, menRes, accRes] = await Promise.all([
          productService.getProducts({ category: 'women', perPage: 1 }, signal),
          productService.getProducts({ category: 'men', perPage: 1 }, signal),
          productService.getProducts({ category: 'accessories', perPage: 1 }, signal),
        ])

        if (!signal.aborted) {
          setCategoryCounts({
            women: womenRes.meta.total,
            men: menRes.meta.total,
            accessories: accRes.meta.total,
          })
        }
      } catch {
        if (!signal.aborted) {
          // Khi lỗi không chặn UI mà hiển thị fallback
          setCategoryCounts({ women: null, men: null, accessories: null })
        }
      } finally {
        if (!signal.aborted) {
          setIsLoadingCounts(false)
        }
      }

      // C. Fetch 3 sản phẩm nổi bật (featured=true) cho khối Gợi ý phối đồ AI
      setIsLoadingAiOutfits(true)
      try {
        const featuredRes = await productService.getProducts(
          { featured: true, perPage: 3 },
          signal,
        )
        if (!signal.aborted) {
          setAiOutfitItems(featuredRes.items)
        }
      } catch {
        if (!signal.aborted) {
          setAiOutfitItems([])
        }
      } finally {
        if (!signal.aborted) {
          setIsLoadingAiOutfits(false)
        }
      }

      // D. Fetch "Bán Chạy" (4 sản phẩm xếp theo best_selling)
      try {
        const bestRes = await productService.getProducts(
          { sort: 'best_selling', perPage: 4 },
          signal,
        )
        if (!signal.aborted) {
          setBestSellingProducts(bestRes.items)
        }
      } catch {
        if (!signal.aborted) {
          setBestSellingProducts([])
        }
      }
    }

    loadHomePageData()

    return () => {
      // Hủy request khi component unmount hoặc khi retryTrigger thay đổi
      controller.abort()
    }
  }, [retryTrigger])

  // Icon mapping for service highlights
  const serviceIcons = {
    Truck: <Truck size={24} aria-hidden="true" />,
    RefreshCw: <RefreshCw size={24} aria-hidden="true" />,
    ShieldCheck: <ShieldCheck size={24} aria-hidden="true" />,
    Sparkles: <Sparkles size={24} aria-hidden="true" />,
  }

  return (
    <div className={styles.homePage}>
      {/* ====================================================================
          1. HERO EDITORIAL SECTION (Only single <h1> on the entire page)
          ==================================================================== */}
      <section className={styles.heroSection} aria-labelledby="hero-heading">
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              <span className={styles.heroTagline}>May Đo Hiện Đại &amp; Tối Giản</span>
              <h1 id="hero-heading" className={styles.heroTitle}>
                Vẻ Đẹp Vượt Thời Gian Trong Từng Đường May
              </h1>
              <p className={styles.heroLead}>
                Khám phá bộ sưu tập thời trang may đo mang tinh thần sang trọng tối giản.
                Từng đường kim, mũi chỉ và chất liệu tự nhiên thượng hạng được chế tác
                tinh xảo để tôn vinh sự thanh lịch trường tồn.
              </p>
              <div className={styles.heroActions}>
                <Button to="/products" variant="primary" size="lg">
                  Khám Phá Bộ Sưu Tập
                </Button>
                <Button to="/products" variant="secondary" size="lg">
                  Xem Lookbook Mùa Thu
                </Button>
              </div>
            </div>

            <div className={styles.heroVisual} aria-hidden="true">
              <div className={styles.heroVisualInner}>
                <span className={styles.heroMonogram}>MODE STUDIO</span>
                <span className={styles.heroSeason}>THU / ĐÔNG 2026</span>
                <span className={styles.heroVisualCaption}>
                  May Đo &amp; Thiết Kế Cao Cấp
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          2. CATEGORY STRIP SECTION
          ==================================================================== */}
      <section className={styles.categorySection} aria-labelledby="category-heading">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionTagline}>BỘ SƯU TẬP CHỦ ĐẠO</span>
              <h2 id="category-heading" className={styles.sectionTitle}>
                Danh Mục Tuyển Chọn
              </h2>
              <p className={styles.sectionSubtitle}>
                Các phân khúc thiết kế may đo cao cấp định hình phong cách cá nhân
              </p>
            </div>
          </div>

          <div className={styles.categoryGrid}>
            {/* Category 1: Women */}
            <Link to="/products?category=women" className={styles.categoryCard}>
              <div className={styles.categoryVisual} aria-hidden="true">
                <span className={styles.categoryPlaceholderIcon}>NỮ</span>
              </div>
              <div className={styles.categoryContent}>
                <span className={styles.categoryCount}>
                  {isLoadingCounts ? (
                    <Skeleton width={70} height={14} />
                  ) : (
                    `${categoryCounts.women ?? '—'} Thiết Kế`
                  )}
                </span>
                <h3 className={styles.categoryName}>Thời Trang Nữ</h3>
                <span className={styles.categoryCta}>
                  Khám Phá Ngay <ArrowRight size={14} aria-hidden="true" />
                </span>
              </div>
            </Link>

            {/* Category 2: Men */}
            <Link to="/products?category=men" className={styles.categoryCard}>
              <div className={styles.categoryVisual} aria-hidden="true">
                <span className={styles.categoryPlaceholderIcon}>NAM</span>
              </div>
              <div className={styles.categoryContent}>
                <span className={styles.categoryCount}>
                  {isLoadingCounts ? (
                    <Skeleton width={70} height={14} />
                  ) : (
                    `${categoryCounts.men ?? '—'} Thiết Kế`
                  )}
                </span>
                <h3 className={styles.categoryName}>Thời Trang Nam</h3>
                <span className={styles.categoryCta}>
                  Khám Phá Ngay <ArrowRight size={14} aria-hidden="true" />
                </span>
              </div>
            </Link>

            {/* Category 3: Accessories */}
            <Link to="/products?category=accessories" className={styles.categoryCard}>
              <div className={styles.categoryVisual} aria-hidden="true">
                <span className={styles.categoryPlaceholderIcon}>PHỤ KIỆN</span>
              </div>
              <div className={styles.categoryContent}>
                <span className={styles.categoryCount}>
                  {isLoadingCounts ? (
                    <Skeleton width={70} height={14} />
                  ) : (
                    `${categoryCounts.accessories ?? '—'} Thiết Kế`
                  )}
                </span>
                <h3 className={styles.categoryName}>Phụ Kiện Tinh Tuyển</h3>
                <span className={styles.categoryCta}>
                  Khám Phá Ngay <ArrowRight size={14} aria-hidden="true" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ====================================================================
          3. NEW ARRIVALS (FEATURED PRODUCTS GRID)
          ==================================================================== */}
      <section
        className={styles.newArrivalsSection}
        aria-labelledby="new-arrivals-heading"
      >
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionTagline}>ĐIỂM NHẤN MÙA MỚI</span>
              <h2 id="new-arrivals-heading" className={styles.sectionTitle}>
                Hàng Mới Về
              </h2>
            </div>
            <Link to="/products" className={styles.viewAllLink}>
              Xem Tất Cả Thiết Kế <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          {/* Loading State */}
          {isLoadingNewArrivals && (
            <div className={styles.productsGrid}>
              {Array.from({ length: 4 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Error State */}
          {!isLoadingNewArrivals && newArrivalsError && (
            <div className={styles.errorState} role="alert">
              <AlertCircle size={28} color="var(--color-error)" aria-hidden="true" />
              <p className={styles.errorMessage}>
                Đã xảy ra lỗi khi tải danh sách sản phẩm mới: {newArrivalsError}
              </p>
              <Button variant="secondary" size="sm" onClick={handleRetry}>
                Thử lại
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoadingNewArrivals && !newArrivalsError && newArrivals.length === 0 && (
            <EmptyState
              title="Chưa Có Sản Phẩm Mới"
              description="Bộ sưu tập đang được cập nhật thiết kế mới. Quý khách vui lòng quay lại sau."
              action={
                <Button to="/products" variant="primary" size="md">
                  Xem Tất Cả Sản Phẩm
                </Button>
              }
            />
          )}

          {/* Success State */}
          {!isLoadingNewArrivals && !newArrivalsError && newArrivals.length > 0 && (
            <div className={styles.productsGrid}>
              {newArrivals.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isWishlisted={Boolean(wishlist[product.id])}
                  onWishlistToggle={handleToggleWishlist}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ====================================================================
          3b. BEST SELLING PRODUCTS (Chỉ hiển thị khi có dữ liệu)
          ==================================================================== */}
      {bestSellingProducts.length > 0 && (
        <section
          className={styles.bestSellingSection}
          aria-labelledby="best-selling-heading"
        >
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.sectionTagline}>ĐƯỢC YÊU THÍCH NHẤT</span>
                <h2 id="best-selling-heading" className={styles.sectionTitle}>
                  Sản Phẩm Bán Chạy
                </h2>
                <p className={styles.sectionSubtitle}>
                  Những thiết kế may đo được lựa chọn nhiều nhất trong thời gian qua
                </p>
              </div>
              <Link to="/products?sort=best_selling" className={styles.viewAllLink}>
                Xem Tất Cả <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>

            <div className={styles.productsGrid}>
              {bestSellingProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isWishlisted={Boolean(wishlist[product.id])}
                  onWishlistToggle={handleToggleWishlist}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ====================================================================
          4. EDITORIAL LOOKBOOK / BRAND CAMPAIGN BANNER
          ==================================================================== */}
      <section
        className={styles.lookbookSection}
        aria-labelledby="lookbook-heading"
      >
        <div className={styles.container}>
          <div className={styles.lookbookContainer}>
            <span className={styles.lookbookTagline}>GÓC NHÌN THIẾT KẾ</span>
            <h2 id="lookbook-heading" className={styles.lookbookTitle}>
              Bộ Sưu Tập Thu Đông 2026
            </h2>
            <blockquote className={styles.lookbookQuote}>
              &ldquo;Thời trang không chỉ là trang phục bạn khoác lên mình, mà là
              ngôn ngữ tĩnh lặng của sự tự tin, phẩm vị và chuẩn mực thanh lịch
              vượt thời gian.&rdquo;
            </blockquote>
            <div className={styles.lookbookActions}>
              <Button to="/products" variant="primary" size="md">
                Khám Phá Chiến Dịch
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          5. AI STYLING RECOMMENDATION (DYNAMIC PLACEHOLDER DÙNG FEATURED PRODUCTS)
          ==================================================================== */}
      {isAiStylingEnabled && (
        <section
          className={styles.aiStylingSection}
          aria-labelledby="ai-styling-heading"
        >
        <div className={styles.container}>
          <div className={styles.aiHeader}>
            <div className={styles.aiBadgeRow}>
              <span className={styles.aiSparkleIcon}>
                <Sparkles size={18} aria-hidden="true" />
              </span>
              <Badge variant="luxury" size="sm">
                TÍNH NĂNG ĐANG PHÁT TRIỂN
              </Badge>
            </div>
            <h2 id="ai-styling-heading" className={styles.sectionTitle}>
              Gợi Ý Phối Đồ Dành Riêng Cho Bạn
            </h2>
            <p className={styles.aiDesc}>
              Hệ thống ứng dụng trí tuệ nhân tạo (AI) giúp gợi ý sản phẩm và phối đồ
              may đo thông minh theo phong cách cá nhân, gam màu ưa chuộng và hoàn cảnh
              xuất hiện của bạn.
            </p>
          </div>

          <div className={styles.aiMockupGrid}>
            {/* Left: Complete Look Preview */}
            <div className={styles.aiLookPreview}>
              <div className={styles.aiLookVisual} aria-hidden="true">
                <span className={styles.aiLookVisualMonogram}>GỢI Ý 01</span>
                <span className={styles.aiLookVisualSub}>
                  Thanh Lịch Đơn Sắc
                </span>
              </div>
              <div className={styles.aiLookMeta}>
                <div className={styles.aiMetaRow}>
                  <span className={styles.aiMetaLabel}>Phong cách:</span>
                  <span className={styles.aiMetaValue}>Sang trọng tối giản</span>
                </div>
                <div className={styles.aiMetaRow}>
                  <span className={styles.aiMetaLabel}>Tông màu:</span>
                  <span className={styles.aiMetaValue}>Taupe, Đen &amp; Kem</span>
                </div>
                <div className={styles.aiMetaRow}>
                  <span className={styles.aiMetaLabel}>Dịp sử dụng:</span>
                  <span className={styles.aiMetaValue}>
                    Công sở cao cấp &amp; Tiệc tối
                  </span>
                </div>
                <div className={styles.aiMetaRow}>
                  <span className={styles.aiMetaLabel}>Mức độ tương thích:</span>
                  <span className={styles.aiMetaBadge}>
                    Phù hợp cao (Ví dụ minh họa)
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Component items in the curated outfit */}
            <div className={styles.aiOutfitsSide}>
              <h3 className={styles.aiOutfitsTitle}>
                Các Thiết Kế Trong Set Đồ (Minh Họa)
              </h3>

              <div className={styles.aiItemsList}>
                {isLoadingAiOutfits && (
                  <>
                    <Skeleton variant="rectangular" width="100%" height={70} />
                    <Skeleton variant="rectangular" width="100%" height={70} />
                    <Skeleton variant="rectangular" width="100%" height={70} />
                  </>
                )}

                {!isLoadingAiOutfits &&
                  aiOutfitItems.map((item) => {
                    const thumbUrl = item.mainImage?.url || item.featuredImage
                    return (
                      <div key={item.id} className={styles.aiItemRow}>
                        <div className={styles.aiItemThumb} aria-hidden="true">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt=""
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: 'var(--radius-sm)',
                              }}
                            />
                          ) : (
                            <span>{item.category.name.slice(0, 3).toUpperCase()}</span>
                          )}
                        </div>
                        <div className={styles.aiItemInfo}>
                          <span className={styles.aiItemCategory}>
                            {item.category.name}
                          </span>
                          <span className={styles.aiItemName}>{item.name}</span>
                          <span className={styles.aiItemPrice}>
                            {formatCurrency(item.basePrice)}
                          </span>
                        </div>
                      </div>
                    )
                  })}

                {!isLoadingAiOutfits && aiOutfitItems.length === 0 && (
                  <p className={styles.aiFootnote}>
                    Chưa có thiết kế phù hợp cho set phối đồ này.
                  </p>
                )}
              </div>

              <div className={styles.aiActionBox}>
                <Button variant="secondary" size="md" disabled fullWidth>
                  Trải Nghiệm Phối Đồ Cùng AI (Sắp Ra Mắt)
                </Button>
                <span className={styles.aiFootnote}>
                  * Tính năng khóa luận tốt nghiệp đang được hoàn thiện thuật toán
                  gợi ý và phối đồ thông minh.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ====================================================================
          6. SERVICE HIGHLIGHTS (BRAND VALUE PROPOSITION)
          ==================================================================== */}
      <section className={styles.servicesSection} aria-label="Cam kết dịch vụ">
        <div className={styles.container}>
          <div className={styles.servicesGrid}>
            {STORE_SERVICE_HIGHLIGHTS.map((service) => (
              <div key={service.id} className={styles.serviceCard}>
                <div className={styles.serviceIconWrapper}>
                  {serviceIcons[service.iconName]}
                </div>
                <h3 className={styles.serviceTitle}>{service.title}</h3>
                <p className={styles.serviceDesc}>{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
