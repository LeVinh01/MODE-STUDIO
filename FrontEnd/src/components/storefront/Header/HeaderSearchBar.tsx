import React, { useState, useRef, useEffect, type ChangeEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { productService } from '@/services/api/productService'
import type { ProductSuggestion } from '@/types/product'
import { formatCurrency } from '@/utils/formatters'
import { BRAND_NAME } from '@/config/brand'
import { cn } from '@/utils/cn'
import styles from './HeaderSearchBar.module.scss'

export interface HeaderSearchBarProps {
  isMobileSearchOpen?: boolean
  onCloseMobileSearch?: () => void
}

export const HeaderSearchBar: React.FC<HeaderSearchBarProps> = ({
  isMobileSearchOpen = false,
  onCloseMobileSearch,
}) => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Focus input when opened in mobile mode
  useEffect(() => {
    if (isMobileSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isMobileSearchOpen])

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup abort controller and timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      abortControllerRef.current?.abort()
    }
  }, [])

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
      setIsLoading(false)
      setIsOpen(false)
      setHighlightedIndex(-1)
      return
    }

    setIsOpen(true)
    setIsLoading(true)
    setHighlightedIndex(-1)

    debounceTimerRef.current = setTimeout(async () => {
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const results = await productService.getSuggestions(trimmed, controller.signal)
        if (!controller.signal.aborted) {
          setSuggestions(results)
          setIsLoading(false)
          setHighlightedIndex(-1)
        }
      } catch (err: unknown) {
        if (!controller.signal.aborted) {
          const isAbort =
            (err as { name?: string })?.name === 'CanceledError' ||
            (err as { name?: string })?.name === 'AbortError'
          if (!isAbort) {
            setSuggestions([])
            setIsLoading(false)
          }
        }
      }
    }, 300)
  }

  const handleSelectSuggestion = (item: ProductSuggestion) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    abortControllerRef.current?.abort()
    setIsOpen(false)
    setHighlightedIndex(-1)
    onCloseMobileSearch?.()
    navigate(`/products/${item.slug}`)
  }

  const handleSubmitSearch = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    abortControllerRef.current?.abort()
    setIsOpen(false)
    setHighlightedIndex(-1)
    onCloseMobileSearch?.()

    const trimmed = searchTerm.trim()
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`)
    } else {
      navigate('/search')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen && suggestions.length > 0) {
        setIsOpen(true)
        setHighlightedIndex(0)
        return
      }
      if (isOpen && suggestions.length > 0) {
        setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
      }
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (isOpen && suggestions.length > 0) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
      }
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (isOpen && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleSelectSuggestion(suggestions[highlightedIndex])
      } else {
        handleSubmitSearch()
      }
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
      onCloseMobileSearch?.()
    }
  }

  const handleClear = () => {
    setSearchTerm('')
    setSuggestions([])
    setIsOpen(false)
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        styles.searchContainer,
        isMobileSearchOpen && styles.mobileSearchActive
      )}
    >
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmitSearch()
        }}
        className={styles.searchForm}
      >
        <div className={styles.pillInputWrapper}>
          <button
            type="submit"
            className={styles.searchSubmitButton}
            aria-label="Tìm kiếm"
          >
            <Search size={16} aria-hidden="true" />
          </button>

          <input
            ref={inputRef}
            type="search"
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0 || (searchTerm.trim().length >= 2 && isLoading)) {
                setIsOpen(true)
              }
            }}
            placeholder="Tìm kiếm trang phục, mã sản phẩm..."
            aria-label="Tìm kiếm sản phẩm"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls="header-search-suggestions"
            aria-activedescendant={
              highlightedIndex >= 0 && suggestions[highlightedIndex]
                ? `header-suggestion-${suggestions[highlightedIndex].id}`
                : undefined
            }
            className={styles.pillInput}
          />

          {searchTerm.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className={styles.clearButton}
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <X size={15} aria-hidden="true" />
            </button>
          )}

          {isMobileSearchOpen && (
            <button
              type="button"
              onClick={onCloseMobileSearch}
              className={styles.closeMobileButton}
              aria-label="Đóng tìm kiếm"
            >
              Đóng
            </button>
          )}
        </div>
      </form>

      {/* Gợi ý tìm kiếm trực tiếp (Autocomplete Dropdown) */}
      {isOpen && (
        <div
          id="header-search-suggestions"
          className={styles.suggestionsDropdown}
          role="listbox"
          aria-label="Gợi ý sản phẩm"
        >
          {isLoading ? (
            <div className={styles.suggestionsLoading} role="status" aria-live="polite">
              <span className={styles.suggestionsSpinner} aria-hidden="true" />
              <span>Đang tìm kiếm...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <ul className={styles.suggestionsList}>
              {suggestions.map((item, index) => (
                <li
                  key={item.id}
                  id={`header-suggestion-${item.id}`}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  className={cn(
                    styles.suggestionItem,
                    index === highlightedIndex && styles.suggestionItemActive
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
                        <span>{BRAND_NAME.slice(0, 2)}</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.suggestionInfo}>
                    <span className={styles.suggestionName}>{item.name}</span>
                    <span className={styles.suggestionPrice}>
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.suggestionsEmpty} role="status">
              <span>Không tìm thấy sản phẩm phù hợp</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
