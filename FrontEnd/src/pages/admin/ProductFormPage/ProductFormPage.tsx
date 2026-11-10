import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams, useBlocker, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  Layers,
  Image as ImageIcon,
  FileText,
} from 'lucide-react'
import { adminProductService } from '@/services/api/adminProductService'
import { useAdminLookups } from '@/hooks/useAdminLookups'
import { useAdminProductDetail } from '@/hooks/useAdminProductDetail'
import type {
  AdminProductDetail,
  ProductFormValues,
  AdminProductStorePayload,
  AdminProductUpdatePayload,
  ProductGender,
  ProductStatus,
  ProductFormTab,
} from '@/types/adminProduct'
import { formatCurrency, slugify, getApiErrorMessage, getApiFieldErrors } from '@/utils'
import { Button, Input, Select, Textarea, Checkbox } from '@/components/common'
import { Modal, Skeleton } from '@/components/feedback'
import { useAppSelector } from '@/store/hooks'
import { selectCurrentUser } from '@/store/slices/authSlice'
import { PublishStatusCard } from './components/PublishStatusCard/PublishStatusCard'
import { VariantManagementTab } from './components/VariantManagementTab/VariantManagementTab'
import { ImageManagementTab } from './components/ImageManagementTab/ImageManagementTab'
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
  const [searchParams, setSearchParams] = useSearchParams()

  const currentUser = useAppSelector(selectCurrentUser)
  const isAdmin = currentUser?.role === 'admin'
  const isOperator = currentUser?.role === 'operator'

  // Tab navigation (?tab=basic|variants|images, fallback: basic)
  const rawTab = searchParams.get('tab')
  const activeTab: ProductFormTab =
    rawTab === 'variants' || rawTab === 'images' || rawTab === 'basic'
      ? rawTab
      : 'basic'

  const handleTabChange = (newTab: ProductFormTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (newTab === 'basic') {
        next.delete('tab')
      } else {
        next.set('tab', newTab)
      }
      return next
    })
  }

  // Lookups (danh mục, thương hiệu, màu, size...)
  const {
    lookups,
    isLoading: isLoadingLookups,
    error: lookupsError,
    retry: retryLookups,
  } = useAdminLookups()

  // Form state
  const [form, setForm] = useState<ProductFormValues>(INITIAL_FORM_VALUES)
  const isFormInitializedRef = useRef(false)

  // Submitting / UI states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(
    () => (location.state as { successMessage?: string } | null)?.successMessage || null,
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  // Tracking user manual slug touch (Create mode)
  const [isSlugTouched, setIsSlugTouched] = useState(false)

  // Modal Xóa sản phẩm
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

  // Callback khởi tạo form khi dữ liệu chi tiết tải về lần đầu
  const handleDetailLoaded = useCallback((detail: AdminProductDetail) => {
    if (!isFormInitializedRef.current) {
      setForm(mapDetailToForm(detail))
      isFormInitializedRef.current = true
    }
  }, [mapDetailToForm])

  // Hook quản lý chi tiết sản phẩm với latest-wins (chỉ chạy khi isEditMode)
  const {
    product,
    isLoading: isLoadingDetail,
    error: fetchError,
    refetch,
    updateLocalVariant,
    removeLocalVariant,
    updateLocalStock,
    updateLocalImage,
    removeLocalImage,
    updateLocalStatus,
  } = useAdminProductDetail(isEditMode ? id : undefined, {
    onLoaded: handleDetailLoaded,
  })

  // baselineProduct là chính product đang có
  const baselineProduct = product

  // 4. Kiểm tra Form Dirty (Có thay đổi chưa lưu)
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

  // 5. Cảnh báo rời trang khi form dirty (React Router v6 data router)
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
        if (currentLocation.pathname === nextLocation.pathname) return false
        return isDirty
      },
      [isDirty, isSubmitting, isOperator],
    ),
  )

  // 6. Cảnh báo F5 / đóng tab khi form dirty
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

  // 7. Hàm refetch an toàn: Cập nhật biến thể/ảnh/status nhưng KHÔNG ghi đè form nếu dirty
  const handleSafeRefetch = useCallback(async (): Promise<AdminProductDetail | null> => {
    const fresh = await refetch()
    if (fresh && !isDirty) {
      setForm(mapDetailToForm(fresh))
    }
    return fresh
  }, [refetch, isDirty, mapDetailToForm])

  // Handlers cập nhật form cơ bản
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setForm((prev) => {
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
    setIsSlugTouched(true)
    setForm((prev) => ({ ...prev, slug: e.target.value }))
    if (fieldErrors.slug) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.slug
        return next
      })
    }
  }

  const handleBasePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '')
    setForm((prev) => ({ ...prev, basePrice: val }))
    if (fieldErrors.basePrice) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.basePrice
        return next
      })
    }
  }

  const handleCompareAtPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '')
    setForm((prev) => ({ ...prev, compareAtPrice: val }))
    if (fieldErrors.compareAtPrice) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.compareAtPrice
        return next
      })
    }
  }

  // Submit Form Thông tin cơ bản
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isOperator) return

    setFieldErrors({})
    setErrorMessage(null)
    setSuccessMessage(null)
    setInfoMessage(null)

    // Client validation
    const errors: Record<string, string> = {}
    if (!form.name.trim()) errors.name = 'Vui lòng nhập tên sản phẩm.'
    if (!form.gender) errors.gender = 'Vui lòng chọn giới tính.'
    if (!form.categoryId) errors.categoryId = 'Vui lòng chọn danh mục.'
    if (!form.brandId) errors.brandId = 'Vui lòng chọn thương hiệu.'

    const parsedPrice = parseInt(form.basePrice, 10)
    if (!form.basePrice || isNaN(parsedPrice)) {
      errors.basePrice = 'Vui lòng nhập giá bán cơ bản.'
    } else if (parsedPrice < 0) {
      errors.basePrice = 'Giá bán không được âm.'
    }

    if (form.compareAtPrice) {
      const parsedCompare = parseInt(form.compareAtPrice, 10)
      if (isNaN(parsedCompare) || parsedCompare < 0) {
        errors.compareAtPrice = 'Giá gốc không được âm.'
      } else if (parsedCompare < parsedPrice) {
        errors.compareAtPrice = 'Giá gốc nên lớn hơn hoặc bằng giá bán.'
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setErrorMessage('Vui lòng kiểm tra và điền đầy đủ các trường bắt buộc.')
      return
    }

    setIsSubmitting(true)

    try {
      if (!isEditMode) {
        // === TẠO MỚI (POST) ===
        const payload: AdminProductStorePayload = {
          name: form.name.trim(),
          slug: form.slug.trim() || null,
          description: form.description.trim() || null,
          material: form.material.trim() || null,
          gender: form.gender as ProductGender,
          category_id: Number(form.categoryId),
          brand_id: Number(form.brandId),
          base_price: parsedPrice,
          compare_at_price: form.compareAtPrice ? parseInt(form.compareAtPrice, 10) : null,
          status: 'draft',
          is_featured: form.isFeatured,
        }

        const newProduct = await adminProductService.createAdminProduct(payload)

        // Sau khi tạo xong chuyển sang /admin/products/:id/edit?tab=variants
        navigate(`/admin/products/${newProduct.id}/edit?tab=variants`, {
          replace: true,
          state: {
            successMessage: `Đã tạo sản phẩm "${newProduct.name}" thành công. Hãy thêm biến thể và hình ảnh.`,
          },
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
          diffPayload.base_price = parsedPrice
        }

        const formCompare = form.compareAtPrice ? parseInt(form.compareAtPrice, 10) : null
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

        if (Object.keys(diffPayload).length === 0) {
          setInfoMessage('Không có thay đổi nào cần lưu.')
          setIsSubmitting(false)
          return
        }

        const updated = await adminProductService.updateAdminProduct(id, diffPayload)

        setForm(mapDetailToForm(updated))
        setSuccessMessage('Lưu thông tin sản phẩm thành công.')
        handleSafeRefetch()
      }
    } catch (err: unknown) {
      const beErrors = getApiFieldErrors(err)
      if (Object.keys(beErrors).length > 0) {
        const backendErrors: Record<string, string> = {}
        Object.entries(beErrors).forEach(([key, val]) => {
          if (key === 'category_id') backendErrors.categoryId = val
          else if (key === 'brand_id') backendErrors.brandId = val
          else if (key === 'base_price') backendErrors.basePrice = val
          else if (key === 'compare_at_price') backendErrors.compareAtPrice = val
          else if (key === 'is_featured') backendErrors.isFeatured = val
          else backendErrors[key] = val
        })
        setFieldErrors(backendErrors)
      }

      setErrorMessage(
        getApiErrorMessage(
          err,
          'Đã có lỗi xảy ra khi lưu sản phẩm. Vui lòng kiểm tra lại các trường có thông báo lỗi.',
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Xử lý Xuất bản sản phẩm
  const handlePublish = async () => {
    if (!isAdmin || !id) return

    if (isDirty) {
      setErrorMessage(
        'Biểu mẫu thông tin có thay đổi chưa lưu. Vui lòng lưu thông tin trước khi xuất bản.',
      )
      handleTabChange('basic')
      return
    }

    setIsPublishing(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const updated = await adminProductService.updateAdminProduct(id, {
        status: 'active',
      })
      updateLocalStatus('active', updated.publishedAt)
      setForm((prev) => ({ ...prev, status: 'active' }))
      setSuccessMessage('Sản phẩm đã được xuất bản và đang hoạt động trên cửa hàng.')
      handleSafeRefetch()
    } catch (err: unknown) {
      const msg = getApiErrorMessage(
        err,
        'Không thể xuất bản sản phẩm. Vui lòng kiểm tra lại điều kiện.',
      )
      setErrorMessage(msg)
    } finally {
      setIsPublishing(false)
    }
  }

  // Xóa sản phẩm
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
        getApiErrorMessage(err, 'Không thể xóa sản phẩm. Vui lòng thử lại.'),
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (type === 'success') {
      setSuccessMessage(message)
      setErrorMessage(null)
    } else if (type === 'error') {
      setErrorMessage(message)
    } else {
      setInfoMessage(message)
    }
  }

  // Hoàn tác các thay đổi chưa lưu trong chế độ sửa (Tab 1)
  const handleResetForm = () => {
    if (!baselineProduct) return
    setForm(mapDetailToForm(baselineProduct))
    setFieldErrors({})
    setErrorMessage(null)
    setInfoMessage('Đã hoàn tác các thay đổi chưa lưu.')
  }

  const backUrl = (location.state as { from?: string } | null)?.from || '/admin/products'

  const isSlugChangedInEdit =
    isEditMode && baselineProduct && form.slug.trim() !== (baselineProduct.slug || '')

  // Skeleton loading khi tải chi tiết
  if (isEditMode && isLoadingDetail && !baselineProduct) {
    return (
      <div className={styles.productFormPage}>
        <div className={styles.skeletonContainer}>
          <Skeleton width="200px" height="20px" />
          <Skeleton width="400px" height="36px" />
          <Skeleton width="100%" height="80px" />
          <div className={styles.formLayout}>
            <div className={styles.mainColumn}>
              <Skeleton width="100%" height="280px" />
              <Skeleton width="100%" height="180px" />
            </div>
            <div className={styles.sideColumn}>
              <Skeleton width="100%" height="240px" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Màn hình lỗi nếu không tìm thấy sản phẩm
  if (isEditMode && fetchError && !baselineProduct) {
    return (
      <div className={styles.productFormPage}>
        <div className={styles.errorContainer}>
          <AlertCircle size={48} className={styles.errorIcon} />
          <h2>Lỗi tải dữ liệu sản phẩm</h2>
          <p>{fetchError}</p>
          <div className={styles.errorActions}>
            <Button variant="secondary" onClick={() => navigate(backUrl)}>
              Quay lại danh sách
            </Button>
            <Button
              variant="primary"
              onClick={() => handleSafeRefetch()}
              leftIcon={<RotateCcw size={16} />}
            >
              Thử lại
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const currentProduct = baselineProduct || product

  return (
    <div className={styles.productFormPage}>
      {/* Breadcrumb Nav */}
      <nav className={styles.breadcrumbNav} aria-label="Breadcrumb">
        <Link to="/admin/products">Sản phẩm</Link>
        <span className={styles.separator}>/</span>
        <span className={styles.current}>
          {isEditMode ? currentProduct?.name || 'Chỉnh sửa' : 'Tạo sản phẩm mới'}
        </span>
      </nav>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link to={backUrl} className={styles.backLink}>
            <ArrowLeft size={16} />
            <span>Quay lại danh sách</span>
          </Link>
          <h1 className={styles.pageTitle}>
            {isEditMode
              ? `Chỉnh sửa: ${currentProduct?.name || 'Sản phẩm'}`
              : 'Thêm sản phẩm mới'}
          </h1>
          <p className={styles.pageSubtitle}>
            {isEditMode
              ? 'Quản lý thông tin, biến thể, hình ảnh và trạng thái xuất bản'
              : 'Nhập thông tin cơ bản để bắt đầu tạo sản phẩm'}
          </p>
        </div>
      </div>

      {/* Operator Banner */}
      {isOperator && (
        <div className={styles.operatorBanner} role="note">
          <div className={styles.operatorContent}>
            <AlertCircle size={18} />
            <span>
              <strong>Chế độ xem:</strong> Bạn đang đăng nhập với vai trò Nhân viên vận hành
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

      {/* THẺ TRẠNG THÁI & CHECKLIST XUẤT BẢN (Chỉ hiện khi ở Edit Mode) */}
      {isEditMode && currentProduct && (
        <PublishStatusCard
          product={currentProduct}
          isAdmin={isAdmin}
          isFormDirty={isDirty}
          isPublishing={isPublishing}
          onPublish={handlePublish}
          onSavePrompt={() => {
            setErrorMessage(
              'Biểu mẫu thông tin cơ bản có thay đổi chưa lưu. Hãy lưu trước khi bấm Xuất bản.',
            )
            handleTabChange('basic')
          }}
        />
      )}

      {/* THANH ĐIỀU HƯỚNG TABS (Chỉ hiện khi ở Edit Mode) */}
      {isEditMode && currentProduct && (
        <div className={styles.tabBar}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'basic' ? styles.active : ''}`}
            onClick={() => handleTabChange('basic')}
          >
            <FileText size={16} />
            <span>Thông tin cơ bản</span>
            {isDirty && <span className={styles.dirtyDot} title="Có thay đổi chưa lưu" />}
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'variants' ? styles.active : ''}`}
            onClick={() => handleTabChange('variants')}
          >
            <Layers size={16} />
            <span>Biến thể &amp; Tồn kho</span>
            <span className={styles.tabBadge}>
              {currentProduct.variants.filter((v) => !v.deletedAt).length}
            </span>
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'images' ? styles.active : ''}`}
            onClick={() => handleTabChange('images')}
          >
            <ImageIcon size={16} />
            <span>Thư viện hình ảnh</span>
            <span className={styles.tabBadge}>{currentProduct.images.length}</span>
          </button>
        </div>
      )}

      {/* TAB 1: THÔNG TIN CƠ BẢN (Luôn giữ mounted trong DOM để không mất dữ liệu đang gõ) */}
      <div style={{ display: activeTab === 'basic' ? 'block' : 'none' }}>
        <form id="product-form" onSubmit={handleSubmit} noValidate>
          <div className={styles.formLayout}>
            {/* Cột chính */}
            <div className={styles.mainColumn}>
              {/* Card: Thông tin cơ bản */}
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
                      placeholder="Ví dụ: 100% Cotton, Vải dạ..."
                      value={form.material}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, material: e.target.value }))
                      }
                      disabled={isOperator || isSubmitting}
                      fullWidth
                    />
                  </div>

                  <Textarea
                    label="Mô tả sản phẩm"
                    placeholder="Nhập thông tin chi tiết về sản phẩm, đặc điểm nổi bật..."
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={6}
                    disabled={isOperator || isSubmitting}
                    fullWidth
                  />
                </div>
              </div>

              {/* Card: Giá bán */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Giá bán</h2>
                  <span className={styles.cardSubtitle}>
                    Thiết lập giá bán cơ bản và giá khuyến mãi
                  </span>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.twoColGrid}>
                    <div>
                      <Input
                        label="Giá bán cơ bản (VND) *"
                        placeholder="0"
                        value={form.basePrice}
                        onChange={handleBasePriceChange}
                        errorMessage={fieldErrors.basePrice}
                        helperText={
                          form.basePrice
                            ? `Xem trước: ${formatCurrency(parseInt(form.basePrice, 10) || 0)}`
                            : undefined
                        }
                        disabled={isOperator || isSubmitting}
                        fullWidth
                      />
                    </div>

                    <div>
                      <Input
                        label="Giá so sánh / Giá gốc (VND)"
                        placeholder="0 (Tuỳ chọn)"
                        value={form.compareAtPrice}
                        onChange={handleCompareAtPriceChange}
                        errorMessage={fieldErrors.compareAtPrice}
                        helperText={
                          form.compareAtPrice
                            ? `Xem trước: ${formatCurrency(
                                parseInt(form.compareAtPrice, 10) || 0,
                              )}`
                            : 'Dùng để hiển thị giá gạch bỏ khi có giảm giá.'
                        }
                        disabled={isOperator || isSubmitting}
                        fullWidth
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phụ (Sidebar) */}
            <div className={styles.sideColumn}>
              {/* Phân loại: Danh mục & Thương hiệu */}
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
                          currentProduct?.status !== 'active'
                            ? 'Để kích hoạt (active), vui lòng dùng nút "Xuất bản" sau khi đủ điều kiện.'
                            : 'Bạn có thể chuyển về Bản nháp hoặc Lưu trữ.'
                        }
                      >
                        {currentProduct?.status === 'active' ? (
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
                              Đang hoạt động (Dùng nút Xuất bản)
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
                      Xóa hoàn toàn sản phẩm khỏi hệ thống.
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

          {/* Sticky Action Bar */}
          {!isOperator && isAdmin && (
            <div className={styles.stickyActionBar}>
              <div className={styles.stickyStatus}>
                {isEditMode && isDirty && (
                  <div className={styles.dirtyBadge}>
                    <AlertCircle size={14} />
                    <span>Có thay đổi chưa lưu</span>
                  </div>
                )}
              </div>
              <div className={styles.stickyActions}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={isEditMode ? handleResetForm : () => navigate(backUrl)}
                  disabled={isSubmitting || (isEditMode && !isDirty)}
                >
                  {isEditMode ? 'Hủy thay đổi' : 'Hủy'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting || (isEditMode && !isDirty)}
                  leftIcon={<Save size={16} />}
                >
                  {isSubmitting
                    ? isEditMode
                      ? 'Đang lưu...'
                      : 'Đang tạo...'
                    : isEditMode
                      ? 'Lưu thay đổi'
                      : 'Tạo sản phẩm'}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* TAB 2: BIẾN THỂ & TỒN KHO */}
      {isEditMode && currentProduct && activeTab === 'variants' && (
        <VariantManagementTab
          product={currentProduct}
          lookups={lookups}
          isAdmin={isAdmin}
          onVariantSaved={(saved) => updateLocalVariant(saved)}
          onVariantRemoved={(variantId) => removeLocalVariant(variantId)}
          onStockAdjusted={(variantId, quantityAfter) =>
            updateLocalStock(variantId, quantityAfter)
          }
          onRefetchDetail={handleSafeRefetch}
          onToast={handleToast}
        />
      )}

      {/* TAB 3: THƯ VIỆN HÌNH ẢNH */}
      {isEditMode && currentProduct && activeTab === 'images' && (
        <ImageManagementTab
          product={currentProduct}
          lookups={lookups}
          isAdmin={isAdmin}
          onImageAdded={(img) => updateLocalImage(img)}
          onImageUpdated={(img) => updateLocalImage(img)}
          onImageRemoved={(imgId) => removeLocalImage(imgId)}
          onRefetchDetail={handleSafeRefetch}
          onToast={handleToast}
        />
      )}

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
