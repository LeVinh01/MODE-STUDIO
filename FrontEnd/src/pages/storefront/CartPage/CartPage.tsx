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
  selectCartIsMerging,
  selectCartNoticeMessage,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  fetchCart,
  clearNoticeMessage,
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
  const isMerging = useAppSelector(selectCartIsMerging)
  const noticeMessage = useAppSelector(selectCartNoticeMessage)

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
        updateCartItemQuantity({
          id: itemId,
          quantity: targetQty,
          stockQuantity: stock,
        }),
      ).unwrap()
    } catch (err: unknown) {
      const errorObj = err as {
        id?: string
        data?: {
          message?: string
          errors?: { quantity?: string[] }
          available_stock?: number
        }
      }
      const data = errorObj.data
      if (data?.available_stock !== undefined) {
        if (data.available_stock <= 0) {
          setRowErrors((prev) => ({
            ...prev,
            [itemId]: 'Chỉ còn 0 sản phẩm. Sản phẩm đã hết hàng.',
          }))
        } else {
          // Tự động điều chỉnh về số tồn khả dụng tối đa được máy chủ trả về
          const serverMaxAllowed = Math.min(data.available_stock, 20)
          setRowErrors((prev) => ({
            ...prev,
            [itemId]: `Chỉ còn ${data.available_stock} sản phẩm. Đã tự động điều chỉnh số lượng.`,
          }))
          // Gọi cập nhật lại mức cho phép
          dispatch(
            updateCartItemQuantity({
              id: itemId,
              quantity: serverMaxAllowed,
              stockQuantity: data.available_stock,
            }),
          )
        }
      } else if (data?.errors?.quantity?.[0]) {
        setRowErrors((prev) => ({
          ...prev,
          [itemId]: data.errors!.quantity![0],
        }))
      } else {
        setRowErrors((prev) => ({
          ...prev,
          [itemId]: data?.message || 'Không thể cập nhật số lượng.',
        }))
      }
    }
  }

  // 5. Xử lý xóa một dòng
  const handleRemoveItem = async (itemId: string) => {
    try {
      await dispatch(removeCartItem(itemId)).unwrap()
    } catch {
      // Đã bắt lỗi tại thunk
    }
  }

  // 6. Xử lý xóa toàn bộ giỏ
  const handleConfirmClearCart = async () => {
    setIsClearing(true)
    try {
      await dispatch(clearCart()).unwrap()
      setIsClearModalOpen(false)
    } finally {
      setIsClearing(false)
    }
  }

  // 7. Xử lý tiến hành đặt hàng
  const handleCheckout = () => {
    const token = localStorage.getItem('mode_studio_token')
    if (!token) {
      // Yêu cầu 5: Khách chưa đăng nhập bấm thì chuyển sang /login kèm state.from về /cart
      navigate('/login', {
        state: { from: { pathname: '/cart' } },
      })
      return
    }
    navigate('/checkout')
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* TIÊU ĐỀ TRANG */}
        <header className={styles.pageHeader}>
          <div className={styles.titleSection}>
            <h1 className={styles.pageTitle}>Giỏ Hàng Của Quý Khách</h1>
            {itemsCount > 0 && (
              <span className={styles.itemCountText}>
                {itemsCount} loại sản phẩm, tổng {totalQuantity} sản phẩm
              </span>
            )}
          </div>

          {itemsCount > 0 && (
            <button
              type="button"
              className={styles.clearCartButton}
              onClick={() => setIsClearModalOpen(true)}
            >
              Làm trống giỏ hàng
            </button>
          )}
        </header>

        {/* THÔNG BÁO CẬP NHẬT NẾU CÓ */}
        {noticeMessage && (
          <div className={styles.noticeBanner} role="alert">
            <span>{noticeMessage}</span>
            <button
              type="button"
              onClick={() => dispatch(clearNoticeMessage())}
              className={styles.noticeCloseBtn}
              aria-label="Đóng thông báo"
            >
              ×
            </button>
          </div>
        )}

        {/* TRẠNG THÁI GIỎ HÀNG TRỐNG */}
        {items.length === 0 && !isLoading ? (
          <EmptyState
            icon={<ShoppingBag size={48} strokeWidth={1} />}
            title="Túi mua sắm đang trống"
            description="Quý khách chưa có sản phẩm nào trong túi mua sắm. Khám phá các thiết kế mới nhất của MODE STUDIO ngay hôm nay."
            action={
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate('/products')}
              >
                Khám Phá Sản Phẩm
              </Button>
            }
          />
        ) : (
          <div className={styles.cartLayout}>
            {/* CỘT TRÁI: DANH SÁCH MÓN TRONG GIỎ */}
            <section
              className={styles.cartItemsSection}
              aria-label="Danh sách món trong giỏ hàng"
            >
              <ul className={styles.cartItemsList}>
                {items.map((item) => {
                  const isRowUnpurchasable = !item.isPurchasable
                  const isUpdating = updatingItemId === item.id
                  const isOutOfStock = (item.variant?.stockQuantity ?? 0) <= 0
                  const maxStock = item.variant?.stockQuantity ?? 0

                  const hasProduct = Boolean(item.product)
                  const productName = item.product?.name || 'Sản phẩm không còn được bán'
                  const productSlug = item.product?.slug

                  return (
                    <li
                      key={item.id}
                      className={`${styles.cartRow} ${
                        isRowUnpurchasable ? styles.cartRowUnpurchasable : ''
                      }`}
                    >
                      {/* Ảnh sản phẩm */}
                      {hasProduct && productSlug ? (
                        <Link
                          to={`/products/${productSlug}`}
                          className={styles.imageLink}
                          aria-label={`Xem chi tiết thiết kế ${productName}`}
                        >
                          {item.product?.mainImage?.url ? (
                            <img
                              src={item.product.mainImage.url}
                              alt={
                                item.product.mainImage.altText || productName
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
                      ) : (
                        <div
                          className={styles.imageLink}
                          aria-hidden="true"
                        >
                          <div className={styles.imagePlaceholder}>
                            MODE
                          </div>
                        </div>
                      )}

                      {/* Chi tiết sản phẩm */}
                      <div className={styles.itemDetails}>
                        {hasProduct && productSlug ? (
                          <Link
                            to={`/products/${productSlug}`}
                            className={styles.itemName}
                          >
                            {productName}
                          </Link>
                        ) : (
                          <span className={styles.itemName}>
                            {productName}
                          </span>
                        )}

                        <div className={styles.itemVariants}>
                          {item.variant?.color?.name && (
                            <span>Màu sắc: {item.variant.color.name}</span>
                          )}
                          {item.variant?.color?.name && item.variant?.size?.name && (
                            <span>•</span>
                          )}
                          {item.variant?.size?.name && (
                            <span>Kích cỡ: {item.variant.size.name}</span>
                          )}
                        </div>

                        {item.variant?.sku && (
                          <span className={styles.itemSku}>SKU: {item.variant.sku}</span>
                        )}

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
                                    'Sản phẩm không còn được bán hoặc tạm ngừng kinh doanh.')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Stepper số lượng & Nút xóa */}
                      <div className={styles.quantityWrapper}>
                        <div
                          className={styles.stepper}
                          role="group"
                          aria-label={`Điều chỉnh số lượng cho ${productName}`}
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
                            aria-label={`Giảm số lượng ${productName}`}
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
                            aria-label={`Tăng số lượng ${productName}`}
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
                          aria-label={`Xóa ${productName} khỏi giỏ hàng`}
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
                  {/* Yêu cầu 9: Dòng Tạm tính ghi theo TỔNG số lượng */}
                  <span>Tạm tính ({totalQuantity} sản phẩm)</span>
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
                    isMerging ||
                    items.some((it) => (it.variant?.stockQuantity ?? 0) <= 0)
                  }
                  onClick={handleCheckout}
                >
                  {isMerging ? 'Đang đồng bộ...' : 'Tiến Hành Đặt Hàng'}
                </Button>
                <p className={styles.securityNote}>
                  Giao dịch an toàn &amp; Bảo mật thông tin khách hàng
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* MODAL XÁC NHẬN LÀM TRỐNG GIỎ HÀNG */}
      <Modal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title="Làm Trống Giỏ Hàng"
        size="sm"
        footer={
          <div className={styles.modalActions}>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsClearModalOpen(false)}
              disabled={isClearing}
            >
              Hủy Bỏ
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirmClearCart}
              isLoading={isClearing}
            >
              Xác Nhận Xóa
            </Button>
          </div>
        }
      >
        <p className={styles.modalText}>
          Quý khách có chắc chắn muốn xóa toàn bộ sản phẩm khỏi giỏ hàng? Thao
          tác này không thể khôi phục lại.
        </p>
      </Modal>
    </main>
  )
}

export default CartPage
