import { apiClient } from './client'
import type { ApiCategoryItem, ApiSingleResponse } from '@/types/api'
import type { ProductCategory } from '@/types/product'
import { mapCategoryItemToCategory } from './mappers'

export const categoryService = {
  /**
   * Lấy toàn bộ cây danh mục cha - con đang hoạt động
   */
  async getCategories(signal?: AbortSignal): Promise<ProductCategory[]> {
    const response = await apiClient.get<ApiSingleResponse<ApiCategoryItem[]>>(
      '/categories',
      {
        signal,
      },
    )

    return response.data.data.map(mapCategoryItemToCategory)
  },
}
