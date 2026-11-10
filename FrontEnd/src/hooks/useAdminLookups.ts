import { useEffect, useState, useCallback } from 'react'
import { adminProductService } from '@/services/api/adminProductService'
import type { AdminLookups } from '@/types/adminProduct'
import axios from 'axios'

let memoryLookupsCache: AdminLookups | null = null

const EMPTY_LOOKUPS: AdminLookups = {
  categories: [],
  brands: [],
  colors: [],
  sizes: [],
  genders: [],
  statuses: [],
}

export const useAdminLookups = () => {
  const [lookups, setLookups] = useState<AdminLookups | null>(memoryLookupsCache)
  const [isLoading, setIsLoading] = useState<boolean>(!memoryLookupsCache)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (memoryLookupsCache) {
      return
    }

    const controller = new AbortController()

    adminProductService
      .getAdminLookups(controller.signal)
      .then((data) => {
        memoryLookupsCache = data
        setLookups(data)
        setIsLoading(false)
        setError(null)
      })
      .catch((err) => {
        if (axios.isCancel(err)) {
          return
        }
        memoryLookupsCache = null
        setLookups(null)
        setIsLoading(false)
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Không thể tải dữ liệu danh mục và thương hiệu.'
        setError(message)
      })

    return () => {
      controller.abort()
    }
  }, [reloadKey])

  const retry = useCallback(() => {
    memoryLookupsCache = null
    setIsLoading(true)
    setError(null)
    setReloadKey((prev) => prev + 1)
  }, [])

  return {
    lookups: lookups || EMPTY_LOOKUPS,
    isLoading,
    error,
    retry,
  }
}
