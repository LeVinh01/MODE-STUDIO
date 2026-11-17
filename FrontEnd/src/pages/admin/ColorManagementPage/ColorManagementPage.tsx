import { useState, useEffect, useMemo } from 'react'
import {
  Palette,
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle,
  RotateCcw,
  X,
} from 'lucide-react'
import { adminColorService } from '@/services/api/adminColorService'
import { addColorToLookupsCache } from '@/hooks/useAdminLookups'
import type { AdminColorItem } from '@/types/adminColor'
import type { ApiPaginationMeta } from '@/types/api'
import { formatDateTime } from '@/utils/formatters'
import { getApiErrorMessage, getApiFieldErrors } from '@/utils'
import { Button, Input, Badge } from '@/components/common'
import { Pagination } from '@/components/navigation/Pagination'
import { Modal, EmptyState, Skeleton, Spinner } from '@/components/feedback'
import { useAppSelector } from '@/store/hooks'
import { selectCurrentUser } from '@/store/slices/authSlice'
import styles from './ColorManagementPage.module.scss'

export const ColorManagementPage = () => {
  const currentUser = useAppSelector(selectCurrentUser)
  const isAdmin = currentUser?.role === 'admin'

  // Data states
  const [colors, setColors] = useState<AdminColorItem[]>([])
  const [paginationMeta, setPaginationMeta] = useState<ApiPaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Filter / Search states
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [reloadTrigger, setReloadTrigger] = useState(0)

  // Toast / Alert banner state
  const [alert, setAlert] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // Modal: Add / Edit Color
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingColor, setEditingColor] = useState<AdminColorItem | null>(null)
  const [formName, setFormName] = useState('')
  const [formHex, setFormHex] = useState('#111111')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal: Delete Color
  const [colorToDelete, setColorToDelete] = useState<AdminColorItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch list of colors
  useEffect(() => {
    let ignore = false
    const controller = new AbortController()

    adminColorService
      .getColors(
        {
          search: activeSearch,
          page: currentPage,
          per_page: 20,
        },
        controller.signal,
      )
      .then((res) => {
        if (!ignore) {
          setColors(res.colors)
          setPaginationMeta(res.meta || null)
          setLoadError(null)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore && !controller.signal.aborted) {
          setIsLoading(false)
          setLoadError(getApiErrorMessage(err, 'Không thể tải danh sách màu sắc.'))
        }
      })

    return () => {
      ignore = true
      controller.abort()
    }
  }, [activeSearch, currentPage, reloadTrigger])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveSearch(searchTerm.trim())
      setCurrentPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingColor(null)
    setFormName('')
    setFormHex('#111111')
    setFormErrors({})
    setIsFormModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (color: AdminColorItem) => {
    setEditingColor(color)
    setFormName(color.name)
    setFormHex(color.hexCode || '#111111')
    setFormErrors({})
    setIsFormModalOpen(true)
  }

  // Handle Submit Create / Edit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})

    const errors: Record<string, string> = {}
    if (!formName.trim()) {
      errors.name = 'Vui lòng nhập tên màu sắc.'
    } else if (formName.trim().length > 50) {
      errors.name = 'Tên màu sắc tối đa 50 ký tự.'
    }

    const hexRegex = /^#([A-Fa-f0-9]{6})$/
    if (!formHex.trim()) {
      errors.hex_code = 'Vui lòng chọn hoặc nhập mã màu Hex.'
    } else if (!hexRegex.test(formHex.trim())) {
      errors.hex_code = 'Mã màu phải có định dạng #RRGGBB hợp lệ (ví dụ: #111111).'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      setIsSubmitting(true)
      const cleanHex = formHex.trim().toLowerCase()

      if (editingColor) {
        // Update
        const updated = await adminColorService.updateColor(editingColor.id, {
          name: formName.trim(),
          hex_code: cleanHex,
        })

        setColors((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c)),
        )

        addColorToLookupsCache({
          id: updated.id,
          name: updated.name,
          hex_code: updated.hexCode,
        })

        setAlert({
          type: 'success',
          message: `Đã cập nhật màu "${updated.name}" thành công.`,
        })
      } else {
        // Create
        const created = await adminColorService.createColor({
          name: formName.trim(),
          hex_code: cleanHex,
        })

        addColorToLookupsCache({
          id: created.id,
          name: created.name,
          hex_code: created.hexCode,
        })

        setAlert({
          type: 'success',
          message: `Đã tạo mới màu "${created.name}" thành công.`,
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
          message: getApiErrorMessage(err, 'Lưu màu sắc không thành công.'),
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Delete Color
  const handleDeleteConfirm = async () => {
    if (!colorToDelete) return

    try {
      setIsDeleting(true)
      await adminColorService.deleteColor(colorToDelete.id)

      setColors((prev) => prev.filter((c) => c.id !== colorToDelete.id))
      setAlert({
        type: 'success',
        message: `Đã xóa màu "${colorToDelete.name}" thành công.`,
      })
      setColorToDelete(null)
      setReloadTrigger((prev) => prev + 1)
    } catch (err) {
      setAlert({
        type: 'error',
        message: getApiErrorMessage(
          err,
          'Không thể xóa màu sắc. Màu này có thể đang được sử dụng bởi biến thể sản phẩm.',
        ),
      })
      setColorToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const isValidHex = useMemo(() => /^#([A-Fa-f0-9]{6})$/.test(formHex), [formHex])

  return (
    <div className={styles.colorPage}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Quản lý màu sắc</h1>
          <p className={styles.subtitle}>
            Quản lý bảng màu sản phẩm, mã hex và theo dõi số lượng biến thể đang sử dụng.
          </p>
        </div>

        {isAdmin && (
          <div className={styles.headerActions}>
            <Button
              variant="primary"
              leftIcon={<Plus size={16} />}
              onClick={handleOpenCreate}
            >
              Thêm màu mới
            </Button>
          </div>
        )}
      </div>

      {/* Alert Notification */}
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

      {/* Search & Filter Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.searchWrapper}>
          <Input
            placeholder="Tìm kiếm theo tên màu..."
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
      </div>

      {/* Table Content */}
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
              title="Không thể tải dữ liệu"
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
        ) : colors.length === 0 ? (
          <div className={styles.emptyCard}>
            <EmptyState
              icon={<Palette size={40} />}
              title={activeSearch ? 'Không tìm thấy màu sắc phù hợp' : 'Chưa có màu sắc nào'}
              description={
                activeSearch
                  ? `Không có màu sắc nào khớp với từ khóa "${activeSearch}".`
                  : 'Bắt đầu bằng việc thêm màu sắc mới cho hệ thống.'
              }
              action={
                isAdmin && !activeSearch ? (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus size={16} />}
                    onClick={handleOpenCreate}
                  >
                    Thêm màu đầu tiên
                  </Button>
                ) : activeSearch ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                  >
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
                  <th>Màu sắc</th>
                  <th>Mã Hex</th>
                  <th style={{ textAlign: 'center' }}>Số biến thể</th>
                  <th style={{ textAlign: 'center' }}>Số hình ảnh</th>
                  <th>Ngày tạo</th>
                  {isAdmin && <th style={{ textAlign: 'right' }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {colors.map((color) => (
                  <tr key={color.id}>
                    <td>#{color.id}</td>
                    <td>
                      <div className={styles.colorPreviewCell}>
                        <span
                          className={styles.swatchCircle}
                          style={{ backgroundColor: color.hexCode }}
                          title={color.hexCode}
                        />
                        <span className={styles.colorName}>{color.name}</span>
                      </div>
                    </td>
                    <td>
                      <code className={styles.hexBadge}>{color.hexCode}</code>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Badge variant={color.variantsCount > 0 ? 'default' : 'outline'}>
                        {color.variantsCount}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Badge variant={color.imagesCount > 0 ? 'default' : 'outline'}>
                        {color.imagesCount}
                      </Badge>
                    </td>
                    <td>{formatDateTime(color.createdAt)}</td>
                    {isAdmin && (
                      <td>
                        <div className={styles.actionsCell}>
                          <button
                            type="button"
                            className={styles.actionBtn}
                            onClick={() => handleOpenEdit(color)}
                            title="Chỉnh sửa màu sắc"
                            aria-label={`Chỉnh sửa màu ${color.name}`}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            onClick={() => setColorToDelete(color)}
                            title={
                              color.variantsCount > 0 || color.imagesCount > 0
                                ? 'Màu đang được sử dụng, không thể xóa'
                                : 'Xóa màu sắc'
                            }
                            aria-label={`Xóa màu ${color.name}`}
                          >
                            <Trash2 size={15} />
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

      {/* Pagination */}
      {paginationMeta && paginationMeta.last_page > 1 && (
        <Pagination
          page={paginationMeta.current_page}
          totalPages={paginationMeta.last_page}
          onChange={(page: number) => setCurrentPage(page)}
        />
      )}

      {/* Modal: Thêm / Sửa màu */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => !isSubmitting && setIsFormModalOpen(false)}
        title={editingColor ? 'Chỉnh sửa màu sắc' : 'Thêm màu sắc mới'}
      >
        <form onSubmit={handleFormSubmit} className={styles.modalForm}>
          <Input
            label="Tên màu sắc *"
            placeholder="Ví dụ: Xanh Olive, Đen Nhám, Be Cát..."
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

          <div className={styles.hexPickerGroup}>
            <label className={styles.hexPickerLabel}>Mã màu Hex *</label>
            <div className={styles.hexInputRow}>
              <input
                type="color"
                className={styles.nativeColorInput}
                value={isValidHex ? formHex : '#000000'}
                onChange={(e) => {
                  setFormHex(e.target.value.toLowerCase())
                  if (formErrors.hex_code) {
                    setFormErrors((prev) => {
                      const next = { ...prev }
                      delete next.hex_code
                      return next
                    })
                  }
                }}
                disabled={isSubmitting}
                title="Chọn màu bằng bảng màu"
              />
              <div className={styles.hexTextInput}>
                <Input
                  value={formHex}
                  placeholder="#111111"
                  onChange={(e) => {
                    setFormHex(e.target.value)
                    if (formErrors.hex_code) {
                      setFormErrors((prev) => {
                        const next = { ...prev }
                        delete next.hex_code
                        return next
                      })
                    }
                  }}
                  errorMessage={formErrors.hex_code}
                  disabled={isSubmitting}
                  fullWidth
                />
              </div>
            </div>
          </div>

          <div className={styles.previewBox}>
            <span
              className={styles.previewSwatch}
              style={{ backgroundColor: isValidHex ? formHex : '#cccccc' }}
            />
            <div className={styles.previewInfo}>
              <span className={styles.previewLabel}>Xem trước màu sắc:</span>
              <span className={styles.previewValue}>
                {formName || '(Chưa đặt tên)'} — {isValidHex ? formHex : 'Mã hex không hợp lệ'}
              </span>
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
              {isSubmitting ? 'Đang lưu...' : editingColor ? 'Cập nhật' : 'Tạo màu'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Xác nhận xóa màu */}
      <Modal
        isOpen={Boolean(colorToDelete)}
        onClose={() => !isDeleting && setColorToDelete(null)}
        title="Xác nhận xóa màu sắc"
      >
        <div>
          {colorToDelete && (colorToDelete.variantsCount > 0 || colorToDelete.imagesCount > 0) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <p style={{ color: 'var(--color-error, #dc2626)' }}>
                Không thể xóa màu <strong>{colorToDelete.name}</strong> ({colorToDelete.hexCode}) vì màu này đang được liên kết với{' '}
                <strong>{colorToDelete.variantsCount}</strong> biến thể và{' '}
                <strong>{colorToDelete.imagesCount}</strong> hình ảnh sản phẩm.
              </p>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                Vui lòng xóa hoặc thay đổi màu sắc ở các biến thể và hình ảnh liên quan trước khi xóa màu này.
              </p>
              <div className={styles.modalActions}>
                <Button
                  variant="secondary"
                  onClick={() => setColorToDelete(null)}
                >
                  Đóng
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <p>
                Bạn có chắc chắn muốn xóa màu{' '}
                <strong>{colorToDelete?.name}</strong> (<code>{colorToDelete?.hexCode}</code>)? Thao tác này không thể hoàn tác.
              </p>
              <div className={styles.modalActions}>
                <Button
                  variant="secondary"
                  onClick={() => setColorToDelete(null)}
                  disabled={isDeleting}
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  className={styles.deleteConfirmBtn}
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  leftIcon={isDeleting ? <Spinner size="sm" /> : undefined}
                >
                  {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
