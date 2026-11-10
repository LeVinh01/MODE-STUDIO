import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import { adminProductService } from '@/services/api/adminProductService'
import type {
  AdminProductDetail,
  AdminVariantItem,
  AdminImageItem,
  ProductStatus,
} from '@/types/adminProduct'

interface UseAdminProductDetailOptions {
  onLoaded?: (data: AdminProductDetail) => void
}

interface UseAdminProductDetailResult {
  product: AdminProductDetail | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<AdminProductDetail | null>
  setProduct: React.Dispatch<React.SetStateAction<AdminProductDetail | null>>
  updateLocalVariant: (variant: AdminVariantItem) => void
  removeLocalVariant: (variantId: number) => void
  updateLocalStock: (variantId: number, quantityAfter: number) => void
  updateLocalImage: (image: AdminImageItem) => void
  removeLocalImage: (imageId: number) => void
  updateLocalStatus: (status: ProductStatus, publishedAt?: string | null) => void
}

export const useAdminProductDetail = (
  productId: string | number | undefined,
  options?: UseAdminProductDetailOptions,
): UseAdminProductDetailResult => {
  const [product, setProduct] = useState<AdminProductDetail | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(productId))
  const [error, setError] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const onLoadedRef = useRef(options?.onLoaded)

  useEffect(() => {
    onLoadedRef.current = options?.onLoaded
  }, [options?.onLoaded])

  // Hàm refetch chủ động khi có sự kiện từ người dùng hoặc callback
  const refetch = useCallback(async (): Promise<AdminProductDetail | null> => {
    if (!productId) {
      return null
    }

    setIsLoading(true)
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const data = await adminProductService.getAdminProductDetail(
        productId,
        controller.signal,
      )
      setProduct(data)
      setError(null)
      setIsLoading(false)
      onLoadedRef.current?.(data)
      return data
    } catch (err: unknown) {
      if (axios.isCancel(err)) {
        return null
      }
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Không thể tải thông tin sản phẩm. Vui lòng thử lại.'
      setError(msg)
      setIsLoading(false)
      return null
    }
  }, [productId])

  // Fetch ban đầu qua Promise để không setState đồng bộ trong effect body
  useEffect(() => {
    if (!productId) return

    let isMounted = true
    const controller = new AbortController()
    abortControllerRef.current = controller

    adminProductService
      .getAdminProductDetail(productId, controller.signal)
      .then((data) => {
        if (!isMounted) return
        setProduct(data)
        setError(null)
        setIsLoading(false)
        onLoadedRef.current?.(data)
      })
      .catch((err: unknown) => {
        if (!isMounted || axios.isCancel(err)) return
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ||
          'Không thể tải thông tin sản phẩm. Vui lòng thử lại.'
        setError(msg)
        setIsLoading(false)
      })

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [productId])

  // Cập nhật biến thể cục bộ tức thì
  const updateLocalVariant = useCallback((variant: AdminVariantItem) => {
    setProduct((prev) => {
      if (!prev) return prev
      const existingIndex = prev.variants.findIndex((v) => v.id === variant.id)
      let nextVariants: AdminVariantItem[]
      if (existingIndex >= 0) {
        nextVariants = [...prev.variants]
        nextVariants[existingIndex] = variant
      } else {
        nextVariants = [...prev.variants, variant]
      }
      return {
        ...prev,
        variants: nextVariants,
        variantsCount: nextVariants.filter((v) => !v.deletedAt).length,
      }
    })
  }, [])

  // Xóa biến thể cục bộ tức thì
  const removeLocalVariant = useCallback((variantId: number) => {
    setProduct((prev) => {
      if (!prev) return prev
      const nextVariants = prev.variants.filter((v) => v.id !== variantId)
      return {
        ...prev,
        variants: nextVariants,
        variantsCount: nextVariants.filter((v) => !v.deletedAt).length,
      }
    })
  }, [])

  // Cập nhật tồn kho cục bộ tức thì
  const updateLocalStock = useCallback(
    (variantId: number, quantityAfter: number) => {
      setProduct((prev) => {
        if (!prev) return prev
        let total = 0
        const nextVariants = prev.variants.map((v) => {
          if (v.id === variantId) {
            const updated = { ...v, stockQuantity: quantityAfter }
            if (!updated.deletedAt) total += updated.stockQuantity
            return updated
          }
          if (!v.deletedAt) total += v.stockQuantity
          return v
        })
        return {
          ...prev,
          variants: nextVariants,
          totalStock: total,
        }
      })
    },
    [],
  )

  // Cập nhật ảnh cục bộ tức thì
  const updateLocalImage = useCallback((image: AdminImageItem) => {
    setProduct((prev) => {
      if (!prev) return prev
      const existingIndex = prev.images.findIndex((img) => img.id === image.id)
      let nextImages: AdminImageItem[]

      if (image.isMain) {
        const resetImages = prev.images.map((img) =>
          img.colorId === image.colorId ? { ...img, isMain: false } : img,
        )
        if (existingIndex >= 0) {
          nextImages = [...resetImages]
          nextImages[existingIndex] = image
        } else {
          nextImages = [...resetImages, image]
        }
      } else {
        if (existingIndex >= 0) {
          nextImages = [...prev.images]
          nextImages[existingIndex] = image
        } else {
          nextImages = [...prev.images, image]
        }
      }

      return {
        ...prev,
        images: nextImages,
      }
    })
  }, [])

  // Xóa ảnh cục bộ tức thì
  const removeLocalImage = useCallback((imageId: number) => {
    setProduct((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        images: prev.images.filter((img) => img.id !== imageId),
      }
    })
  }, [])

  // Cập nhật trạng thái sản phẩm cục bộ
  const updateLocalStatus = useCallback(
    (status: ProductStatus, publishedAt?: string | null) => {
      setProduct((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          status,
          publishedAt:
            publishedAt !== undefined ? publishedAt : prev.publishedAt,
        }
      })
    },
    [],
  )

  return {
    product,
    isLoading,
    error,
    refetch,
    setProduct,
    updateLocalVariant,
    removeLocalVariant,
    updateLocalStock,
    updateLocalImage,
    removeLocalImage,
    updateLocalStatus,
  }
}
