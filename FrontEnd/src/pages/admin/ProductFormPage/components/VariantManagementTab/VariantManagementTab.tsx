import { useState, useMemo } from 'react'
import {
  Plus,
  Edit2,
  PackagePlus,
  History,
  Trash2,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react'
import { adminProductService } from '@/services/api/adminProductService'
import type {
  AdminLookups,
  AdminProductDetail,
  AdminVariantItem,
} from '@/types/adminProduct'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { getApiErrorMessage } from '@/utils'
import { Button, Badge } from '@/components/common'
import { Modal, EmptyState } from '@/components/feedback'
import { RowActionsMenu, StockAdjustmentModal, StockHistoryModal } from '@/components/admin'
import type { RowActionMenuItem } from '@/components/admin'
import { VariantModal } from '../VariantModal/VariantModal'
import styles from './VariantManagementTab.module.scss'

export interface VariantManagementTabProps {
  product: AdminProductDetail
  lookups: AdminLookups
  isAdmin: boolean
  onVariantSaved: (variant: AdminVariantItem, isRestored: boolean) => void
  onVariantRemoved: (variantId: number) => void
  onStockAdjusted: (variantId: number, quantityAfter: number) => void
  onRefetchDetail: () => Promise<AdminProductDetail | null>
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

export const VariantManagementTab = ({
  product,
  lookups,
  isAdmin,
  onVariantSaved,
  onVariantRemoved,
  onStockAdjusted,
  onRefetchDetail,
  onToast,
}: VariantManagementTabProps) => {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // Modals state
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<AdminVariantItem | null>(null)

  const [isStockModalOpen, setIsStockModalOpen] = useState(false)
  const [stockVariant, setStockVariant] = useState<AdminVariantItem | null>(null)

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [historyVariant, setHistoryVariant] = useState<AdminVariantItem | null>(null)

  // Delete modal state
  const [deletingVariant, setDeletingVariant] = useState<AdminVariantItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Cảnh báo UX: sản phẩm đang ACTIVE không được xóa biến thể đang bán cuối cùng
  const activeSellingCount = useMemo(
    () => product.variants.filter((v) => !v.deletedAt && v.isActive).length,
    [product.variants],
  )
  const isLastActiveVariantOfActiveProduct =
    product.status === 'active' &&
    Boolean(deletingVariant?.isActive) &&
    activeSellingCount <= 1

  // Active Kebab Menu Key: `${source}-${variantId}`
  const [activeMenuKey, setActiveMenuKey] = useState<string | null>(null)

  // Chỉ hiển thị các biến thể chưa bị xóa mềm
  const activeVariants = product.variants.filter((v) => !v.deletedAt)

  // Thêm mới biến thể
  const handleOpenCreate = () => {
    setEditingVariant(null)
    setIsVariantModalOpen(true)
  }

  // Chỉnh sửa biến thể
  const handleOpenEdit = (v: AdminVariantItem) => {
    setEditingVariant(v)
    setIsVariantModalOpen(true)
  }

  // Điều chỉnh tồn kho: lấy dữ liệu mới nhất
  const handleOpenStock = async (v: AdminVariantItem) => {
    setStockVariant(v)
    setIsStockModalOpen(true)
    // Refetch ngầm để đảm bảo tồn kho mới nhất
    const fresh = await onRefetchDetail()
    if (fresh) {
      const freshVar = fresh.variants.find((item) => item.id === v.id)
      if (freshVar) {
        setStockVariant(freshVar)
      }
    }
  }

  // Mở lịch sử tồn kho
  const handleOpenHistory = (v: AdminVariantItem) => {
    setHistoryVariant(v)
    setIsHistoryModalOpen(true)
  }

  // Mở modal xác nhận xóa
  const handleOpenDelete = (v: AdminVariantItem) => {
    setDeletingVariant(v)
    setDeleteError(null)
  }

  const handleCloseDelete = () => {
    if (isDeleting) return
    setDeletingVariant(null)
    setDeleteError(null)
  }

  // Xác nhận xóa biến thể
  const handleConfirmDelete = async () => {
    if (!deletingVariant || !isAdmin) return

    if (isLastActiveVariantOfActiveProduct) {
      setDeleteError(
        'Sản phẩm đang hoạt động nên cần giữ ít nhất 1 biến thể đang bán. Hãy chuyển sản phẩm về bản nháp hoặc lưu trữ trước khi xóa biến thể này.',
      )
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    try {
      await adminProductService.deleteVariant(deletingVariant.id)
      onVariantRemoved(deletingVariant.id)
      onToast('Đã xóa biến thể sản phẩm thành công.', 'success')
      setDeletingVariant(null)
      setDeleteError(null)
      onRefetchDetail()
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Không thể xóa biến thể. Vui lòng thử lại.')
      setDeleteError(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  // Callback khi lưu biến thể thành công
  const handleVariantModalSuccess = (
    savedVariant: AdminVariantItem,
    isRestored: boolean,
  ) => {
    onVariantSaved(savedVariant, isRestored)
    if (isRestored) {
      onToast(
        'Đã khôi phục biến thể trước đó và cập nhật thông tin mới.',
        'success',
      )
    } else if (editingVariant) {
      onToast('Đã cập nhật biến thể thành công.', 'success')
    } else {
      onToast('Đã tạo biến thể mới thành công.', 'success')
    }
    onRefetchDetail()
  }

  // Callback khi điều chỉnh tồn kho thành công
  const handleStockAdjustSuccess = (
    variantId: number,
    quantityAfter: number,
  ) => {
    onStockAdjusted(variantId, quantityAfter)
    onToast(`Đã cập nhật tồn kho thành công (${quantityAfter} sản phẩm).`, 'success')
    onRefetchDetail()
  }

  // Tạo menu thao tác cho từng dòng
  const getMenuItems = (v: AdminVariantItem): RowActionMenuItem[] => {
    return [
      {
        key: 'edit',
        label: 'Sửa biến thể',
        icon: <Edit2 size={16} />,
        onClick: () => handleOpenEdit(v),
      },
      {
        key: 'stock',
        label: 'Điều chỉnh tồn kho',
        icon: <PackagePlus size={16} />,
        onClick: () => handleOpenStock(v),
      },
      {
        key: 'history',
        label: 'Lịch sử tồn kho',
        icon: <History size={16} />,
        onClick: () => handleOpenHistory(v),
      },
      {
        key: 'delete',
        label: 'Xóa biến thể',
        icon: <Trash2 size={16} />,
        danger: true,
        dividerBefore: true,
        onClick: () => handleOpenDelete(v),
      },
    ]
  }

  return (
    <div className={styles.container}>
      <div className={styles.actionBar}>
        <div className={styles.titleArea}>
          <h3 className={styles.sectionTitle}>
            Danh sách biến thể ({activeVariants.length})
          </h3>
          <p className={styles.sectionSubtitle}>
            Quản lý màu sắc, kích cỡ, mã SKU, tồn kho và trạng thái bán của từng mẫu mã.
          </p>
        </div>

        {isAdmin && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Plus size={16} />}
          >
            Thêm biến thể
          </Button>
        )}
      </div>

      {activeVariants.length === 0 ? (
        <EmptyState
          title="Chưa có biến thể nào"
          description="Sản phẩm cần có ít nhất một biến thể đang hoạt động để có thể xuất bản."
          action={
            isAdmin ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleOpenCreate}
                leftIcon={<Plus size={16} />}
              >
                Thêm biến thể đầu tiên
              </Button>
            ) : undefined
          }
        />
      ) : isDesktop ? (
        /* BẢNG DESKTOP (Màn >= 768px) */
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Màu sắc</th>
                <th>Kích cỡ</th>
                <th>Mã SKU</th>
                <th>Tồn kho</th>
                <th>Trạng thái</th>
                <th>Ghi chú</th>
                <th className={styles.thActions}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {activeVariants.map((v) => {
                const menuKey = `table-${v.id}`
                return (
                  <tr key={v.id}>
                    <td>
                      <div className={styles.colorCell}>
                        <span
                          className={styles.colorSwatch}
                          style={{ backgroundColor: v.color?.hexCode || '#fff' }}
                          title={v.color?.name || 'Màu'}
                        />
                        <span>{v.color?.name || 'Chưa đặt'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.sizeBadge}>
                        {v.size?.name || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <code className={styles.skuCode}>{v.sku}</code>
                    </td>
                    <td>
                      <span
                        className={`${styles.stockBadge} ${
                          v.stockQuantity === 0
                            ? styles.outOfStock
                            : v.stockQuantity <= 5
                              ? styles.lowStock
                              : ''
                        }`}
                      >
                        {v.stockQuantity}
                      </span>
                    </td>
                    <td>
                      <Badge variant={v.isActive ? 'success' : 'default'}>
                        {v.isActive ? 'Đang bán' : 'Tạm tắt'}
                      </Badge>
                    </td>
                    <td className={styles.noteCell} title={v.note || ''}>
                      {v.note || '-'}
                    </td>
                    <td className={styles.tdActions}>
                      {isAdmin ? (
                        <div className={styles.actionsGroup}>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className={styles.quickStockBtn}
                            onClick={() => handleOpenStock(v)}
                            title="Điều chỉnh tồn kho"
                          >
                            <PackagePlus size={14} />
                            <span>Kho</span>
                          </Button>

                          <RowActionsMenu
                            items={getMenuItems(v)}
                            triggerAriaLabel={`Thao tác cho biến thể ${v.sku}`}
                            isOpen={activeMenuKey === menuKey}
                            onOpenChange={(open) =>
                              setActiveMenuKey(open ? menuKey : null)
                            }
                          />
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenHistory(v)}
                          leftIcon={<History size={14} />}
                        >
                          Lịch sử
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* THẺ CARD MOBILE (Màn < 768px) */
        <div className={styles.cardsList}>
          {activeVariants.map((v) => {
            const menuKey = `card-${v.id}`
            return (
              <div key={v.id} className={styles.variantCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.colorCell}>
                    <span
                      className={styles.colorSwatch}
                      style={{ backgroundColor: v.color?.hexCode || '#fff' }}
                      title={v.color?.name || 'Màu'}
                    />
                    <strong className={styles.colorName}>
                      {v.color?.name || 'Chưa đặt'}
                    </strong>
                    <span className={styles.sizeBadge}>{v.size?.name || 'N/A'}</span>
                  </div>

                  <Badge variant={v.isActive ? 'success' : 'default'}>
                    {v.isActive ? 'Đang bán' : 'Tạm tắt'}
                  </Badge>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Mã SKU:</span>
                    <code className={styles.skuCode}>{v.sku}</code>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Tồn kho:</span>
                    <span
                      className={`${styles.stockBadge} ${
                        v.stockQuantity === 0
                          ? styles.outOfStock
                          : v.stockQuantity <= 5
                            ? styles.lowStock
                            : ''
                      }`}
                    >
                      {v.stockQuantity} sản phẩm
                    </span>
                  </div>

                  {v.note && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Ghi chú:</span>
                      <span className={styles.cardNote}>{v.note}</span>
                    </div>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  {isAdmin ? (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className={styles.cardActionBtn}
                        onClick={() => handleOpenStock(v)}
                        leftIcon={<PackagePlus size={16} />}
                      >
                        Chỉnh kho
                      </Button>

                      <RowActionsMenu
                        items={getMenuItems(v)}
                        triggerAriaLabel={`Thao tác cho biến thể ${v.sku}`}
                        buttonSize="lg"
                        isOpen={activeMenuKey === menuKey}
                        onOpenChange={(open) =>
                          setActiveMenuKey(open ? menuKey : null)
                        }
                      />
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      fullWidth
                      onClick={() => handleOpenHistory(v)}
                      leftIcon={<History size={16} />}
                    >
                      Xem lịch sử tồn kho
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Thêm/Sửa biến thể */}
      <VariantModal
        key={editingVariant ? `edit-${editingVariant.id}` : 'create'}
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        productId={product.id}
        variant={editingVariant}
        lookups={lookups}
        existingVariants={activeVariants}
        productStatus={product.status}
        onSuccess={handleVariantModalSuccess}
      />

      {/* Modal Điều chỉnh tồn kho */}
      <StockAdjustmentModal
        key={stockVariant ? `stock-${stockVariant.id}` : 'stock-closed'}
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        variant={stockVariant}
        onSuccess={handleStockAdjustSuccess}
      />

      {/* Modal Lịch sử biến động kho */}
      <StockHistoryModal
        key={historyVariant ? `history-${historyVariant.id}` : 'history-closed'}
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        variant={historyVariant}
      />

      {/* Modal Xác nhận Xóa biến thể */}
      <Modal
        isOpen={Boolean(deletingVariant)}
        onClose={handleCloseDelete}
        title="Xác nhận xóa biến thể"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={handleCloseDelete}
              disabled={isDeleting}
            >
              {isLastActiveVariantOfActiveProduct ? 'Đóng' : 'Hủy'}
            </Button>
            <Button
              variant="primary"
              className={styles.dangerBtn}
              onClick={handleConfirmDelete}
              disabled={isDeleting || isLastActiveVariantOfActiveProduct}
              leftIcon={<Trash2 size={16} />}
            >
              {isDeleting ? 'Đang xóa...' : 'Xóa biến thể'}
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

          {isLastActiveVariantOfActiveProduct && (
            <div className={styles.warningBox} role="alert">
              <AlertTriangle size={18} className={styles.warningIcon} />
              <span>
                Sản phẩm đang hoạt động nên cần giữ ít nhất 1 biến thể đang bán. Hãy chuyển sản phẩm về bản nháp hoặc lưu trữ, hoặc kích hoạt biến thể khác trước khi xóa biến thể này.
              </span>
            </div>
          )}

          <p>
            Bạn có chắc chắn muốn xóa biến thể{' '}
            <strong>
              {deletingVariant?.color?.name} / {deletingVariant?.size?.name} (SKU:{' '}
              {deletingVariant?.sku})
            </strong>
            ? Biến thể sẽ bị gỡ khỏi sản phẩm.
          </p>
        </div>
      </Modal>
    </div>
  )
}
