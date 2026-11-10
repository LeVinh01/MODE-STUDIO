import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation, Link, useBlocker } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
} from 'lucide-react'
import axios from 'axios'
import { adminProductService } from '@/services/api/adminProductService'
import { useAdminLookups } from '@/hooks/useAdminLookups'
import type {
  AdminProductDetail,
  ProductFormValues,
  AdminProductStorePayload,
  AdminProductUpdatePayload,
  ProductGender,
  ProductStatus,
} from '@/types/adminProduct'
import { getProductStatusBadge } from '@/config/productStatus'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import { slugify } from '@/utils/slugify'
import { Button, Input, Select, Textarea, Checkbox, Badge } from '@/components/common'
import { Modal, EmptyState, Skeleton } from '@/components/feedback'
import { useAppSelector } from '@/store/hooks'
import { selectCurrentUser } from '@/store/slices/authSlice'
import styles from './ProductFormPage.module.scss'

const INITIAL_FORM_VALUES: ProductFormValues = {
  name: '',
  slug: '',
  description: '',
  material: '',
  gender: 'unisex',
  categoryId: '',
  brandId: '',
  basePrice: '',
  compareAtPrice: '',
  isFeatured: false,
  status: 'draft',
}

const GENDER_OPTIONS = [
  { value: 'unisex', label: 'Unisex (Mọi giới tính)' },
  { value: 'men', label: 'Nam (Men)' },
  { value: 'women', label: 'Nữ (Women)' },
  { value: 'kids', label: 'Trẻ em (Kids)' },
]

