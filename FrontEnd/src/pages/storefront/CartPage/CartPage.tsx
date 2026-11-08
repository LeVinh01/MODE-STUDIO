import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/feedback/EmptyState'
import { Modal } from '@/components/feedback/Modal'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  selectCartItems,
  selectCartSubtotal,
  selectCartTotalQuantity,
  selectCartItemsCount,
  selectCartHasUnpurchasableItems,
  selectCartLoading,
  selectCartUpdatingItemId,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  fetchCart,
} from '@/store/slices/cartSlice'
import { STORE_POLICIES } from '@/config/store'
import { formatCurrency } from '@/utils/formatters'
import styles from './CartPage.module.scss'

export const CartPage = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const items = useAppSelector(selectCartItems)
  const subtotal = useAppSelector(selectCartSubtotal)
  const totalQuantity = useAppSelector(selectCartTotalQuantity)
  const itemsCount = useAppSelector(selectCartItemsCount)
  const hasUnpurchasableItems = useAppSelector(selectCartHasUnpurchasableItems)
  const isLoading = useAppSelector(selectCartLoading)
  const updatingItemId = useAppSelector(selectCartUpdatingItemId)

  // 1. Trạng thái hộp thoại xác nhận xóa toàn bộ giỏ
  const [isClearModalOpen, setIsClearModalOpen] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  // 2. Lỗi cập nhật số lượng theo từng dòng (kèm thông báo tồn kho)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

  // 3. Tính toán phí vận chuyển ước tính
  const freeThreshold = STORE_POLICIES.freeShippingThreshold
  const isFreeShipping = subtotal >= freeThreshold
  const standardShippingFee = 30000
  const estimatedShippingFee = isFreeShipping ? 0 : standardShippingFee
  const estimatedTotal = subtotal + estimatedShippingFee
  const amountToFreeShipping = Math.max(0, freeThreshold - subtotal)
  const shippingProgressPercent = Math.min(
    100,
    Math.round((subtotal / freeThreshold) * 100),
  )

  // 4. Xử lý thay đổi số lượng với cơ chế tự động đặt về mức tối đa = min(tồn kho, 20)
  const handleQuantityChange = async (itemId: string, currentQty: number, delta: number, stock: number) => {
    if (updatingItemId === itemId) return

    const maxAllowed = Math.min(Math.max(0, stock), 20)

    // Nếu tồn kho bằng 0: không cho đặt số lượng dương, nạp lại giỏ để server đánh dấu không mua được
    if (maxAllowed <= 0) {
      setRowErrors((prev) => ({
        ...prev,
        [itemId]: 'Chỉ còn 0 sản phẩm. Sản phẩm đã hết hàng.',
      }))
      dispatch(fetchCart())
      return
    }

    // Xóa thông báo lỗi cũ của dòng này
    setRowErrors((prev) => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })

    let targetQty = currentQty + delta

    // Chặn sớm ở client dựa trên tồn kho đã biết
    if (targetQty > maxAllowed) {
      setRowErrors((prev) => ({
        ...prev,
        [itemId]: `Chỉ còn ${stock} sản phẩm`,
      }))

      if (currentQty >= maxAllowed) {
        return
      }

      // TỰ ĐỘNG đặt số lượng về mức tối đa cho phép = min(tồn kho, 20) thay vì quay về giá trị cũ
      targetQty = maxAllowed
    }

    if (targetQty < 1) return

    try {
      await dispatch(
        updateCartItemQuantity({ id: itemId, quantity: targetQty }),
      ).unwrap()
    } catch (err: unknown) {
      const apiError = (err as { data?: { message?: string; available_stock?: number; errors?: { quantity?: string[] } } })?.data
      const availableStock = apiError?.available_stock
      const quantityError = apiError?.errors?.quantity?.[0]

      if (availableStock !== undefined) {
        if (availableStock <= 0) {
          setRowErrors((prev) => ({
            ...prev,
            [itemId]: 'Chỉ còn 0 sản phẩm. Sản phẩm đã hết hàng.',
          }))
          dispatch(fetchCart())
        } else {
          const serverMaxAllowed = Math.min(availableStock, 20)
          setRowErrors((prev) => ({
            ...prev,
            [itemId]: `Chỉ còn ${availableStock} sản phẩm`,
          }))
          // Tự động đặt số lượng về mức tối đa cho phép trên server
          try {
            await dispatch(
              updateCartItemQuantity({ id: itemId, quantity: serverMaxAllowed }),
            ).unwrap()
          } catch {
            dispatch(fetchCart())
          }
        }
      } else if (quantityError) {
        setRowErrors((prev) => ({
          ...prev,
          [itemId]: quantityError,
        }))
        dispatch(fetchCart())
      } else {
        setRowErrors((prev) => ({
          ...prev,
          [itemId]: apiError?.message || 'Không thể cập nhật số lượng.',
        }))
        dispatch(fetchCart())
      }
    }
  }

  // 5. Xóa từng dòng
  const handleRemoveItem = async (itemId: string) => {
    if (updatingItemId === itemId) return
    try {
      await dispatch(removeCartItem(itemId)).unwrap()
    } catch {
      // Ignored
    }
  }

  // 6. Xóa toàn bộ giỏ hàng
  const handleConfirmClearCart = async () => {
    setIsClearing(true)
    try {
      await dispatch(clearCart()).unwrap()
      setIsClearModalOpen(false)
    } finally {
      setIsClearing(false)
    }
  }

  // =========================================================================
  // GIAO DIỆN KHI GIỎ HÀNG TRỐNG
  // =========================================================================
  if (items.length === 0 && !isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <div className={styles.titleSection}>
              <h1 className={styles.pageTitle}>Túi Mua Sắm</h1>
              <span className={styles.itemCountText}>0 loại sản phẩm</span>
            </div>
          </div>

          <EmptyState
            icon={<ShoppingBag size={56} strokeWidth={1} />}
            title="Túi Mua Sắm Của Quý Khách Đang Trống"
            description="Hãy khám phá những thiết kế may đo cao cấp và trang phục tối giản mới nhất từ MODE STUDIO."
            action={
              <Button to="/products" variant="primary" size="md">
                Khám Phá Bộ Sưu Tập
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header trang giỏ hàng */}
        <header className={styles.pageHeader}>
          <div className={styles.titleSection}>
            <h1 className={styles.pageTitle}>Túi Mua Sắm</h1>
            <span className={styles.itemCountText}>
              {itemsCount} loại sản phẩm, tổng {totalQuantity} sản phẩm
            </span>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              className={styles.clearCartButton}
              onClick={() => setIsClearModalOpen(true)}
              aria-label="Xóa tất cả sản phẩm khỏi giỏ hàng"
            >
              Xóa toàn bộ giỏ hàng
            </button>
          )}
        </header>

        {/* Bố cục 2 cột */}
        <div className={styles.cartLayout}>
          {/* CỘT TRÁI: DANH SÁCH MÓN HÀNG */}
          <section aria-label="Danh sách sản phẩm trong giỏ hàng">
            <ul className={styles.cartItemsList}>
              {items.map((item) => {
                const maxStock = item.variant.stockQuantity
                const isUpdating = updatingItemId === item.id
                const isOutOfStock = maxStock <= 0
                const isRowUnpurchasable = !item.isPurchasable || isOutOfStock

                return (
                  <li
                    key={item.id}
                    className={`${styles.cartRow} ${
                      isRowUnpurchasable ? styles.cartRowUnpurchasable : ''
                    }`}
                  >
                    {/* Ảnh sản phẩm */}
                    <Link
                      to={`/products/${item.product.slug}`}
                      className={styles.imageLink}
                      aria-label={`Xem chi tiết thiết kế ${item.product.name}`}
                    >
                      {item.product.mainImage?.url ? (
                        <img
                          src={item.product.mainImage.url}
                          alt={
                            item.product.mainImage.altText || item.product.name
                          }
                          className={styles.itemImage}
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className={styles.imagePlaceholder}
                          aria-hidden="true"
                        >
                          MODE
                        </div>
                      )}
                    </Link>

                    {/* Chi tiết sản phẩm */}
                    <div className={styles.itemDetails}>
                      <Link
                        to={`/products/${item.product.slug}`}
                        className={styles.itemName}
                      >
                        {item.product.name}
                      </Link>

                      <div className={styles.itemVariants}>
                        <span>Màu sắc: {item.variant.color.name}</span>
                        <span>•</span>
                        <span>Kích cỡ: {item.variant.size.name}</span>
                      </div>

                      <span className={styles.itemSku}>SKU: {item.variant.sku}</span>

                      <span className={styles.itemUnitPrice}>
                        Đơn giá: {formatCurrency(item.unitPrice)}
                      </span>

                      {/* Cảnh báo không mua được */}
                      {isRowUnpurchasable && (
                        <div className={styles.unpurchasableBanner} role="alert">
                          <span className={styles.unpurchasableTitle}>
                            Không thể mua sản phẩm này
                          </span>
                          <span className={styles.unpurchasableReason}>
                            {isOutOfStock
                              ? 'Sản phẩm đã hết hàng. Món này không được tính vào tạm tính.'
                              : (item.unpurchasableReason ||
                                  'Sản phẩm tạm ngừng kinh doanh hoặc hết hàng. Món này không được tính vào tạm tính.')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Stepper số lượng & Nút xóa */}
                    <div className={styles.quantityWrapper}>
                      <div
                        className={styles.stepper}
                        role="group"
                        aria-label={`Điều chỉnh số lượng cho ${item.product.name}`}
                      >
                        <button
                          type="button"
                          className={styles.stepperButton}
                          onClick={() =>
                            handleQuantityChange(
                              item.id,
                              item.quantity,
                              -1,
                              maxStock,
                            )
                          }
                          disabled={item.quantity <= 1 || isUpdating || isOutOfStock}
                          aria-label={`Giảm số lượng ${item.product.name}`}
                        >
                          <Minus size={14} />
                        </button>

                        <span
                          className={styles.stepperValue}
                          aria-live="polite"
                          aria-atomic="true"
                        >
                          {isOutOfStock ? 0 : item.quantity}
                        </span>

                        <button
                          type="button"
                          className={styles.stepperButton}
                          onClick={() =>
                            handleQuantityChange(
                              item.id,
                              item.quantity,
                              1,
                              maxStock,
                            )
                          }
                          disabled={
                            item.quantity >= 20 ||
                            item.quantity >= maxStock ||
                            isUpdating ||
                            isOutOfStock
                          }
                          aria-label={`Tăng số lượng ${item.product.name}`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {/* Thành tiền */}
                      <span className={styles.rowTotal}>
                        {formatCurrency(item.lineTotal)}
                      </span>

                      {/* Nút xóa */}
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={isUpdating}
                        aria-label={`Xóa ${item.product.name} khỏi giỏ hàng`}
                      >
                        <Trash2 size={13} aria-hidden="true" />
                        <span>{isUpdating ? 'Đang cập nhật...' : 'Xóa món'}</span>
                      </button>
                    </div>

                    {/* Lỗi tồn kho của dòng nếu có */}
                    {rowErrors[item.id] && (
                      <div className={styles.rowError} role="alert">
                        {rowErrors[item.id]}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          {/* CỘT PHẢI: TÓM TẮT ĐƠN HÀNG */}
          <aside
            className={styles.summaryCard}
            aria-label="Tóm tắt chi phí đơn hàng"
          >
            <h2 className={styles.summaryTitle}>Tóm Tắt Đơn Hàng</h2>

            {/* Thanh tiến trình miễn phí vận chuyển */}
            <div className={styles.shippingProgressBox}>
              {isFreeShipping ? (
                <div className={styles.shippingSuccessText}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>
                    Đơn hàng đủ điều kiện <strong>MIỄN PHÍ VẬN CHUYỂN</strong>
                  </span>
                </div>
              ) : (
                <>
                  <span className={styles.shippingProgressText}>
                    Mua thêm{' '}
                    <strong>{formatCurrency(amountToFreeShipping)}</strong> để
                    được <strong>MIỄN PHÍ VẬN CHUYỂN TOÀN QUỐC</strong>
                  </span>
                  <div
                    className={styles.progressBarTrack}
                    role="progressbar"
                    aria-valuenow={shippingProgressPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Tiến trình đạt điều kiện miễn phí vận chuyển"
                  >
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${shippingProgressPercent}%` }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Chi tiết các khoản tiền */}
            <div className={styles.summaryRows}>
              <div className={styles.summaryRow}>
                <span>Tạm tính ({itemsCount} sản phẩm)</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              <div className={styles.summaryRow}>
                <span>Phí vận chuyển</span>
                <span>
                  {isFreeShipping ? (
                    <strong style={{ color: 'var(--color-success)' }}>
                      Miễn phí
                    </strong>
                  ) : (
                    `${formatCurrency(estimatedShippingFee)} (tạm tính)`
                  )}
                </span>
              </div>

              <div className={styles.summaryRowTotal}>
                <span className={styles.totalLabel}>Tổng ước tính</span>
                <span className={styles.totalValue}>
                  {formatCurrency(estimatedTotal)}
                </span>
              </div>

              <p className={styles.estimateNote}>
                * Giá và phí vận chuyển chính thức sẽ được máy chủ xác nhận khi quý
                khách đặt hàng.
              </p>
            </div>

            {/* Nút tiến hành đặt hàng */}
            <div className={styles.checkoutActionSection}>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={
                  items.length === 0 ||
                  hasUnpurchasableItems ||
                  items.some((it) => it.variant.stockQuantity <= 0)
                }
                onClick={() => navigate('/checkout')}
              >
                Tiến Hành Đặt Hàng
              </Button>

              {(hasUnpurchasableItems ||
                items.some((it) => it.variant.stockQuantity <= 0)) && (
                <span className={styles.checkoutWarning} role="alert">
                  Vui lòng xóa các sản phẩm không còn khả dụng để tiếp tục đặt
                  hàng.
                </span>
              )}

              <Link to="/products" className={styles.continueShoppingLink}>
                Tiếp tục mua sắm
              </Link>
            </div>
          </aside>
        </div>
      </div>

      {/* Modal xác nhận xóa toàn bộ giỏ hàng */}
      <Modal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title="Xác nhận xóa giỏ hàng"
        description="Quý khách có chắc chắn muốn xóa toàn bộ sản phẩm khỏi giỏ hàng không? Thao tác này không thể hoàn tác."
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', width: '100%', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsClearModalOpen(false)}
              disabled={isClearing}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmClearCart}
              disabled={isClearing}
            >
              {isClearing ? 'Đang xóa...' : 'Xóa tất cả'}
            </Button>
          </div>
        }
      >
        <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
          Tất cả các sản phẩm đang có trong giỏ hàng sẽ bị xóa hoàn toàn khỏi tài khoản của bạn.
        </p>
      </Modal>
    </div>
  )
}

export default CartPage
