import { useState, useEffect, useMemo, useRef } from 'react'
import {
  FolderTree,
  Plus,
  Search,
  Pencil,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  RotateCcw,
  X,
  Upload,
  Trash2,
} from 'lucide-react'
import { adminCategoryService } from '@/services/api/adminCategoryService'
import type { AdminCategoryItem } from '@/types/adminCategory'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils'
import { Button, Input, Select, Textarea, Checkbox, Badge } from '@/components/common'
import { Modal, EmptyState, Skeleton, Spinner } from '@/components/feedback'
import { useAppSelector } from '@/store/hooks'
import { selectCurrentUser } from '@/store/slices/authSlice'
import styles from './CategoryManagementPage.module.scss'

export const CategoryManagementPage = () => {
  const currentUser = useAppSelector(selectCurrentUser)
  const isAdmin = currentUser?.role === 'admin'

  // Data states
  const [categories, setCategories] = useState<AdminCategoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedParentFilter, setSelectedParentFilter] = useState<string>('all')
  const [reloadTrigger, setReloadTrigger] = useState(0)

  // Alert notification
  const [alert, setAlert] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // Modal: Add / Edit Category
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<AdminCategoryItem | null>(null)
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formParentId, setFormParentId] = useState<number | ''>('')
  const [formDescription, setFormDescription] = useState('')
  const [formSortOrder, setFormSortOrder] = useState('0')
  const [formIsActive, setFormIsActive] = useState(true)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal: Image Upload / Representative Image
  const [imageModalCategory, setImageModalCategory] = useState<AdminCategoryItem | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load categories
  useEffect(() => {
    let ignore = false
    const controller = new AbortController()

    adminCategoryService
      .getCategories({ all: true }, controller.signal)
      .then((res) => {
        if (!ignore) {
          setCategories(res.categories)
          setLoadError(null)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore && !controller.signal.aborted) {
          setIsLoading(false)
          setLoadError(getApiErrorMessage(err, 'Không thể tải danh sách danh mục.'))
        }
      })

    return () => {
      ignore = true
      controller.abort()
    }
  }, [reloadTrigger])

  // Lọc danh mục theo tìm kiếm và danh mục cha
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchSearch =
        !searchTerm.trim() ||
        cat.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        cat.slug.toLowerCase().includes(searchTerm.toLowerCase().trim())

      const matchParent =
        selectedParentFilter === 'all' ||
        (selectedParentFilter === 'root' && cat.parentId === null) ||
        (selectedParentFilter !== 'all' &&
          selectedParentFilter !== 'root' &&
          cat.parentId === Number(selectedParentFilter))

      return matchSearch && matchParent
    })
  }, [categories, searchTerm, selectedParentFilter])

  // Danh sách các danh mục gốc / tiềm năng làm cha
  const rootCategories = useMemo(() => {
    return categories.filter((c) => c.parentId === null)
  }, [categories])

  // Mở modal Thêm danh mục
  const handleOpenCreate = () => {
    setEditingCategory(null)
    setFormName('')
    setFormSlug('')
    setFormParentId('')
    setFormDescription('')
    setFormSortOrder('0')
    setFormIsActive(true)
    setFormErrors({})
    setIsFormModalOpen(true)
  }

  // Mở modal Chỉnh sửa danh mục
  const handleOpenEdit = (cat: AdminCategoryItem) => {
    setEditingCategory(cat)
    setFormName(cat.name)
    setFormSlug(cat.slug)
    setFormParentId(cat.parentId ?? '')
    setFormDescription(cat.description || '')
    setFormSortOrder(String(cat.sortOrder ?? 0))
    setFormIsActive(cat.isActive)
    setFormErrors({})
    setIsFormModalOpen(true)
  }

  // Submit Form Thêm / Sửa danh mục
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})

    const errors: Record<string, string> = {}
    if (!formName.trim()) {
      errors.name = 'Vui lòng nhập tên danh mục.'
    } else if (formName.trim().length > 120) {
      errors.name = 'Tên danh mục tối đa 120 ký tự.'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      setIsSubmitting(true)
      const parsedSort = parseInt(formSortOrder, 10)

      if (editingCategory) {
        // Cập nhật
        const updated = await adminCategoryService.updateCategory(editingCategory.id, {
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
          parent_id: formParentId === '' ? null : Number(formParentId),
          description: formDescription.trim() || null,
          sort_order: isNaN(parsedSort) ? 0 : parsedSort,
          is_active: formIsActive,
        })

        setCategories((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c)),
        )

        setAlert({
          type: 'success',
          message: `Đã cập nhật danh mục "${updated.name}" thành công.`,
        })
      } else {
        // Tạo mới
        const created = await adminCategoryService.createCategory({
          name: formName.trim(),
          slug: formSlug.trim() || undefined,
          parent_id: formParentId === '' ? null : Number(formParentId),
          description: formDescription.trim() || null,
          sort_order: isNaN(parsedSort) ? 0 : parsedSort,
          is_active: formIsActive,
        })

        setAlert({
          type: 'success',
          message: `Đã tạo danh mục "${created.name}" thành công.`,
        })
        setReloadTrigger((prev) => prev + 1)
      }

      setIsFormModalOpen(false)
    } catch (err) {
      const fieldErrs = getApiFieldErrors(err)
      if (Object.keys(fieldErrs).length > 0) {
        setFormErrors(fieldErrs)
      } else {
        setAlert({
          type: 'error',
          message: getApiErrorMessage(err, 'Lưu danh mục không thành công.'),
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Mở modal Quản lý ảnh đại diện
  const handleOpenImageModal = (cat: AdminCategoryItem) => {
    setImageModalCategory(cat)
    setSelectedFile(null)
    setFilePreviewUrl(null)
    setImageError(null)
  }

  // Chọn file ảnh
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setImageError(null)

    if (!file) {
      setSelectedFile(null)
      setFilePreviewUrl(null)
      return
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setImageError('Dung lượng tệp vượt quá 2MB. Vui lòng chọn tệp nhỏ hơn.')
      return
    }

    // Validate mime
    const validMimes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validMimes.includes(file.type)) {
      setImageError('Chỉ hỗ trợ tệp định dạng JPG, PNG hoặc WEBP.')
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setFilePreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Submit Upload Ảnh
  const handleUploadImageSubmit = async () => {
    if (!imageModalCategory || !selectedFile) return

    try {
      setIsUploadingImage(true)
      setImageError(null)

      const updated = await adminCategoryService.uploadImage(
        imageModalCategory.id,
        selectedFile,
      )

      setCategories((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      )

      setAlert({
        type: 'success',
        message: `Đã tải lên ảnh đại diện cho danh mục "${updated.name}" thành công.`,
      })

      setImageModalCategory(null)
    } catch (err) {
      setImageError(getApiErrorMessage(err, 'Tải lên hình ảnh không thành công.'))
    } finally {
      setIsUploadingImage(false)
    }
  }

  // Submit Xóa Ảnh
  const handleRemoveImage = async () => {
    if (!imageModalCategory) return

    try {
      setIsUploadingImage(true)
      setImageError(null)

      const updated = await adminCategoryService.removeImage(imageModalCategory.id)

      setCategories((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c)),
      )

      setAlert({
        type: 'success',
        message: `Đã gỡ bỏ ảnh đại diện cho danh mục "${updated.name}".`,
      })

      setImageModalCategory(null)
    } catch (err) {
      setImageError(getApiErrorMessage(err, 'Gỡ hình ảnh không thành công.'))
    } finally {
      setIsUploadingImage(false)
    }
  }

  return (
    <div className={styles.categoryPage}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Quản lý danh mục</h1>
          <p className={styles.subtitle}>
            Tổ chức cây danh mục phân cấp, ảnh đại diện và theo dõi sản phẩm liên kết.
          </p>
        </div>

        {isAdmin && (
          <div className={styles.headerActions}>
            <Button
              variant="primary"
              leftIcon={<Plus size={16} />}
              onClick={handleOpenCreate}
            >
              Thêm danh mục mới
            </Button>
          </div>
        )}
      </div>

      {/* Alert Banner */}
      {alert && (
        <div className={`${styles.alertBanner} ${styles[alert.type]}`} role="alert">
          <div className={styles.alertContent}>
            {alert.type === 'success' ? (
              <CheckCircle size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span>{alert.message}</span>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setAlert(null)}
            aria-label="Đóng thông báo"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Controls Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.searchWrapper}>
          <Input
            placeholder="Tìm theo tên hoặc slug danh mục..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search size={16} />}
            rightIcon={
              searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                    color: 'inherit',
                  }}
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X size={14} />
                </button>
              ) : undefined
            }
            fullWidth
          />
        </div>

        <div className={styles.filterGroup}>
          <Select
            value={selectedParentFilter}
            onChange={(e) => setSelectedParentFilter(e.target.value)}
          >
            <option value="all">Tất cả cấp bậc</option>
            <option value="root">Danh mục gốc (Không có cha)</option>
            {rootCategories.map((rc) => (
              <option key={rc.id} value={rc.id}>
                Con của: {rc.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Table Card */}
      <div className={styles.tableCard}>
        {isLoading ? (
          <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} variant="rectangular" height={48} borderRadius={6} />
            ))}
          </div>
        ) : loadError ? (
          <div className={styles.emptyCard}>
            <EmptyState
              icon={<AlertCircle size={40} />}
              title="Không thể tải danh mục"
              description={loadError}
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<RotateCcw size={16} />}
                  onClick={() => {
                    setIsLoading(true)
                    setReloadTrigger((prev) => prev + 1)
                  }}
                >
                  Thử lại
                </Button>
              }
            />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className={styles.emptyCard}>
            <EmptyState
              icon={<FolderTree size={40} />}
              title={searchTerm ? 'Không tìm thấy danh mục phù hợp' : 'Chưa có danh mục nào'}
              description={
                searchTerm
                  ? `Không có danh mục nào khớp với từ khóa "${searchTerm}".`
                  : 'Bắt đầu tạo danh mục phân cấp cho cửa hàng.'
              }
              action={
                searchTerm ? (
                  <Button variant="secondary" size="sm" onClick={() => setSearchTerm('')}>
                    Xóa tìm kiếm
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Danh mục</th>
                  <th>Cấp bậc / Danh mục cha</th>
                  <th style={{ textAlign: 'center' }}>Số sản phẩm</th>
                  <th style={{ textAlign: 'center' }}>Số danh mục con</th>
                  <th style={{ textAlign: 'center' }}>Thứ tự</th>
                  <th>Trạng thái</th>
                  {isAdmin && <th style={{ textAlign: 'right' }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((cat) => (
                  <tr key={cat.id}>
                    <td>#{cat.id}</td>
                    <td>
                      <div className={styles.categoryCell}>
                        <div className={styles.categoryThumb}>
                          {cat.imageUrl ? (
                            <img src={cat.imageUrl} alt={cat.name} loading="lazy" />
                          ) : (
                            <span className={styles.noImageThumb}>
                              {cat.name.trim().charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className={styles.categoryInfo}>
                          <span className={styles.categoryName}>{cat.name}</span>
                          <span className={styles.categorySlug}>{cat.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {cat.parent ? (
                        <span className={styles.parentBadge}>Con của: {cat.parent.name}</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                          Danh mục gốc
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Badge variant={cat.productsCount > 0 ? 'default' : 'outline'}>
                        {cat.productsCount}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Badge variant={cat.childrenCount > 0 ? 'default' : 'outline'}>
                        {cat.childrenCount}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'center' }}>{cat.sortOrder}</td>
                    <td>
                      <Badge variant={cat.isActive ? 'success' : 'outline'}>
                        {cat.isActive ? 'Hoạt động' : 'Tạm ẩn'}
                      </Badge>
                    </td>
                    {isAdmin && (
                      <td>
                        <div className={styles.actionsCell}>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => handleOpenImageModal(cat)}
                            title="Quản lý ảnh đại diện"
                            aria-label={`Quản lý ảnh đại diện danh mục ${cat.name}`}
                          >
                            <ImageIcon size={15} />
                          </button>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => handleOpenEdit(cat)}
                            title="Chỉnh sửa danh mục"
                            aria-label={`Chỉnh sửa danh mục ${cat.name}`}
                          >
                            <Pencil size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Thêm / Sửa Danh mục */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => !isSubmitting && setIsFormModalOpen(false)}
        title={editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
      >
        <form onSubmit={handleFormSubmit} className={styles.modalForm}>
          <Input
            label="Tên danh mục *"
            placeholder="Ví dụ: Áo Khoác Dạ & Măng Tô Nữ..."
            value={formName}
            onChange={(e) => {
              setFormName(e.target.value)
              if (formErrors.name) {
                setFormErrors((prev) => {
                  const next = { ...prev }
                  delete next.name
                  return next
                })
              }
            }}
            errorMessage={formErrors.name}
            disabled={isSubmitting}
            fullWidth
            autoFocus
          />

          <div className={styles.twoCol}>
            <Input
              label="Slug (Đường dẫn tĩnh)"
              placeholder="Tự động tạo từ tên nếu để trống"
              value={formSlug}
              onChange={(e) => {
                setFormSlug(e.target.value)
                if (formErrors.slug) {
                  setFormErrors((prev) => {
                    const next = { ...prev }
                    delete next.slug
                    return next
                  })
                }
              }}
              errorMessage={formErrors.slug}
              disabled={isSubmitting}
              fullWidth
            />

            <div>
              <Select
                label="Danh mục cha"
                value={formParentId}
                onChange={(e) => setFormParentId(e.target.value ? Number(e.target.value) : '')}
                disabled={isSubmitting}
                errorMessage={formErrors.parent_id}
                fullWidth
              >
                <option value="">-- Danh mục gốc (Không có cha) --</option>
                {categories
                  .filter((c) => !editingCategory || c.id !== editingCategory.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parentId ? `└─ ${c.name}` : c.name}
                    </option>
                  ))}
              </Select>
            </div>
          </div>

          <Textarea
            label="Mô tả danh mục"
            placeholder="Mô tả phong cách, chất liệu hoặc điểm nổi bật của danh mục..."
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            disabled={isSubmitting}
            rows={3}
            fullWidth
          />

          <div className={styles.twoCol}>
            <Input
              label="Thứ tự hiển thị"
              type="number"
              value={formSortOrder}
              onChange={(e) => setFormSortOrder(e.target.value)}
              disabled={isSubmitting}
              fullWidth
            />

            <div style={{ display: 'flex', alignItems: 'center', marginTop: 'var(--space-6)' }}>
              <Checkbox
                label="Đang hoạt động (Hiển thị ra ngoài storefront)"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className={styles.modalActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsFormModalOpen(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              leftIcon={isSubmitting ? <Spinner size="sm" /> : undefined}
            >
              {isSubmitting ? 'Đang lưu...' : editingCategory ? 'Cập nhật' : 'Tạo danh mục'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Quản lý ảnh đại diện danh mục */}
      <Modal
        isOpen={Boolean(imageModalCategory)}
        onClose={() => !isUploadingImage && setImageModalCategory(null)}
        title={`Ảnh đại diện: ${imageModalCategory?.name}`}
      >
        <div className={styles.imageUploadSection}>
          <div className={styles.previewContainer}>
            {filePreviewUrl ? (
              <img src={filePreviewUrl} alt="Xem trước ảnh mới" />
            ) : imageModalCategory?.imageUrl ? (
              <img src={imageModalCategory.imageUrl} alt={imageModalCategory.name} />
            ) : (
              <div className={styles.emptyPreview}>
                <ImageIcon size={36} />
                <span>Chưa có ảnh</span>
              </div>
            )}
          </div>

          <div className={styles.uploadInputWrapper}>
            <input
              type="file"
              ref={fileInputRef}
              className={styles.hiddenFileInput}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isUploadingImage}
            />

            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Upload size={16} />}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage}
            >
              {selectedFile ? 'Chọn ảnh khác' : imageModalCategory?.imageUrl ? 'Thay ảnh khác' : 'Chọn ảnh đại diện'}
            </Button>

            <span className={styles.uploadHelperText}>
              Định dạng hỗ trợ: JPG, PNG, WEBP. Dung lượng tối đa: 2MB.
            </span>

            {imageError && (
              <span style={{ color: 'var(--color-error, #dc2626)', fontSize: 'var(--font-size-xs)' }}>
                {imageError}
              </span>
            )}
          </div>

          <div className={styles.modalActions} style={{ width: '100%', marginTop: 'var(--space-4)' }}>
            {imageModalCategory?.imageUrl && !selectedFile && (
              <Button
                type="button"
                variant="secondary"
                style={{ color: '#dc2626', marginRight: 'auto' }}
                onClick={handleRemoveImage}
                disabled={isUploadingImage}
                leftIcon={<Trash2 size={16} />}
              >
                Gỡ ảnh hiện tại
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              onClick={() => setImageModalCategory(null)}
              disabled={isUploadingImage}
            >
              Đóng
            </Button>

            {selectedFile && (
              <Button
                type="button"
                variant="primary"
                onClick={handleUploadImageSubmit}
                disabled={isUploadingImage}
                leftIcon={isUploadingImage ? <Spinner size="sm" /> : undefined}
              >
                {isUploadingImage ? 'Đang tải lên...' : 'Lưu ảnh'}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
