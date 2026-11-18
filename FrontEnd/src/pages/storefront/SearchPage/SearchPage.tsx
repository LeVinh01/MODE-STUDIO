import { useState, useEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X, AlertCircle } from 'lucide-react'
import { ProductCompactGrid } from '@/components/storefront/ProductCompactGrid'
import { Button } from '@/components/common/Button'
import { productService } from '@/services/api/productService'
import type { Product, ProductSuggestion } from '@/types/product'
import { formatCurrency } from '@/utils/formatters'
import { formatPageTitle } from '@/config/brand'
import { cn } from '@/utils/cn'
import styles from './SearchPage.module.scss'

const SEARCH_PER_PAGE = 12

export const SearchPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // 1. Đồng bộ từ khóa trên URL (?q=... hoặc ?search=...)
  const urlQuery = searchParams.get('q') || searchParams.get('search') || ''

  // Input value cục bộ cho trải nghiệm gõ phím tức thì
  const [searchTerm, setSearchTerm] = useState(urlQuery)
  const [activeQuery, setActiveQuery] = useState(urlQuery.trim())

  // Trạng thái tìm kiếm chính
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [hasMore, setHasMore] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(urlQuery.trim()))
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [retryTrigger, setRetryTrigger] = useState<number>(0)

  // Trạng thái gợi ý trực tiếp (Live Suggestions Dropdown)
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([])
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState<boolean>(false)
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState<boolean>(false)
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)

  // Khối "Có thể bạn quan tâm" (sản phẩm bán chạy / hàng mới)
  const [recommendations, setRecommendations] = useState<Product[]>([])
  const [isRecLoading, setIsRecLoading] = useState<boolean>(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 2. Tự động focus vào ô tìm kiếm khi vào trang & đặt title
  useEffect(() => {
    inputRef.current?.focus()
    document.title = formatPageTitle('Tìm kiếm')
    return () => {
      document.title = formatPageTitle()
    }
  }, [])

  // 3. Đồng bộ lại ô input khi người dùng ấn Back/Forward (React pattern: state adjustment during render)
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery)
  if (prevUrlQuery !== urlQuery) {
    setPrevUrlQuery(urlQuery)
    setSearchTerm(urlQuery)
  }

  // 3.1 Xử lý đóng dropdown gợi ý khi click ngoài vùng tìm kiếm
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsSuggestionsOpen(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  // 3.2 Dọn dẹp debounce timer và abort controller khi unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      abortControllerRef.current?.abort()
    }
  }, [])

  // 4. Tải gợi ý "CÓ THỂ BẠN QUAN TÂM" (Bán chạy nhất, tối đa 8 sản phẩm; fallback hàng mới về)
  useEffect(() => {
    let isCancelled = false
    const loadRecommendations = async () => {
      setIsRecLoading(true)
      try {
        const res = await productService.getProducts({
          sort: 'best_selling',
          perPage: 8,
        })
        if (!isCancelled) {
          if (res.items.length >= 2) {
            setRecommendations(res.items)
          } else {
            const newestRes = await productService.getProducts({
              sort: 'newest',
              perPage: 8,
            })
            if (!isCancelled) {
              setRecommendations(newestRes.items)
            }
          }
        }
      } catch {
        if (!isCancelled) {
          try {
            const fallbackRes = await productService.getProducts({
              sort: 'newest',
              perPage: 8,
            })
            if (!isCancelled) {
              setRecommendations(fallbackRes.items)
            }
          } catch {
            // Im lặng nếu không tải được gợi ý
          }
        }
      } finally {
        if (!isCancelled) {
          setIsRecLoading(false)
        }
      }
    }

    loadRecommendations()
    return () => {
      isCancelled = true
    }
  }, [])

  // 5. Tìm kiếm tự động khi urlQuery thay đổi (Single source of truth)
  useEffect(() => {
    const trimmed = urlQuery.trim()
    const controller = new AbortController()
    const { signal } = controller

    const fetchSearchResults = async () => {
      if (!trimmed) {
        setSearchResults([])
        setTotalCount(0)
        setActiveQuery('')
        setIsLoading(false)
        setSearchError(null)
        return
      }

      setIsLoading(true)
      setSearchError(null)
      setActiveQuery(trimmed)

      try {
        const response = await productService.getProducts(
          {
            search: trimmed,
            page: 1,
            perPage: SEARCH_PER_PAGE,
          },
          signal,
        )

        if (!signal.aborted) {
          setSearchResults(response.items)
          setTotalCount(response.meta.total)
          setCurrentPage(response.meta.currentPage)
          setHasMore(response.meta.currentPage < response.meta.lastPage)
        }
      } catch (err: unknown) {
        if (!signal.aborted) {
          const isAbort =
            (err as { name?: string })?.name === 'CanceledError' ||
            (err as { name?: string })?.name === 'AbortError'
          if (!isAbort) {
            setSearchError(
              'Đã có lỗi xảy ra khi tìm kiếm. Quý khách vui lòng thử lại.',
            )
          }
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    fetchSearchResults()

    return () => {
      controller.abort()
    }
  }, [urlQuery, retryTrigger])

  // 6. Xử lý gõ chữ: gợi ý sản phẩm trực tiếp (debounced ~300ms, độ dài >= 2)
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchTerm(val)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    const trimmed = val.trim()
    if (trimmed.length < 2) {
      abortControllerRef.current?.abort()
      setSuggestions([])
      setIsSuggestionsLoading(false)
      setIsSuggestionsOpen(false)
      setHighlightedIndex(-1)
      return
    }

    setIsSuggestionsOpen(true)
    setIsSuggestionsLoading(true)
    setHighlightedIndex(-1)

    debounceTimerRef.current = setTimeout(async () => {
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const results = await productService.getSuggestions(
          trimmed,
          controller.signal,
        )
        if (!controller.signal.aborted) {
          setSuggestions(results)
          setIsSuggestionsLoading(false)
          setHighlightedIndex(-1)
        }
      } catch (err: unknown) {
        if (!controller.signal.aborted) {
          const isAbort =
            (err as { name?: string })?.name === 'CanceledError' ||
            (err as { name?: string })?.name === 'AbortError'
          if (!isAbort) {
            setSuggestions([])
            setIsSuggestionsLoading(false)
          }
        }
      }
    }, 300)
  }

  // Chọn gợi ý -> chuyển hướng sang trang chi tiết sản phẩm /products/{slug}
  const handleSelectSuggestion = (item: ProductSuggestion) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    abortControllerRef.current?.abort()
    setIsSuggestionsOpen(false)
    setHighlightedIndex(-1)
    navigate(`/products/${item.slug}`)
  }

  // Thực hiện tìm kiếm toàn diện (cập nhật URL query ?q=...)
  const handleSubmitSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    abortControllerRef.current?.abort()
    setIsSuggestionsOpen(false)
    setHighlightedIndex(-1)

    const trimmed = searchTerm.trim()
    if (trimmed) {
      setSearchParams({ q: trimmed }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  // Điều hướng bằng bàn phím: ArrowDown / ArrowUp / Enter / Escape
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isSuggestionsOpen && suggestions.length > 0) {
        setIsSuggestionsOpen(true)
        setHighlightedIndex(0)
        return
      }
      if (isSuggestionsOpen && suggestions.length > 0) {
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        )
      }
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (isSuggestionsOpen && suggestions.length > 0) {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        )
      }
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (
        isSuggestionsOpen &&
        highlightedIndex >= 0 &&
        suggestions[highlightedIndex]
      ) {
        handleSelectSuggestion(suggestions[highlightedIndex])
        return
      }
      handleSubmitSearch()
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      setIsSuggestionsOpen(false)
      setHighlightedIndex(-1)
    }
  }

  // Khi focus vào ô tìm kiếm: mở lại dropdown nếu đã có từ khóa >= 2 ký tự
  const handleInputFocus = () => {
    if (
      searchTerm.trim().length >= 2 &&
      (suggestions.length > 0 || isSuggestionsLoading)
    ) {
      setIsSuggestionsOpen(true)
    }
  }

  // Nút xóa (X) khi có chữ
  const handleClear = () => {
    setSearchTerm('')
    setSuggestions([])
    setIsSuggestionsOpen(false)
    setIsSuggestionsLoading(false)
    setHighlightedIndex(-1)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    abortControllerRef.current?.abort()
    setSearchParams({}, { replace: true })
    inputRef.current?.focus()
  }

  // Nút xem thêm sản phẩm
  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore || !activeQuery) return

    setIsLoadingMore(true)
    const nextPage = currentPage + 1

    try {
      const response = await productService.getProducts({
        search: activeQuery,
        page: nextPage,
        perPage: SEARCH_PER_PAGE,
      })

      setSearchResults((prev) => [...prev, ...response.items])
      setTotalCount(response.meta.total)
      setCurrentPage(response.meta.currentPage)
      setHasMore(response.meta.currentPage < response.meta.lastPage)
    } catch {
      // Giữ nguyên danh sách hiện tại nếu tải thêm thất bại
    } finally {
      setIsLoadingMore(false)
    }
  }

  const isSearchActive = Boolean(activeQuery.trim())
  const hasNoResults =
    isSearchActive && !isLoading && searchResults.length === 0 && !searchError

  return (
    <div className={styles.searchPage}>
      <div className={styles.searchContainer}>
        {/* 1. KHUNG TÌM KIẾM TRUNG TÂM (Đường gạch chân, tối đa 560-640px, cao ~40px, căn giữa, không có icon kính lúp) */}
        <section className={styles.searchHeader} aria-label="Tìm kiếm sản phẩm">
          <div className={styles.inputWrapper} ref={searchContainerRef}>
            <label htmlFor="storefront-search-input" className={styles.srOnly}>
              Nhập từ khóa tìm kiếm sản phẩm
            </label>
            <input
              id="storefront-search-input"
              ref={inputRef}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isSuggestionsOpen}
              aria-controls="search-suggestions-dropdown"
              aria-activedescendant={
                highlightedIndex >= 0 && suggestions[highlightedIndex]
                  ? `suggestion-option-${suggestions[highlightedIndex].id}`
                  : undefined
              }
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              placeholder="BẠN ĐANG TÌM KIẾM GÌ?"
              className={styles.searchInput}
              autoComplete="off"
              aria-label="Tìm kiếm sản phẩm"
            />
            {searchTerm.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className={styles.clearButton}
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}

            {/* LIVE SUGGESTIONS DROPDOWN (AUTOCOMPLETE) */}
            {isSuggestionsOpen && (
              <div
                id="search-suggestions-dropdown"
                className={styles.suggestionsDropdown}
                role="listbox"
                aria-label="Gợi ý sản phẩm"
              >
                {isSuggestionsLoading ? (
                  <div
                    className={styles.suggestionsLoading}
                    role="status"
                    aria-live="polite"
                  >
                    <span
                      className={styles.suggestionsSpinner}
                      aria-hidden="true"
                    />
                    <span>Đang tìm kiếm...</span>
                  </div>
                ) : suggestions.length > 0 ? (
                  <ul className={styles.suggestionsList}>
                    {suggestions.map((item, index) => (
                      <li
                        key={item.id}
                        id={`suggestion-option-${item.id}`}
                        role="option"
                        aria-selected={index === highlightedIndex}
                        className={cn(
                          styles.suggestionItem,
                          index === highlightedIndex &&
                            styles.suggestionItemActive,
                        )}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onClick={() => handleSelectSuggestion(item)}
                      >
                        <div className={styles.suggestionThumbWrapper}>
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt={item.name}
                              className={styles.suggestionThumb}
                              loading="lazy"
                            />
                          ) : (
                            <div className={styles.suggestionThumbFallback}>
                              <span>MODE</span>
                            </div>
                          )}
                        </div>
                        <div className={styles.suggestionInfo}>
                          <span className={styles.suggestionName}>
                            {item.name}
                          </span>
                          <span className={styles.suggestionPrice}>
                            {formatCurrency(item.price)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.suggestionsEmpty} role="status">
                    <span>Không tìm thấy sản phẩm</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 2. VÙNG THÔNG BÁO ARIA-LIVE & TIÊU ĐỀ KẾT QUẢ */}
        {isSearchActive && (
          <div
            className={styles.resultsHeader}
            aria-live="polite"
            aria-atomic="true"
          >
            <h2 className={styles.resultsTitle}>
              Kết quả cho &ldquo;{activeQuery}&rdquo;
            </h2>
            {!isLoading && !searchError && (
              <span className={styles.resultsCount}>
                ({totalCount} sản phẩm)
              </span>
            )}
          </div>
        )}

        {/* 3. TRẠNG THÁI LOADING (SKELETON COMPACT) */}
        {isLoading && (
          <ProductCompactGrid products={[]} isLoading skeletonCount={8} />
        )}

        {/* 4. TRẠNG THÁI LỖI */}
        {searchError && !isLoading && (
          <div className={styles.errorState} role="alert">
            <AlertCircle size={24} className="text-red-500" aria-hidden="true" />
            <p className={styles.errorText}>{searchError}</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRetryTrigger((prev) => prev + 1)}
              className={styles.retryButton}
            >
              Thử lại
            </Button>
          </div>
        )}

        {/* 5. LƯỚI KẾT QUẢ TÌM KIẾM (COMPACT) */}
        {!isLoading && !searchError && searchResults.length > 0 && (
          <>
            <ProductCompactGrid products={searchResults} columns={6} />

            {/* Nút Xem thêm khi còn trang kế tiếp */}
            {hasMore && (
              <div className={styles.loadMoreWrapper}>
                <Button
                  type="button"
                  variant="secondary"
                  isLoading={isLoadingMore}
                  disabled={isLoadingMore}
                  onClick={handleLoadMore}
                  className={styles.loadMoreBtn}
                >
                  Xem thêm sản phẩm
                </Button>
              </div>
            )}
          </>
        )}

        {/* 6. THÔNG BÁO KHI TÌM KHÔNG CÓ KẾT QUẢ */}
        {hasNoResults && (
          <div className={styles.emptyNotice} role="status">
            <h3 className={styles.emptyTitle}>
              Không tìm thấy sản phẩm nào phù hợp với &ldquo;{activeQuery}&rdquo;
            </h3>
            <p className={styles.emptySubtitle}>
              Quý khách vui lòng kiểm tra lại chính tả hoặc khám phá các thiết kế thịnh hành được tuyển chọn bên dưới.
            </p>
          </div>
        )}

        {/* 7. KHỐI "CÓ THỂ BẠN QUAN TÂM": Hiển thị khi ô tìm kiếm trống HOẶC khi không có kết quả */}
        {(!isSearchActive || hasNoResults) && (
          <ProductCompactGrid
            title="CÓ THỂ BẠN QUAN TÂM"
            products={recommendations.slice(0, 8)}
            isLoading={isRecLoading}
            skeletonCount={6}
            columns={6}
            className={styles.recommendationWrapper}
          />
        )}
      </div>
    </div>
  )
}

export default SearchPage