export const ProductFormPage = () => {
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)
  const navigate = useNavigate()
  const location = useLocation()

  const currentUser = useAppSelector(selectCurrentUser)
  const isAdmin = currentUser?.role === 'admin'
  const isOperator = currentUser?.role === 'operator'

  // Lookups (danh mục, thương hiệu, v.v.)
  const {
    lookups,
    isLoading: isLoadingLookups,
    error: lookupsError,
    retry: retryLookups,
  } = useAdminLookups()

  // State dữ liệu trang
  const [form, setForm] = useState<ProductFormValues>(INITIAL_FORM_VALUES)
  const [baselineProduct, setBaselineProduct] = useState<AdminProductDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(isEditMode)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Submitting / UI states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(
    () => (location.state as { successMessage?: string } | null)?.successMessage || null,
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  // Tracking user manual slug touch (Create mode)
  const [isSlugTouched, setIsSlugTouched] = useState(false)

  // Modal Xóa
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Ref AbortController cho fetch detail
  const abortControllerRef = useRef<AbortController | null>(null)

  // 1. Operator guard: Operator không được vào trang tạo mới
  useEffect(() => {
    if (isOperator && !isEditMode) {
      navigate('/admin/products', {
        replace: true,
        state: { errorMessage: 'Bạn chỉ có quyền xem thông tin sản phẩm (Chỉ đọc).' },
      })
    }
  }, [isOperator, isEditMode, navigate])

  // 2. Dọn sạch location.state để F5 không hiện lại thông báo thành công
  useEffect(() => {
    if ((location.state as { successMessage?: string } | null)?.successMessage) {
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  // 3. Helper chuyển đổi AdminProductDetail sang ProductFormValues
  const mapDetailToForm = useCallback((detail: AdminProductDetail): ProductFormValues => {
    return {
      name: detail.name || '',
      slug: detail.slug || '',
      description: detail.description || '',
      material: detail.material || '',
      gender: detail.gender || 'unisex',
      categoryId: detail.category?.id || '',
      brandId: detail.brand?.id || '',
      basePrice: detail.basePrice != null ? String(detail.basePrice) : '',
      compareAtPrice: detail.compareAtPrice != null ? String(detail.compareAtPrice) : '',
      isFeatured: Boolean(detail.isFeatured),
      status: detail.status || 'draft',
    }
  }, [])

  // 4. Fetch chi tiết sản phẩm khi ở Edit Mode
  useEffect(() => {
    if (!isEditMode || !id) return

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    let isMounted = true

    adminProductService
      .getAdminProductDetail(id, controller.signal)
      .then((res) => {
        if (!isMounted) return
        setBaselineProduct(res)
        setForm(mapDetailToForm(res))
        setIsLoadingDetail(false)
        setFetchError(null)
      })
      .catch((err) => {
        if (axios.isCancel(err) || !isMounted) return
        const msg =
          err?.response?.data?.message || 'Không thể tải thông tin sản phẩm. Vui lòng thử lại.'
        setFetchError(msg)
        setIsLoadingDetail(false)
      })

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [isEditMode, id, mapDetailToForm])

  // 5. Kiểm tra Form Dirty (Có thay đổi chưa lưu)
  const isDirty = useMemo(() => {
    if (!isEditMode) {
      return Boolean(
        form.name.trim() ||
          form.slug.trim() ||
          form.description.trim() ||
          form.material.trim() ||
          form.categoryId ||
          form.brandId ||
          form.basePrice ||
          form.compareAtPrice ||
          form.isFeatured ||
          form.gender !== 'unisex',
      )
    }

    if (!baselineProduct) return false

    return (
      form.name.trim() !== (baselineProduct.name || '') ||
      form.slug.trim() !== (baselineProduct.slug || '') ||
      form.description.trim() !== (baselineProduct.description || '') ||
      form.material.trim() !== (baselineProduct.material || '') ||
      form.gender !== baselineProduct.gender ||
      Number(form.categoryId) !== (baselineProduct.category?.id || 0) ||
      Number(form.brandId) !== (baselineProduct.brand?.id || 0) ||
      form.basePrice !== String(baselineProduct.basePrice ?? '') ||
      form.compareAtPrice !==
        (baselineProduct.compareAtPrice != null ? String(baselineProduct.compareAtPrice) : '') ||
      form.isFeatured !== Boolean(baselineProduct.isFeatured) ||
      form.status !== baselineProduct.status
    )
  }, [isEditMode, form, baselineProduct])

  // 6. Cảnh báo rời trang khi form dirty (React Router v6 data router)
  const blocker = useBlocker(
    useCallback(
      ({
        currentLocation,
        nextLocation,
      }: {
        currentLocation: { pathname: string; search: string }
        nextLocation: { pathname: string; search: string }
      }) => {
        if (isOperator || isSubmitting) return false
        return (
          isDirty &&
          (currentLocation.pathname !== nextLocation.pathname ||
            currentLocation.search !== nextLocation.search)
        )
      },
      [isDirty, isSubmitting, isOperator],
    ),
  )

  // 7. Cảnh báo F5 / đóng tab khi form dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !isSubmitting && !isOperator) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty, isSubmitting, isOperator])

  // 8. Handlers cập nhật form
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setForm((prev) => {
      // Khi TẠO MỚI và người dùng CHƯA sửa tay slug: tự sinh slug từ tên
      if (!isEditMode && !isSlugTouched) {
        return {
          ...prev,
          name: newName,
          slug: slugify(newName),
        }
      }
      return { ...prev, name: newName }
    })
    if (fieldErrors.name) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.name
        return next
      })
    }
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditMode) {
      setIsSlugTouched(true)
    }
    setForm((prev) => ({ ...prev, slug: e.target.value }))
    if (fieldErrors.slug) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.slug
        return next
      })
    }
  }

  const handlePriceChange = (field: 'basePrice' | 'compareAtPrice', value: string) => {
    // Chỉ cho phép nhập số
    const cleaned = value.replace(/[^\d]/g, '')
    setForm((prev) => ({ ...prev, [field]: cleaned }))
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  // 9. Client-side Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!form.name.trim()) {
      errors.name = 'Vui lòng nhập tên sản phẩm.'
    }

    if (!form.categoryId) {
      errors.categoryId = 'Vui lòng chọn danh mục.'
    }

    if (!form.brandId) {
      errors.brandId = 'Vui lòng chọn thương hiệu.'
    }

    if (!form.gender) {
      errors.gender = 'Vui lòng chọn giới tính.'
    }

    if (!form.basePrice.trim()) {
      errors.basePrice = 'Vui lòng nhập giá bán.'
    } else {
      const basePriceNum = Number(form.basePrice)
      if (isNaN(basePriceNum) || basePriceNum < 0 || !Number.isInteger(basePriceNum)) {
        errors.basePrice = 'Giá bán phải là số nguyên dương.'
      }
    }

    if (form.compareAtPrice.trim()) {
      const compPriceNum = Number(form.compareAtPrice)
      const basePriceNum = Number(form.basePrice)
      if (isNaN(compPriceNum) || compPriceNum < 0 || !Number.isInteger(compPriceNum)) {
        errors.compareAtPrice = 'Giá so sánh phải là số nguyên dương.'
      } else if (!isNaN(basePriceNum) && compPriceNum <= basePriceNum) {
        errors.compareAtPrice = 'Giá so sánh (giá gốc) phải lớn hơn giá bán.'
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // 10. Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isOperator) return

    setErrorMessage(null)
    setSuccessMessage(null)
    setInfoMessage(null)

    if (!validateForm()) {
      setErrorMessage('Vui lòng kiểm tra lại các trường thông tin có lỗi.')
      return
    }

    setIsSubmitting(true)

    try {
      if (!isEditMode) {
        // === TẠO MỚI ===
        const payload: AdminProductStorePayload = {
          name: form.name.trim(),
          gender: form.gender as ProductGender,
          category_id: Number(form.categoryId),
          brand_id: Number(form.brandId),
          base_price: Number(form.basePrice),
          is_featured: form.isFeatured,
          status: 'draft',
        }

        if (form.slug.trim()) payload.slug = form.slug.trim()
        if (form.description.trim()) payload.description = form.description.trim()
        if (form.material.trim()) payload.material = form.material.trim()
        if (form.compareAtPrice.trim()) {
          payload.compare_at_price = Number(form.compareAtPrice)
        }

        const newProduct = await adminProductService.createAdminProduct(payload)

        // Chuyển sang trang sửa kèm thông báo thành công
        navigate(`/admin/products/${newProduct.id}/edit`, {
          replace: true,
          state: { successMessage: `Đã tạo sản phẩm "${newProduct.name}" thành công.` },
        })
      } else {
        // === CẬP NHẬT (PATCH DIFF) ===
        if (!baselineProduct || !id) return

        const diffPayload: AdminProductUpdatePayload = {}

        if (form.name.trim() !== (baselineProduct.name || '')) {
          diffPayload.name = form.name.trim()
        }
        if (form.slug.trim() !== (baselineProduct.slug || '')) {
          diffPayload.slug = form.slug.trim() || null
        }
        if (form.description.trim() !== (baselineProduct.description || '')) {
          diffPayload.description = form.description.trim() || null
        }
        if (form.material.trim() !== (baselineProduct.material || '')) {
          diffPayload.material = form.material.trim() || null
        }
        if (form.gender !== baselineProduct.gender) {
          diffPayload.gender = form.gender as ProductGender
        }
        if (Number(form.categoryId) !== (baselineProduct.category?.id || 0)) {
          diffPayload.category_id = Number(form.categoryId)
        }
        if (Number(form.brandId) !== (baselineProduct.brand?.id || 0)) {
          diffPayload.brand_id = Number(form.brandId)
        }
        if (Number(form.basePrice) !== baselineProduct.basePrice) {
          diffPayload.base_price = Number(form.basePrice)
        }

        const formCompare = form.compareAtPrice.trim() ? Number(form.compareAtPrice) : null
        const baseCompare = baselineProduct.compareAtPrice ?? null
        if (formCompare !== baseCompare) {
          diffPayload.compare_at_price = formCompare
        }

        if (form.isFeatured !== Boolean(baselineProduct.isFeatured)) {
          diffPayload.is_featured = form.isFeatured
        }
        if (form.status !== baselineProduct.status) {
          diffPayload.status = form.status
        }

        // Nếu không có thay đổi nào
        if (Object.keys(diffPayload).length === 0) {
          setInfoMessage('Không có thay đổi nào cần lưu.')
          setIsSubmitting(false)
          return
        }

        const updated = await adminProductService.updateAdminProduct(id, diffPayload)

        // Cập nhật baseline & reset form theo dữ liệu mới từ backend
        setBaselineProduct(updated)
        setForm(mapDetailToForm(updated))
        setSuccessMessage('Lưu thông tin sản phẩm thành công.')
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        const data = err.response.data
        const backendErrors: Record<string, string> = {}

        if (data.errors) {
          // Map backend field names sang form fields
          Object.keys(data.errors).forEach((key) => {
            const firstMsg = data.errors[key][0]
            if (key === 'category_id') backendErrors.categoryId = firstMsg
            else if (key === 'brand_id') backendErrors.brandId = firstMsg
            else if (key === 'base_price') backendErrors.basePrice = firstMsg
            else if (key === 'compare_at_price') backendErrors.compareAtPrice = firstMsg
            else if (key === 'is_featured') backendErrors.isFeatured = firstMsg
            else backendErrors[key] = firstMsg
          })
        }

        setFieldErrors(backendErrors)
        setErrorMessage(
          data.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường có thông báo lỗi.',
        )
      } else {
        setErrorMessage(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Đã có lỗi xảy ra khi lưu sản phẩm. Vui lòng thử lại.',
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // 11. Xóa sản phẩm
  const handleDeleteConfirm = async () => {
    if (!isAdmin || !id || !baselineProduct) return

    setIsDeleting(true)
    try {
      await adminProductService.deleteAdminProduct(id)
      setIsDeleteModalOpen(false)
      navigate('/admin/products', {
        replace: true,
        state: { successMessage: `Đã xóa sản phẩm "${baselineProduct.name}".` },
      })
    } catch (err: unknown) {
      setIsDeleteModalOpen(false)
      setErrorMessage(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Không thể xóa sản phẩm. Vui lòng thử lại.',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  // Đường dẫn quay lại danh sách
  const backUrl = (location.state as { from?: string } | null)?.from || '/admin/products'

  // Kiểm tra cảnh báo slug thay đổi trong Edit mode
  const isSlugChangedInEdit =
    isEditMode && baselineProduct && form.slug.trim() !== (baselineProduct.slug || '')

  // Loading skeleton khi tải chi tiết
  if (isEditMode && isLoadingDetail) {
    return (
      <div className={styles.productFormPage}>
        <div className={styles.skeletonContainer}>
          <Skeleton width="200px" height="20px" />
          <Skeleton width="400px" height="36px" />
          <div className={styles.formLayout}>
            <div className={styles.mainColumn}>
              <Skeleton width="100%" height="280px" />
              <Skeleton width="100%" height="180px" />
            </div>
            <div className={styles.sideColumn}>
              <Skeleton width="100%" height="220px" />
              <Skeleton width="100%" height="180px" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Lỗi tải chi tiết sản phẩm
  if (isEditMode && fetchError) {
    return (
      <div className={styles.productFormPage}>
        <EmptyState
          title="Không tìm thấy sản phẩm"
          description={fetchError}
          action={
            <Button variant="primary" onClick={() => navigate('/admin/products')}>
              Quay lại danh sách sản phẩm
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className={styles.productFormPage}>
      {/* Breadcrumb Navigation */}
      <nav className={styles.breadcrumbNav} aria-label="Breadcrumb">
        <Link to="/admin">Quản trị</Link>
        <span className={styles.separator}>/</span>
        <Link to={backUrl}>Sản phẩm</Link>
        <span className={styles.separator}>/</span>
        <span className={styles.current}>
          {isEditMode ? baselineProduct?.name || 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
        </span>
      </nav>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link to={backUrl} className={styles.backLink}>
            <ArrowLeft size={16} />
            <span>Quay lại danh sách</span>
          </Link>
          <div className={styles.titleRow}>
            <h1>{isEditMode ? baselineProduct?.name || 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h1>
            {isEditMode && baselineProduct && (
              <Badge variant={getProductStatusBadge(baselineProduct.status).variant} size="md">
                {getProductStatusBadge(baselineProduct.status).label}
              </Badge>
            )}
          </div>
          {isEditMode && baselineProduct && (
            <div className={styles.metaInfo}>
              <span>Mã ID: #{baselineProduct.id}</span>
              <span> &bull; Tạo lúc: {formatDateTime(baselineProduct.createdAt)}</span>
              <span> &bull; Cập nhật: {formatDateTime(baselineProduct.updatedAt)}</span>
            </div>
          )}
        </div>

        <div className={styles.headerActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(backUrl)}
            disabled={isSubmitting}
          >
            Hủy
          </Button>

          {isAdmin && (
            <Button
              type="submit"
              form="product-form"
              variant="primary"
              disabled={isSubmitting}
              leftIcon={<Save size={16} />}
            >
              {isSubmitting
                ? 'Đang lưu...'
                : isEditMode
                  ? 'Lưu thay đổi'
                  : 'Tạo sản phẩm'}
            </Button>
          )}
        </div>
      </header>

      {/* Operator Banner */}
      {isOperator && (
        <div className={`${styles.alertBanner} ${styles.info}`} role="alert">
          <div className={styles.alertContent}>
            <AlertCircle size={18} />
            <span>
              <strong>Chế độ chỉ đọc:</strong> Bạn đang đăng nhập với vai trò Nhân viên vận hành
              (Operator). Bạn chỉ có quyền xem thông tin sản phẩm và không thể sửa hoặc xóa.
            </span>
          </div>
        </div>
      )}

      {/* Alert Banners */}
      {successMessage && (
        <div className={`${styles.alertBanner} ${styles.success}`} role="alert">
          <div className={styles.alertContent}>
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            className={styles.alertCloseBtn}
            onClick={() => setSuccessMessage(null)}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className={`${styles.alertBanner} ${styles.error}`} role="alert">
          <div className={styles.alertContent}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            className={styles.alertCloseBtn}
            onClick={() => setErrorMessage(null)}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {infoMessage && (
        <div className={`${styles.alertBanner} ${styles.info}`} role="alert">
          <div className={styles.alertContent}>
            <AlertCircle size={18} />
            <span>{infoMessage}</span>
          </div>
          <button
            type="button"
            className={styles.alertCloseBtn}
            onClick={() => setInfoMessage(null)}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Lookups Error Banner */}
      {lookupsError && (
        <div className={`${styles.alertBanner} ${styles.warning}`} role="alert">
          <div className={styles.alertContent}>
            <AlertTriangle size={18} />
            <span>
              Không tải được danh mục hoặc thương hiệu ({lookupsError}). Bạn có thể nhấn thử lại.
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={retryLookups}
            leftIcon={<RotateCcw size={14} />}
          >
            Thử lại
          </Button>
        </div>
      )}

      {/* Main Form */}
      <form id="product-form" onSubmit={handleSubmit} noValidate>
        <div className={styles.formLayout}>
          {/* Main Column */}
          <div className={styles.mainColumn}>
            {/* Card 1: Thông tin cơ bản */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Thông tin cơ bản</h2>
                <span className={styles.cardSubtitle}>Tên, đường dẫn và mô tả</span>
              </div>
              <div className={styles.cardBody}>
                <Input
                  label="Tên sản phẩm *"
                  placeholder="Ví dụ: Áo Sơ Mi Oxford Dài Tay"
                  value={form.name}
                  onChange={handleNameChange}
                  errorMessage={fieldErrors.name}
                  disabled={isOperator || isSubmitting}
                  fullWidth
                />

                <div>
                  <Input
                    label="Đường dẫn (Slug)"
                    placeholder="Tuỳ chọn - tự sinh từ tên nếu để trống"
                    value={form.slug}
                    onChange={handleSlugChange}
                    errorMessage={fieldErrors.slug}
                    helperText={
                      !isEditMode
                        ? 'Tự động tạo theo tên sản phẩm. Bạn có thể sửa tay nếu muốn.'
                        : undefined
                    }
                    disabled={isOperator || isSubmitting}
                    fullWidth
                  />
                  {isSlugChangedInEdit && (
                    <div className={styles.slugWarning}>
                      <AlertTriangle size={16} />
                      <span>
                        <strong>Cảnh báo:</strong> Đổi slug sẽ làm thay đổi đường dẫn URL sản phẩm.
                        Các liên kết cũ ngoài website có thể bị ảnh hưởng.
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.twoColGrid}>
                  <Select
                    label="Giới tính *"
                    value={form.gender}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        gender: e.target.value as ProductGender,
                      }))
                      if (fieldErrors.gender) {
                        setFieldErrors((prev) => {
                          const next = { ...prev }
                          delete next.gender
                          return next
                        })
                      }
                    }}
                    options={GENDER_OPTIONS}
                    errorMessage={fieldErrors.gender}
                    disabled={isOperator || isSubmitting}
                    fullWidth
                  />

                  <Input
                    label="Chất liệu"
                    placeholder="Ví dụ: 100% Cotton Premium"
                    value={form.material}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, material: e.target.value }))
                    }
                    errorMessage={fieldErrors.material}
                    disabled={isOperator || isSubmitting}
                    fullWidth
                  />
                </div>

                <Textarea
                  label="Mô tả sản phẩm"
                  placeholder="Nhập thông tin chi tiết về sản phẩm..."
                  rows={5}
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  errorMessage={fieldErrors.description}
                  disabled={isOperator || isSubmitting}
                  fullWidth
                />
              </div>
            </div>

            {/* Card 2: Giá sản phẩm */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Giá bán</h2>
                <span className={styles.cardSubtitle}>Đơn vị tiền tệ: VND (Chỉ số nguyên)</span>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.twoColGrid}>
                  <div>
                    <Input
                      label="Giá bán (base_price) *"
                      placeholder="0"
                      value={form.basePrice}
                      onChange={(e) => handlePriceChange('basePrice', e.target.value)}
                      errorMessage={fieldErrors.basePrice}
                      helperText="Giá bán chính thức của sản phẩm"
                      disabled={isOperator || isSubmitting}
                      fullWidth
                    />
                    {form.basePrice && !isNaN(Number(form.basePrice)) && (
                      <div className={styles.pricePreview}>
                        Hiển thị:{' '}
                        <span className={styles.highlight}>
                          {formatCurrency(Number(form.basePrice))}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <Input
                      label="Giá so sánh (compare_at_price)"
                      placeholder="0"
                      value={form.compareAtPrice}
                      onChange={(e) =>
                        handlePriceChange('compareAtPrice', e.target.value)
                      }
                      errorMessage={fieldErrors.compareAtPrice}
                      helperText="Giá gốc trước khi giảm (phải lớn hơn giá bán)"
                      disabled={isOperator || isSubmitting}
                      fullWidth
                    />
                    {form.compareAtPrice && !isNaN(Number(form.compareAtPrice)) && (
                      <div className={styles.pricePreview}>
                        Hiển thị:{' '}
                        <span className={styles.highlight}>
                          {formatCurrency(Number(form.compareAtPrice))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Biến thể & Hình ảnh (Lượt B Placeholder) */}
            <div className={styles.phaseBCard}>
              <div className={styles.phaseBHeader}>
                <h3>Biến thể &amp; Thư viện ảnh (Lượt B)</h3>
                <Badge variant="outline" size="sm">
                  Giai đoạn kế tiếp
                </Badge>
              </div>
              <div className={styles.phaseBContent}>
                <p>
                  Tính năng quản lý chi tiết màu sắc, kích thước, tồn kho từng biến thể, thư viện
                  hình ảnh và kích hoạt trạng thái bán hàng sẽ được triển khai đầy đủ trong{' '}
                  <strong>Lượt B</strong>.
                </p>
              </div>

              {isEditMode && baselineProduct && (
                <div className={styles.phaseBStats}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Số biến thể:</span>
                    <span className={styles.statValue}>
                      {baselineProduct.variantsCount || 0}
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Tổng tồn kho:</span>
                    <span className={styles.statValue}>
                      {baselineProduct.totalStock || 0}
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Số hình ảnh:</span>
                    <span className={styles.statValue}>
                      {baselineProduct.images?.length || 0}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Column */}
          <div className={styles.sideColumn}>
            {/* Phân loại sản phẩm */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Phân loại</h2>
              </div>
              <div className={styles.cardBody}>
                <Select
                  label="Danh mục sản phẩm *"
                  placeholder="-- Chọn danh mục --"
                  value={form.categoryId}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : ''
                    setForm((prev) => ({ ...prev, categoryId: val }))
                    if (fieldErrors.categoryId) {
                      setFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.categoryId
                        return next
                      })
                    }
                  }}
                  errorMessage={fieldErrors.categoryId}
                  disabled={isOperator || isSubmitting || isLoadingLookups}
                  fullWidth
                >
                  <option value="">-- Chọn danh mục --</option>
                  {lookups.categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Thương hiệu *"
                  placeholder="-- Chọn thương hiệu --"
                  value={form.brandId}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : ''
                    setForm((prev) => ({ ...prev, brandId: val }))
                    if (fieldErrors.brandId) {
                      setFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.brandId
                        return next
                      })
                    }
                  }}
                  errorMessage={fieldErrors.brandId}
                  disabled={isOperator || isSubmitting || isLoadingLookups}
                  fullWidth
                >
                  <option value="">-- Chọn thương hiệu --</option>
                  {lookups.brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Trạng thái & Hiển thị */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Trạng thái &amp; Hiển thị</h2>
              </div>
              <div className={styles.cardBody}>
                {!isEditMode ? (
                  <div>
                    <Input
                      label="Trạng thái"
                      value="Bản nháp (draft)"
                      disabled
                      helperText="Sản phẩm mới luôn được tạo ở trạng thái Bản nháp."
                      fullWidth
                    />
                  </div>
                ) : (
                  <div>
                    <Select
                      label="Trạng thái sản phẩm"
                      value={form.status}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          status: e.target.value as ProductStatus,
                        }))
                      }
                      disabled={isOperator || isSubmitting}
                      fullWidth
                      helperText={
                        baselineProduct?.status !== 'active'
                          ? 'Kích hoạt sản phẩm sẽ được thực hiện ở Lượt B khi đã đủ biến thể và ảnh.'
                          : 'Bạn có thể chuyển về Bản nháp hoặc Lưu trữ.'
                      }
                    >
                      {baselineProduct?.status === 'active' ? (
                        <>
                          <option value="active">Đang hoạt động (active)</option>
                          <option value="draft">Bản nháp (draft)</option>
                          <option value="archived">Lưu trữ (archived)</option>
                        </>
                      ) : (
                        <>
                          <option value="draft">Bản nháp (draft)</option>
                          <option value="archived">Lưu trữ (archived)</option>
                          <option value="active" disabled>
                            Đang hoạt động (Kích hoạt ở Lượt B)
                          </option>
                        </>
                      )}
                    </Select>
                  </div>
                )}

                <Checkbox
                  label="Sản phẩm nổi bật (Featured)"
                  helperText="Hiển thị ở khu vực nổi bật trên trang chủ"
                  checked={form.isFeatured}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, isFeatured: e.target.checked }))
                  }
                  disabled={isOperator || isSubmitting}
                />
              </div>
            </div>

            {/* Vùng nguy hiểm: Xóa sản phẩm */}
            {isEditMode && isAdmin && (
              <div className={`${styles.card} ${styles.dangerZone}`}>
                <div className={styles.cardHeader}>
                  <h2 className={`${styles.cardTitle} ${styles.dangerHeader}`}>
                    Vùng nguy hiểm
                  </h2>
                </div>
                <div className={styles.cardBody}>
                  <p className={styles.dangerText}>
                    Xóa hoàn toàn sản phẩm khỏi hệ thống. Hành động này không thể hoàn tác nếu
                    đã xóa vĩnh viễn.
                  </p>
                  <Button
                    type="button"
                    variant="primary"
                    className={styles.dangerBtn}
                    size="sm"
                    onClick={() => setIsDeleteModalOpen(true)}
                    disabled={isSubmitting || isDeleting}
                    leftIcon={<Trash2 size={16} />}
                  >
                    Xóa sản phẩm này
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile sticky action bar */}
        <div className={styles.bottomBar}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(backUrl)}
            disabled={isSubmitting}
          >
            Hủy
          </Button>

          {isAdmin && (
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              leftIcon={<Save size={16} />}
            >
              {isSubmitting ? 'Đang lưu...' : isEditMode ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
            </Button>
          )}
        </div>
      </form>

      {/* Modal Cảnh báo Rời Trang (useBlocker) */}
      <Modal
        isOpen={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Xác nhận rời khỏi trang"
        footer={
          <>
            <Button variant="secondary" onClick={() => blocker.reset?.()}>
              Ở lại trang
            </Button>
            <Button
              variant="primary"
              className={styles.dangerBtn}
              onClick={() => blocker.proceed?.()}
            >
              Rời khỏi trang
            </Button>
          </>
        }
      >
        <p>
          Bạn có thay đổi chưa lưu trên biểu mẫu sản phẩm. Nếu rời khỏi trang này, mọi dữ liệu
          vừa nhập sẽ bị mất. Bạn có chắc chắn muốn tiếp tục?
        </p>
      </Modal>

      {/* Modal Xác nhận Xóa sản phẩm */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Xác nhận xóa sản phẩm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              className={styles.dangerBtn}
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              leftIcon={<Trash2 size={16} />}
            >
              {isDeleting ? 'Đang xóa...' : 'Xóa sản phẩm'}
            </Button>
          </>
        }
      >
        <p>Sản phẩm sẽ bị gỡ khỏi cửa hàng và danh sách quản trị.</p>
      </Modal>
    </div>
  )
}
