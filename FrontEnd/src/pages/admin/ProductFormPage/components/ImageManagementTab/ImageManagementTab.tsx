import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  UploadCloud,
  Trash2,
  Star,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  X,
} from 'lucide-react'
import axios from 'axios'
import { adminProductService } from '@/services/api/adminProductService'
import type {
  AdminImageItem,
  AdminLookups,
  AdminProductDetail,
} from '@/types/adminProduct'
import { getApiErrorMessage } from '@/utils'
import { Button, Select } from '@/components/common'
import { Modal, Spinner, EmptyState } from '@/components/feedback'
import styles from './ImageManagementTab.module.scss'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

interface UploadQueueItem {
  id: string
  file: File
  previewUrl: string
  colorId: number | null
  status: 'pending' | 'uploading' | 'success' | 'error'
  errorMessage?: string
}

export interface ImageManagementTabProps {
  product: AdminProductDetail
  lookups: AdminLookups
  isAdmin: boolean
  onImageAdded: (image: AdminImageItem) => void
  onImageUpdated: (image: AdminImageItem) => void
  onImageRemoved: (imageId: number) => void
  onRefetchDetail: () => Promise<AdminProductDetail | null>
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

export const ImageManagementTab = ({
  product,
  lookups,
  isAdmin,
  onImageAdded,
  onImageUpdated,
  onImageRemoved,
  onRefetchDetail,
  onToast,
}: ImageManagementTabProps) => {
  // Upload options
  const [selectedColorForUpload, setSelectedColorForUpload] = useState<number | ''>('')
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([])

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // AbortController cho các request upload đang diễn ra
  const abortControllerRef = useRef<AbortController | null>(null)
  const isProcessingRef = useRef(false)
  const queueRef = useRef<UploadQueueItem[]>([])

  useEffect(() => {
    queueRef.current = uploadQueue
  }, [uploadQueue])

  // Modal Xóa ảnh
  const [deletingImage, setDeletingImage] = useState<AdminImageItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Cảnh báo UX: sản phẩm đang ACTIVE chỉ còn 1 ảnh thì không được xóa
  const isLastImageOfActiveProduct =
    product.status === 'active' && product.images.length <= 1

  const handleOpenDelete = (img: AdminImageItem) => {
    setDeletingImage(img)
    setDeleteError(null)
  }

  const handleCloseDelete = () => {
    if (isDeleting) return
    setDeletingImage(null)
    setDeleteError(null)
  }

  // Loading state cho thao tác đổi ảnh chính / gán màu
  const [actionImageId, setActionImageId] = useState<number | null>(null)

  // 1. Cảnh báo beforeunload khi còn ảnh trong hàng đợi đang tải
  const hasActiveUploads = useMemo(() => {
    return uploadQueue.some(
      (item) => item.status === 'uploading' || item.status === 'pending',
    )
  }, [uploadQueue])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasActiveUploads) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasActiveUploads])

  // 2. Hủy các upload đang chạy và revoke preview URL khi unmount
  useEffect(() => {
    const controller = new AbortController()
    abortControllerRef.current = controller

    return () => {
      controller.abort()
      queueRef.current.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl)
      })
    }
  }, [])

  // 3. Queue Runner: Thực thi tải lên tuần tự từng tệp mà KHÔNG dùng useEffect gây cascading render
  const runUploadQueue = useCallback(async () => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true

    let anyUploaded = false

    while (true) {
      const nextPending = queueRef.current.find((item) => item.status === 'pending')
      if (!nextPending) break

      // Cập nhật trạng thái uploading
      setUploadQueue((prev) =>
        prev.map((i) => (i.id === nextPending.id ? { ...i, status: 'uploading' } : i)),
      )

      const formData = new FormData()
      formData.append('image', nextPending.file)
      if (nextPending.colorId !== null) {
        formData.append('color_id', String(nextPending.colorId))
      }

      try {
        const uploaded = await adminProductService.uploadProductImage(
          product.id,
          formData,
          abortControllerRef.current?.signal,
        )

        anyUploaded = true
        onImageAdded(uploaded)

        setUploadQueue((prev) =>
          prev.map((i) => (i.id === nextPending.id ? { ...i, status: 'success' } : i)),
        )
      } catch (err: unknown) {
        if (axios.isCancel(err)) {
          break
        }

        const errorMsg = getApiErrorMessage(err, 'Tải ảnh thất bại.')

        setUploadQueue((prev) =>
          prev.map((i) =>
            i.id === nextPending.id
              ? { ...i, status: 'error', errorMessage: errorMsg }
              : i,
          ),
        )
      }
    }

    isProcessingRef.current = false

    // Sau khi toàn bộ hàng đợi xử lý xong, refetch MỘT LẦN duy nhất
    if (anyUploaded) {
      onRefetchDetail()
    }
  }, [product.id, onImageAdded, onRefetchDetail])

  // 4. Xử lý thêm tệp vào hàng đợi
  const handleFilesSelected = (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    const newItems: UploadQueueItem[] = []

    fileArray.forEach((file) => {
      const previewUrl = URL.createObjectURL(file)
      const targetColorId =
        selectedColorForUpload !== '' ? Number(selectedColorForUpload) : null

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        newItems.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          previewUrl,
          colorId: targetColorId,
          status: 'error',
          errorMessage: 'Định dạng không hợp lệ. Chỉ chấp nhận JPG, PNG, WEBP.',
        })
        return
      }

      if (file.size > MAX_FILE_SIZE) {
        newItems.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          previewUrl,
          colorId: targetColorId,
          status: 'error',
          errorMessage: `Dung lượng ${(file.size / (1024 * 1024)).toFixed(1)}MB vượt quá giới hạn 2MB.`,
        })
        return
      }

      newItems.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl,
        colorId: targetColorId,
        status: 'pending',
      })
    })

    setUploadQueue((prev) => [...prev, ...newItems])

    // Kích hoạt worker trong microtask tiếp theo
    setTimeout(runUploadQueue, 0)
  }

  // Thử lại một file bị lỗi
  const handleRetryItem = (id: string) => {
    setUploadQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'pending', errorMessage: undefined } : item,
      ),
    )
    setTimeout(runUploadQueue, 0)
  }

  // Xóa một item khỏi hàng đợi
  const handleRemoveQueueItem = (id: string) => {
    setUploadQueue((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((i) => i.id !== id)
    })
  }

  // Dọn sạch danh sách file đã hoàn thành
  const handleClearFinished = () => {
    setUploadQueue((prev) => {
      const finished = prev.filter((i) => i.status === 'success')
      finished.forEach((i) => URL.revokeObjectURL(i.previewUrl))
      return prev.filter((i) => i.status !== 'success')
    })
  }

  // 5. Đặt ảnh làm ảnh chính
  const handleSetMainImage = async (img: AdminImageItem) => {
    if (!isAdmin || img.isMain) return
    setActionImageId(img.id)
    try {
      const updated = await adminProductService.updateProductImage(
        product.id,
        img.id,
        {
          is_main: true,
          color_id: img.colorId,
        },
      )
      onImageUpdated(updated)
      onToast('Đã đặt làm ảnh chính thành công.', 'success')
      onRefetchDetail()
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Không thể đặt ảnh chính.')
      onToast(msg, 'error')
    } finally {
      setActionImageId(null)
    }
  }

  // 6. Gán màu cho ảnh
  const handleChangeColor = async (img: AdminImageItem, newColorId: number | null) => {
    if (!isAdmin) return
    setActionImageId(img.id)
    try {
      const updated = await adminProductService.updateProductImage(
        product.id,
        img.id,
        {
          color_id: newColorId,
        },
      )
      onImageUpdated(updated)
      onToast('Đã cập nhật phân loại màu cho ảnh.', 'success')
      onRefetchDetail()
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Không thể đổi màu sắc cho ảnh.')
      onToast(msg, 'error')
    } finally {
      setActionImageId(null)
    }
  }

  // 7. Xóa ảnh
  const handleConfirmDelete = async () => {
    if (!deletingImage || !isAdmin) return

    if (isLastImageOfActiveProduct) {
      setDeleteError(
        'Sản phẩm đang bán nên cần giữ ít nhất 1 hình ảnh. Hãy chuyển sản phẩm về bản nháp/lưu trữ, hoặc thêm ảnh mới trước khi xóa ảnh này.',
      )
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    try {
      await adminProductService.deleteProductImage(product.id, deletingImage.id)
      onImageRemoved(deletingImage.id)
      onToast('Đã xóa hình ảnh thành công.', 'success')
      setDeletingImage(null)
      setDeleteError(null)
      onRefetchDetail()
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Không thể xóa hình ảnh. Vui lòng thử lại.')
      setDeleteError(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  // 8. Chia nhóm ảnh theo màu sắc (+ nhóm Chưa gắn màu)
  const imageGroups = useMemo(() => {
    const groups: {
      colorId: number | null
      colorName: string
      hexCode?: string
      images: AdminImageItem[]
    }[] = []

    const colorIdsWithImages = Array.from(
      new Set(
        product.images
          .map((img) => img.colorId)
          .filter((id): id is number => id !== null),
      ),
    )

    colorIdsWithImages.forEach((cId) => {
      const lookupColor = lookups.colors.find((c) => c.id === cId)
      const imagesInColor = product.images.filter((img) => img.colorId === cId)
      groups.push({
        colorId: cId,
        colorName: lookupColor?.name || `Màu #${cId}`,
        hexCode: lookupColor?.hex_code,
        images: imagesInColor,
      })
    })

    const unassignedImages = product.images.filter((img) => img.colorId === null)
    if (unassignedImages.length > 0 || groups.length === 0) {
      groups.push({
        colorId: null,
        colorName: 'Chưa gắn màu sắc (Ảnh chung)',
        images: unassignedImages,
      })
    }

    return groups
  }, [product.images, lookups.colors])

  return (
    <div className={styles.container}>
      {/* VÙNG TẢI ẢNH (Chỉ Admin) */}
      {isAdmin && (
        <div className={styles.uploadCard}>
          <div className={styles.uploadHeader}>
            <div className={styles.uploadTitle}>
              <h4>Tải ảnh sản phẩm</h4>
              <p>Hỗ trợ định dạng JPG, PNG, WEBP. Tối đa 2MB mỗi ảnh.</p>
            </div>

            <div className={styles.colorSelector}>
              <Select
                label="Gắn vào màu sắc:"
                value={selectedColorForUpload}
                onChange={(e) =>
                  setSelectedColorForUpload(
                    e.target.value ? Number(e.target.value) : '',
                  )
                }
              >
                <option value="">-- Ảnh chung (Không gắn màu) --</option>
                {lookups.colors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.hex_code})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Drag & Drop Dropzone */}
          <div
            className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              if (e.dataTransfer.files) {
                handleFilesSelected(e.dataTransfer.files)
              }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/jpg,image/webp"
              className={styles.fileInput}
              onChange={(e) => {
                if (e.target.files) {
                  handleFilesSelected(e.target.files)
                  e.target.value = ''
                }
              }}
            />
            <UploadCloud size={36} className={styles.uploadIcon} />
            <div className={styles.dropText}>
              <strong>Nhấn để chọn ảnh hoặc kéo thả vào đây</strong>
              <span>Có thể chọn nhiều ảnh cùng lúc</span>
            </div>
          </div>

          {/* Danh sách Hàng đợi Tải lên */}
          {uploadQueue.length > 0 && (
            <div className={styles.queueContainer}>
              <div className={styles.queueHeader}>
                <span className={styles.queueTitle}>
                  Hàng đợi tải lên ({uploadQueue.length})
                </span>
                {uploadQueue.some((i) => i.status === 'success') && (
                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={handleClearFinished}
                  >
                    Dọn các ảnh đã tải xong
                  </button>
                )}
              </div>

              <div className={styles.queueList}>
                {uploadQueue.map((item) => (
                  <div
                    key={item.id}
                    className={`${styles.queueItem} ${styles[item.status]}`}
                  >
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className={styles.queuePreview}
                    />
                    <div className={styles.queueInfo}>
                      <span className={styles.queueFileName}>{item.file.name}</span>
                      <span className={styles.queueFileSize}>
                        {(item.file.size / 1024).toFixed(0)} KB
                      </span>

                      {item.status === 'uploading' && (
                        <div className={styles.statusLine}>
                          <Spinner size="sm" />
                          <span>Đang tải lên máy chủ...</span>
                        </div>
                      )}

                      {item.status === 'success' && (
                        <span className={styles.successLine}>✓ Đã tải lên</span>
                      )}

                      {item.status === 'error' && (
                        <span className={styles.errorLine}>
                          <AlertCircle size={14} />
                          {item.errorMessage || 'Lỗi tải ảnh'}
                        </span>
                      )}
                    </div>

                    <div className={styles.queueActions}>
                      {item.status === 'error' && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRetryItem(item.id)}
                          leftIcon={<RotateCcw size={14} />}
                        >
                          Thử lại
                        </Button>
                      )}

                      {item.status !== 'uploading' && (
                        <button
                          type="button"
                          className={styles.removeQueueBtn}
                          onClick={() => handleRemoveQueueItem(item.id)}
                          aria-label="Xóa khỏi hàng đợi"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DANH SÁCH ẢNH THEO NHÓM MÀU */}
      <div className={styles.gallery}>
        <div className={styles.galleryHeader}>
          <h3 className={styles.galleryTitle}>
            Thư viện hình ảnh ({product.images.length})
          </h3>
          <p className={styles.gallerySubtitle}>
            Các hình ảnh được gom nhóm theo màu sắc để khách hàng xem đúng mẫu mã tương ứng.
          </p>
        </div>

        {product.images.length === 0 ? (
          <EmptyState
            title="Chưa có hình ảnh nào"
            description="Sản phẩm cần có ít nhất một hình ảnh để có thể xuất bản ra cửa hàng."
          />
        ) : (
          imageGroups.map((group) => (
            <div key={group.colorId ?? 'unassigned'} className={styles.colorGroup}>
              <div className={styles.groupHeader}>
                <div className={styles.groupColor}>
                  {group.hexCode && (
                    <span
                      className={styles.groupSwatch}
                      style={{ backgroundColor: group.hexCode }}
                    />
                  )}
                  <h4 className={styles.groupTitle}>{group.colorName}</h4>
                  <span className={styles.imageCountBadge}>
                    {group.images.length} ảnh
                  </span>
                </div>
              </div>

              {group.images.length === 0 ? (
                <div className={styles.emptyGroup}>
                  Chưa có ảnh nào được gắn vào màu này.
                </div>
              ) : (
                <div className={styles.imageGrid}>
                  {group.images.map((img) => (
                    <div
                      key={img.id}
                      className={`${styles.imageCard} ${img.isMain ? styles.mainImage : ''}`}
                    >
                      <div className={styles.thumbnailWrapper}>
                        <img
                          src={img.imageUrl}
                          alt={img.altText || product.name}
                          className={styles.thumbnail}
                          loading="lazy"
                        />

                        {img.isMain && (
                          <div className={styles.mainBadge}>
                            <Star size={12} fill="currentColor" />
                            <span>
                              {group.colorId
                                ? 'Ảnh chính màu này'
                                : 'Ảnh chính chung'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className={styles.cardActions}>
                        {isAdmin && (
                          <>
                            {!img.isMain && (
                              <button
                                type="button"
                                className={styles.setMainBtn}
                                onClick={() => handleSetMainImage(img)}
                                disabled={actionImageId === img.id}
                              >
                                <Star size={14} />
                                <span>Đặt làm ảnh chính</span>
                              </button>
                            )}

                            {/* Dropdown đổi màu */}
                            <div className={styles.colorSelectWrapper}>
                              <select
                                value={img.colorId ?? ''}
                                onChange={(e) =>
                                  handleChangeColor(
                                    img,
                                    e.target.value ? Number(e.target.value) : null,
                                  )
                                }
                                disabled={actionImageId === img.id}
                                className={styles.inlineColorSelect}
                                title="Đổi màu sắc của ảnh"
                              >
                                <option value="">-- Chưa gắn màu --</option>
                                {lookups.colors.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              className={styles.deleteBtn}
                              onClick={() => handleOpenDelete(img)}
                              disabled={actionImageId === img.id}
                              title={
                                isLastImageOfActiveProduct
                                  ? 'Sản phẩm đang bán yêu cầu giữ ít nhất 1 ảnh'
                                  : 'Xóa ảnh'
                              }
                              aria-label="Xóa ảnh"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal Xác nhận Xóa ảnh */}
      <Modal
        isOpen={Boolean(deletingImage)}
        onClose={handleCloseDelete}
        title="Xác nhận xóa hình ảnh"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={handleCloseDelete}
              disabled={isDeleting}
            >
              {isLastImageOfActiveProduct ? 'Đóng' : 'Hủy'}
            </Button>
            <Button
              variant="primary"
              className={styles.dangerBtn}
              onClick={handleConfirmDelete}
              disabled={isDeleting || isLastImageOfActiveProduct}
              leftIcon={<Trash2 size={16} />}
            >
              {isDeleting ? 'Đang xóa...' : 'Xóa hình ảnh'}
            </Button>
          </>
        }
      >
        <div className={styles.deleteModalBody}>
          {deleteError && (
            <div className={styles.errorBox} role="alert">
              <AlertCircle size={18} className={styles.errorIcon} />
              <span>{deleteError}</span>
            </div>
          )}

          {isLastImageOfActiveProduct && (
            <div className={styles.warningBox} role="alert">
              <AlertTriangle size={18} className={styles.warningIcon} />
              <span>
                Sản phẩm đang bán nên cần giữ ít nhất 1 hình ảnh. Hãy chuyển sản phẩm về bản nháp/lưu trữ, hoặc thêm ảnh mới trước khi xóa ảnh này.
              </span>
            </div>
          )}

          {deletingImage && (
            <img
              src={deletingImage.imageUrl}
              alt="Ảnh cần xóa"
              className={styles.deletePreview}
            />
          )}
          <p>
            Bạn có chắc chắn muốn xóa hình ảnh này khỏi sản phẩm? Nếu sản phẩm đang hoạt
            động, bạn không thể xóa hình ảnh cuối cùng.
          </p>
        </div>
      </Modal>
    </div>
  )
}
