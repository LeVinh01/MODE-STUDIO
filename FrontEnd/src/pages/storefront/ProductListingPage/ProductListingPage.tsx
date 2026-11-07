import { useEffect, useState, useMemo } from 'react'
import { SlidersHorizontal, AlertCircle, X } from 'lucide-react'
import { Breadcrumbs, type BreadcrumbItem } from '@/components/navigation/Breadcrumbs'
import { Pagination } from '@/components/navigation/Pagination'
import { Select } from '@/components/common/Select'
import { Button } from '@/components/common/Button'
import { Badge } from '@/components/common/Badge'
import { Drawer } from '@/components/feedback/Drawer'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ProductCard, ProductCardSkeleton } from '@/components/storefront/ProductCard'
import { ProductFilter } from '@/components/storefront/ProductFilter'
import { useProductFilters, type ParsedFilters } from '@/hooks/useProductFilters'
import { productService } from '@/services/api/productService'
import { categoryService } from '@/services/api/categoryService'
import {
  SORT_OPTIONS,
  FILTER_COLORS,
  FILTER_SIZES,
  FILTER_GENDERS,
} from '@/config/filters'
import type { Product, ProductCategory } from '@/types/product'
import type { PaginationMeta } from '@/types/common'
import { formatCurrency } from '@/utils/formatters'
import styles from './ProductListingPage.module.scss'

// Helper tìm thông tin danh mục đang active để hiển thị tiêu đề và breadcrumbs
const findActiveCategory = (
  categories: ProductCategory[],
  categorySlug?: string,
): { targetCategory: ProductCategory; parentCategory: ProductCategory | null } | null => {
  if (!categorySlug) return null

  // Tìm trong danh mục gốc
  for (const rootCat of categories) {
    if (rootCat.slug === categorySlug) {
      return { targetCategory: rootCat, parentCategory: null }
    }
    // Tìm trong danh mục con
    if (rootCat.children) {
      for (const child of rootCat.children) {
        if (child.slug === categorySlug) {
          return { targetCategory: child, parentCategory: rootCat }
        }
      }
    }
  }

  // Tiêu đề dự phòng nếu slug không có trong danh mục backend
  return {
    targetCategory: {
      id: 'unknown',
      name: categorySlug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      slug: categorySlug,
    },
    parentCategory: null,
  }
}

