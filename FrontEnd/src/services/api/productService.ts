import { apiClient } from './client'
import type {
  ApiPaginatedResponse,
  ApiProductDetailItem,
  ApiProductListItem,
  ApiSingleResponse,
  ProductQueryFilter,
} from '@/types/api'
import type { PaginatedProducts, Product } from '@/types/product'
import {
  mapApiPaginationMeta,
  mapProductDetailItemToProduct,
  mapProductListItemToProduct,
} from './mappers'

export const productService = {
  /**
   * Lấy danh sách sản phẩm với các bộ lọc và phân trang
   * Tham số đầu vào dùng camelCase, tự động map sang snake_case cho API
   */
  async getProducts(
    filter: ProductQueryFilter = {},
    signal?: AbortSignal,
  ): Promise<PaginatedProducts> {
    const params: Record<string, string | number | boolean> = {}

    if (filter.category) params.category = filter.category
    if (filter.brand) params.brand = filter.brand

    if (filter.color !== undefined) {
      params.color = Array.isArray(filter.color)
        ? filter.color.join(',')
        : String(filter.color)
    }

    if (filter.size !== undefined) {
      params.size = Array.isArray(filter.size)
        ? filter.size.join(',')
        : String(filter.size)
    }

    if (filter.minPrice !== undefined) params.min_price = filter.minPrice
    if (filter.maxPrice !== undefined) params.max_price = filter.maxPrice
    if (filter.gender) params.gender = filter.gender
    if (filter.search) params.search = filter.search
    if (filter.featured !== undefined) params.featured = filter.featured ? 1 : 0
    if (filter.sort) params.sort = filter.sort
    if (filter.perPage !== undefined) params.per_page = filter.perPage
    if (filter.page !== undefined) params.page = filter.page

    const response = await apiClient.get<ApiPaginatedResponse<ApiProductListItem>>(
      '/products',
      {
        params,
        signal,
      },
    )

    return {
      items: response.data.data.map(mapProductListItemToProduct),
      meta: mapApiPaginationMeta(response.data.meta),
    }
  },

  /**
   * Lấy chi tiết một sản phẩm theo slug
   */
  async getProductBySlug(slug: string, signal?: AbortSignal): Promise<Product> {
    const response = await apiClient.get<ApiSingleResponse<ApiProductDetailItem>>(
      `/products/${slug}`,
      {
        signal,
      },
    )

    return mapProductDetailItemToProduct(response.data.data)
  },
}
