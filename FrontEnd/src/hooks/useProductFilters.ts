import { useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ProductQueryFilter } from '@/types/api'
import { DEFAULT_PER_PAGE } from '@/config/filters'

export interface ParsedFilters {
  category: string
  gender: '' | 'women' | 'men' | 'unisex'
  colorIds: string[]
  sizeIds: string[]
  minPrice?: number
  maxPrice?: number
  q: string
  sort: 'newest' | 'price_asc' | 'price_desc'
  page: number
  perPage: number
}

/**
 * Hook quản lý và đồng bộ 2 chiều giữa URL SearchParams và Bộ lọc sản phẩm
 */
export const useProductFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  // 1. Phân tích và validate nghiêm ngặt các tham số từ URL
  const parsedFilters: ParsedFilters = useMemo(() => {
    // A. Category slug
    const category = searchParams.get('category')?.trim() || ''

    // B. Gender (chỉ nhận women | men | unisex)
    const rawGender = searchParams.get('gender')?.trim() || ''
    const gender = (['women', 'men', 'unisex'].includes(rawGender)
      ? rawGender
      : '') as '' | 'women' | 'men' | 'unisex'

    // C. Color IDs (chỉ nhận danh sách ID số nguyên dương)
    const rawColor = searchParams.get('color') || ''
    const colorIds = rawColor
      .split(',')
      .map((c) => c.trim())
      .filter((c) => /^\d+$/.test(c) && parseInt(c, 10) > 0)

    // D. Size IDs (chỉ nhận danh sách ID số nguyên dương)
    const rawSize = searchParams.get('size') || ''
    const sizeIds = rawSize
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^\d+$/.test(s) && parseInt(s, 10) > 0)

    // E. Khoảng giá min_price & max_price (không âm, tự đổi chỗ nếu min > max)
    const rawMin = searchParams.get('min_price')
    const rawMax = searchParams.get('max_price')

    let minPrice: number | undefined = undefined
    if (rawMin !== null && /^\d+$/.test(rawMin.trim())) {
      const val = parseInt(rawMin.trim(), 10)
      if (val >= 0) minPrice = val
    }

    let maxPrice: number | undefined = undefined
    if (rawMax !== null && /^\d+$/.test(rawMax.trim())) {
      const val = parseInt(rawMax.trim(), 10)
      if (val >= 0) maxPrice = val
    }

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      const temp = minPrice
      minPrice = maxPrice
      maxPrice = temp
    }

    // F. Từ khóa tìm kiếm q (tối đa 100 ký tự)
    let q = searchParams.get('q')?.trim() || ''
    if (q.length > 100) {
      q = q.slice(0, 100)
    }

    // G. Sắp xếp sort (chỉ nhận newest | price_asc | price_desc, mặc định newest)
    const rawSort = searchParams.get('sort')?.trim() || ''
    const sort = (['newest', 'price_asc', 'price_desc'].includes(rawSort)
      ? rawSort
      : 'newest') as 'newest' | 'price_asc' | 'price_desc'

    // H. Page (số nguyên >= 1, mặc định 1)
    const rawPage = searchParams.get('page')
    let page = 1
    if (rawPage !== null && /^\d+$/.test(rawPage.trim())) {
      const parsed = parseInt(rawPage.trim(), 10)
      if (parsed >= 1) page = parsed
    }

    // I. Per page (kẹp từ 1 đến 48, mặc định 12)
    const rawPerPage = searchParams.get('per_page')
    let perPage = DEFAULT_PER_PAGE
    if (rawPerPage !== null && /^\d+$/.test(rawPerPage.trim())) {
      const parsed = parseInt(rawPerPage.trim(), 10)
      if (parsed >= 1 && parsed <= 48) {
        perPage = parsed
      }
    }

    return {
      category,
      gender,
      colorIds,
      sizeIds,
      minPrice,
      maxPrice,
      q,
      sort,
      page,
      perPage,
    }
  }, [searchParams])

  // 2. Chuyển đổi sang ProductQueryFilter (chuẩn camelCase để truyền vào productService)
  const apiFilters: ProductQueryFilter = useMemo(() => {
    return {
      category: parsedFilters.category || undefined,
      gender: parsedFilters.gender || undefined,
      color: parsedFilters.colorIds.length > 0 ? parsedFilters.colorIds.join(',') : undefined,
      size: parsedFilters.sizeIds.length > 0 ? parsedFilters.sizeIds.join(',') : undefined,
      minPrice: parsedFilters.minPrice,
      maxPrice: parsedFilters.maxPrice,
      q: parsedFilters.q || undefined,
      sort: parsedFilters.sort,
      page: parsedFilters.page,
      perPage: parsedFilters.perPage,
    }
  }, [parsedFilters])

  // 3. Hàm cập nhật URL SearchParams
  const updateUrl = useCallback(
    (newFilters: Partial<ParsedFilters>, resetPage = true) => {
      const current = { ...parsedFilters, ...newFilters }
      if (resetPage && newFilters.page === undefined) {
        current.page = 1
      }

      const params = new URLSearchParams()

      if (current.category) params.set('category', current.category)
      if (current.gender) params.set('gender', current.gender)
      if (current.colorIds && current.colorIds.length > 0) {
        params.set('color', current.colorIds.join(','))
      }
      if (current.sizeIds && current.sizeIds.length > 0) {
        params.set('size', current.sizeIds.join(','))
      }
      if (current.minPrice !== undefined && current.minPrice > 0) {
        params.set('min_price', String(current.minPrice))
      }
      if (current.maxPrice !== undefined && current.maxPrice > 0) {
        params.set('max_price', String(current.maxPrice))
      }
      if (current.q) params.set('q', current.q)

      // Chỉ ghi sort nếu khác 'newest'
      if (current.sort && current.sort !== 'newest') {
        params.set('sort', current.sort)
      }

      // Chỉ ghi page nếu > 1
      if (current.page > 1) {
        params.set('page', String(current.page))
      }

      // Chỉ ghi per_page nếu khác 12
      if (current.perPage !== DEFAULT_PER_PAGE) {
        params.set('per_page', String(current.perPage))
      }

      setSearchParams(params)
    },
    [parsedFilters, setSearchParams],
  )

  // 4. Các hàm tiện ích thao tác bộ lọc
  const setPage = useCallback(
    (pageNumber: number) => {
      updateUrl({ page: pageNumber }, false)
    },
    [updateUrl],
  )

  const setSort = useCallback(
    (sortValue: 'newest' | 'price_asc' | 'price_desc') => {
      updateUrl({ sort: sortValue })
    },
    [updateUrl],
  )

  const clearAllFilters = useCallback(() => {
    setSearchParams(new URLSearchParams())
  }, [setSearchParams])

  return {
    parsedFilters,
    apiFilters,
    updateUrl,
    setPage,
    setSort,
    clearAllFilters,
  }
}