export const ProductListingPage = () => {
  const {
    parsedFilters,
    apiFilters,
    updateUrl,
    setPage,
    setSort,
    clearAllFilters,
  } = useProductFilters()

  // 1. Data states
  const [products, setProducts] = useState<Product[]>([])
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [retryTrigger, setRetryTrigger] = useState<number>(0)

  // 2. Categories state
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true)

  // 3. Mobile drawer temporary filter state
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)
  const [tempFilters, setTempFilters] = useState<ParsedFilters>(parsedFilters)

  // Wishlist mock tracking
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({})
  const handleToggleWishlist = (productId: string) => {
    setWishlist((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }))
  }

  // Tải danh mục 1 lần khi mount
  useEffect(() => {
    const controller = new AbortController()

    const loadCategories = async () => {
      setIsLoadingCategories(true)
      try {
        const catList = await categoryService.getCategories(controller.signal)
        setCategories(catList)
      } catch {
        // Lỗi danh mục không làm crash trang
      } finally {
        setIsLoadingCategories(false)
      }
    }

    loadCategories()

    return () => {
      controller.abort()
    }
  }, [])

  // Tìm thông tin danh mục đang active để hiển thị tiêu đề và breadcrumbs
  const activeCategory = findActiveCategory(categories, parsedFilters.category)

  // Tải danh sách sản phẩm mỗi khi apiFilters thay đổi
  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    const loadProducts = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const res = await productService.getProducts(apiFilters, signal)
        setProducts(res.items)
        setPaginationMeta(res.meta)
      } catch (err: unknown) {
        if (!signal.aborted) {
          const msg =
            err instanceof Error
              ? err.message
              : 'Không thể kết nối đến máy chủ. Vui lòng thử lại.'
          setErrorMessage(msg)
          setProducts([])
          setPaginationMeta(null)
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      controller.abort()
    }
  }, [apiFilters, retryTrigger])

  // Khi mở mobile drawer, sao chép state hiện tại làm state tạm
  const handleOpenDrawer = () => {
    setTempFilters(parsedFilters)
    setIsDrawerOpen(true)
  }

  // Áp dụng bộ lọc từ Mobile Drawer
  const handleApplyDrawerFilters = () => {
    updateUrl(tempFilters)
    setIsDrawerOpen(false)
  }

  // Thiết lập lại từ Mobile Drawer
  const handleResetDrawerFilters = () => {
    clearAllFilters()
    setIsDrawerOpen(false)
  }

  // Chuyển trang kèm cuộn mượt lên đầu danh sách
  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 120, behavior: 'smooth' })
  }

  // Đếm tổng số tiêu chí đang active để hiển thị badge nút bộ lọc mobile
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (parsedFilters.category) count++
    if (parsedFilters.gender) count++
    if (parsedFilters.minPrice !== undefined || parsedFilters.maxPrice !== undefined) count++
    if (parsedFilters.colorIds.length > 0) count += parsedFilters.colorIds.length
    if (parsedFilters.sizeIds.length > 0) count += parsedFilters.sizeIds.length
    if (parsedFilters.q) count++
    return count
  }, [parsedFilters])

  // Breadcrumbs items
  const breadcrumbItems = useMemo(() => {
    const items: BreadcrumbItem[] = [{ label: 'Trang Chủ', to: '/' }]

    if (activeCategory) {
      items.push({ label: 'Bộ Sưu Tập', to: '/products' })
      if (activeCategory.parentCategory) {
        items.push({
          label: activeCategory.parentCategory.name,
          to: `/products?category=${activeCategory.parentCategory.slug}`,
        })
      }
      items.push({ label: activeCategory.targetCategory.name })
    } else if (parsedFilters.q) {
      items.push({ label: 'Bộ Sưu Tập', to: '/products' })
      items.push({ label: `Tìm kiếm: "${parsedFilters.q}"` })
    } else {
      items.push({ label: 'Tất Cả Thiết Kế' })
    }

    return items
  }, [activeCategory, parsedFilters.q])

  // Tiêu đề trang
  const pageHeading = useMemo(() => {
    if (parsedFilters.q) {
      return `Kết Quả Tìm Kiếm: "${parsedFilters.q}"`
    }
    if (activeCategory) {
      return activeCategory.targetCategory.name
    }
    return 'Tất Cả Thiết Kế May Đo'
  }, [parsedFilters.q, activeCategory])

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* ==================================================================
            1. HEADER & BREADCRUMBS
            ================================================================== */}
        <header className={styles.headerSection}>
          <div className={styles.breadcrumbsWrapper}>
            <Breadcrumbs items={breadcrumbItems} />
          </div>
          <h1 className={styles.pageTitle}>{pageHeading}</h1>
          <p className={styles.pageDescription}>
            {activeCategory?.targetCategory.description ||
              'Khám phá bộ sưu tập may đo cao cấp mang tinh thần Modern Luxury, được hoàn thiện thủ công từ các sợi tự nhiên thượng hạng.'}
          </p>
        </header>

        {/* ==================================================================
            2. TOOLBAR (TOTAL COUNT, MOBILE FILTER BTN, SORT)
            ================================================================== */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <button
              type="button"
              className={styles.mobileFilterBtn}
              onClick={handleOpenDrawer}
              aria-label="Mở bộ lọc"
            >
              <SlidersHorizontal size={16} />
              <span>Bộ Lọc</span>
              {activeFiltersCount > 0 && (
                <Badge variant="default" size="sm">
                  {activeFiltersCount}
                </Badge>
              )}
            </button>

            <span className={styles.totalCount}>
              {isLoading
                ? 'Đang tìm kiếm...'
                : `Hiển thị ${paginationMeta?.total ?? products.length} thiết kế`}
            </span>
          </div>

          <div className={styles.toolbarRight}>
            <div className={styles.sortWrapper}>
              <Select
                value={parsedFilters.sort}
                onChange={(e) =>
                  setSort(e.target.value as 'newest' | 'price_asc' | 'price_desc')
                }
                options={SORT_OPTIONS}
                aria-label="Sắp xếp theo"
              />
            </div>
          </div>
        </div>

        {/* ==================================================================
            3. ACTIVE FILTER CHIPS BAR
            ================================================================== */}
        {activeFiltersCount > 0 && (
          <div className={styles.chipsBar} aria-label="Bộ lọc đang áp dụng">
            {/* Category Chip */}
            {parsedFilters.category && (
              <span className={styles.chip}>
                Danh mục: {activeCategory?.targetCategory.name || parsedFilters.category}
                <button
                  type="button"
                  onClick={() => updateUrl({ category: '' })}
                  className={styles.chipRemoveBtn}
                  aria-label="Xóa bộ lọc danh mục"
                >
                  <X size={14} />
                </button>
              </span>
            )}

            {/* Gender Chip */}
            {parsedFilters.gender && (
              <span className={styles.chip}>
                Giới tính:{' '}
                {FILTER_GENDERS.find((g) => g.value === parsedFilters.gender)?.label}
                <button
                  type="button"
                  onClick={() => updateUrl({ gender: '' })}
                  className={styles.chipRemoveBtn}
                  aria-label="Xóa bộ lọc giới tính"
                >
                  <X size={14} />
                </button>
              </span>
            )}

            {/* Price Chip */}
            {(parsedFilters.minPrice !== undefined ||
              parsedFilters.maxPrice !== undefined) && (
              <span className={styles.chip}>
                Giá:{' '}
                {parsedFilters.minPrice !== undefined
                  ? formatCurrency(parsedFilters.minPrice)
                  : '0 đ'}{' '}
                –{' '}
                {parsedFilters.maxPrice !== undefined
                  ? formatCurrency(parsedFilters.maxPrice)
                  : 'Không giới hạn'}
                <button
                  type="button"
                  onClick={() =>
                    updateUrl({ minPrice: undefined, maxPrice: undefined })
                  }
                  className={styles.chipRemoveBtn}
                  aria-label="Xóa bộ lọc giá"
                >
                  <X size={14} />
                </button>
              </span>
            )}

            {/* Color Chips */}
            {parsedFilters.colorIds.map((cid) => {
              const colorInfo = FILTER_COLORS.find((c) => c.id === cid)
              return (
                <span key={cid} className={styles.chip}>
                  Màu: {colorInfo?.name || cid}
                  <button
                    type="button"
                    onClick={() =>
                      updateUrl({
                        colorIds: parsedFilters.colorIds.filter((c) => c !== cid),
                      })
                    }
                    className={styles.chipRemoveBtn}
                    aria-label={`Xóa màu ${colorInfo?.name}`}
                  >
                    <X size={14} />
                  </button>
                </span>
              )
            })}

            {/* Size Chips */}
            {parsedFilters.sizeIds.map((sid) => {
              const sizeInfo = FILTER_SIZES.find((s) => s.id === sid)
              return (
                <span key={sid} className={styles.chip}>
                  Size: {sizeInfo?.name || sid}
                  <button
                    type="button"
                    onClick={() =>
                      updateUrl({
                        sizeIds: parsedFilters.sizeIds.filter((s) => s !== sid),
                      })
                    }
                    className={styles.chipRemoveBtn}
                    aria-label={`Xóa size ${sizeInfo?.name}`}
                  >
                    <X size={14} />
                  </button>
                </span>
              )
            })}

            {/* Search Q Chip */}
            {parsedFilters.q && (
              <span className={styles.chip}>
                Tìm: &ldquo;{parsedFilters.q}&rdquo;
                <button
                  type="button"
                  onClick={() => updateUrl({ q: '' })}
                  className={styles.chipRemoveBtn}
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X size={14} />
                </button>
              </span>
            )}

            {/* Clear All Button */}
            <button
              type="button"
              className={styles.clearAllBtn}
              onClick={clearAllFilters}
            >
              Xóa tất cả bộ lọc
            </button>
          </div>
        )}

        {/* ==================================================================
            4. MAIN LAYOUT: SIDEBAR (DESKTOP) + PRODUCTS GRID
            ================================================================== */}
        <div className={styles.mainLayout}>
          {/* A. Sidebar cố định trên Desktop */}
          <aside
            className={styles.sidebarWrapper}
            aria-label="Bộ lọc sản phẩm desktop"
          >
            <ProductFilter
              filters={parsedFilters}
              onChange={(updated) => updateUrl(updated)}
              categories={categories}
              isLoadingCategories={isLoadingCategories}
            />
          </aside>

          {/* B. Lưới sản phẩm & Phân trang */}
          <main className={styles.productsContent}>
            {/* Loading State */}
            {isLoading && (
              <div className={styles.productsGrid}>
                {Array.from({ length: parsedFilters.perPage || 12 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Error State */}
            {!isLoading && errorMessage && (
              <div className={styles.errorBox} role="alert">
                <AlertCircle size={32} color="var(--color-error)" />
                <p className={styles.errorMessage}>{errorMessage}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRetryTrigger((prev) => prev + 1)}
                >
                  Thử lại
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !errorMessage && products.length === 0 && (
              <EmptyState
                title="Không Tìm Thấy Thiết Kế Phù Hợp"
                description="Rất tiếc, hiện tại không có sản phẩm nào thỏa mãn toàn bộ tiêu chí lọc đã chọn. Quý khách vui lòng thử điều chỉnh lại bộ lọc."
                action={
                  <Button variant="primary" size="md" onClick={clearAllFilters}>
                    Xóa Tất Cả Bộ Lọc
                  </Button>
                }
              />
            )}

            {/* Success State */}
            {!isLoading && !errorMessage && products.length > 0 && (
              <>
                <div className={styles.productsGrid}>
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isWishlisted={Boolean(wishlist[product.id])}
                      onWishlistToggle={handleToggleWishlist}
                    />
                  ))}
                </div>

                {/* Phân trang */}
                {paginationMeta && paginationMeta.lastPage > 1 && (
                  <div className={styles.paginationWrapper}>
                    <Pagination
                      page={paginationMeta.currentPage}
                      totalPages={paginationMeta.lastPage}
                      onChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </main>
        </div>

        {/* ==================================================================
            5. MOBILE / TABLET FILTER DRAWER
            ================================================================== */}
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          position="left"
          size="md"
          title="Bộ Lọc Sản Phẩm"
          footer={
            <div className={styles.drawerFooter}>
              <Button
                variant="secondary"
                size="md"
                onClick={handleResetDrawerFilters}
                fullWidth
              >
                Thiết Lập Lại
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleApplyDrawerFilters}
                fullWidth
              >
                Áp Dụng
              </Button>
            </div>
          }
        >
          <ProductFilter
            filters={tempFilters}
            onChange={(updated) =>
              setTempFilters((prev) => ({ ...prev, ...updated }))
            }
            categories={categories}
            isLoadingCategories={isLoadingCategories}
          />
        </Drawer>
      </div>
    </div>
  )
}

export default ProductListingPage
