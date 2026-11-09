import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { Drawer } from '@/components/feedback/Drawer'
import { Button } from '@/components/common/Button'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCartDrawerOpen } from '@/store/slices/uiSlice'
import {
  selectCartItems,
  selectCartSubtotal,
  selectCartItemsCount,
  selectCartHasUnpurchasableItems,
  selectCartUpdatingItemId,
  selectCartIsMerging,
  selectCartNoticeMessage,
  removeCartItem,
  clearNoticeMessage,
} from '@/store/slices/cartSlice'
import { formatCurrency } from '@/utils/formatters'
import styles from './CartDrawer.module.scss'

export const CartDrawer = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const isOpen = useAppSelector((state) => state.ui.isCartDrawerOpen)
  const items = useAppSelector(selectCartItems)
  const subtotal = useAppSelector(selectCartSubtotal)
  const itemsCount = useAppSelector(selectCartItemsCount)
  const hasUnpurchasableItems = useAppSelector(selectCartHasUnpurchasableItems)
  const updatingItemId = useAppSelector(selectCartUpdatingItemId)
  const isMerging = useAppSelector(selectCartIsMerging)
  const noticeMessage = useAppSelector(selectCartNoticeMessage)

  const handleClose = () => {
    dispatch(setCartDrawerOpen(false))
  }

  const handleViewCart = () => {
    handleClose()
    navigate('/cart')
  }

  const handleCheckout = () => {
    handleClose()
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

  const handleRemoveItem = (id: string) => {
    dispatch(removeCartItem(id))
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      position="right"
      size="md"
      title="Túi Mua Sắm"
      description={
        itemsCount > 0 ? `${itemsCount} loại sản phẩm` : undefined
      }
      footer={
        items.length > 0 ? (
          <div className={styles.drawerFooter}>
            <div className={styles.subtotalRow}>
              <span className={styles.subtotalLabel}>Tạm tính</span>
              <span className={styles.subtotalValue}>
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className={styles.footerActions}>
              <Button
                variant="primary"
                fullWidth
                size="md"
                onClick={handleCheckout}
                disabled={hasUnpurchasableItems || isMerging}
              >
                {isMerging ? 'Đang đồng bộ...' : 'Tiến Hành Đặt Hàng'}
              </Button>
              <Button
                variant="secondary"
                fullWidth
                size="md"
                onClick={handleViewCart}
              >
                Xem Chi Tiết Giỏ Hàng
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      {/* Thông báo cập nhật giỏ hàng nếu có */}
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

      {items.length === 0 ? (
        <div className={styles.emptyState}>
          <ShoppingBag size={48} strokeWidth={1} aria-hidden="true" />
          <p className={styles.emptyTitle}>Túi mua sắm của quý khách đang trống</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              handleClose()
              navigate('/products')
            }}
          >
            Khám Phá Bộ Sưu Tập
          </Button>
        </div>
      ) : (
        <ul className={styles.cartList} aria-label="Danh sách món trong giỏ">
          {items.map((item) => {
            const hasProduct = Boolean(item.product)
            const productName = item.product?.name || 'Sản phẩm không còn được bán'
            const productSlug = item.product?.slug

            return (
              <li key={item.id} className={styles.cartItem}>
                {hasProduct && productSlug ? (
                  <Link
                    to={`/products/${productSlug}`}
                    onClick={handleClose}
                    className={styles.itemImageLink}
                    aria-label={`Xem chi tiết ${productName}`}
                  >
                    {item.product?.mainImage?.url ? (
                      <img
                        src={item.product.mainImage.url}
                        alt={item.product.mainImage.altText || productName}
                        className={styles.itemImage}
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.imagePlaceholder} aria-hidden="true">
                        MODE
                      </div>
                    )}
                  </Link>
                ) : (
                  <div className={styles.itemImageLink} aria-hidden="true">
                    <div className={styles.imagePlaceholder}>MODE</div>
                  </div>
                )}

                <div className={styles.itemDetails}>
                  {hasProduct && productSlug ? (
                    <Link
                      to={`/products/${productSlug}`}
                      onClick={handleClose}
                      className={styles.itemName}
                    >
                      {productName}
                    </Link>
                  ) : (
                    <span className={styles.itemName}>
                      {productName}
                    </span>
                  )}

                  <div className={styles.itemMeta}>
                    {item.variant?.color?.name && (
                      <>
                        <span>{item.variant.color.name}</span>
                        <span>/</span>
                      </>
                    )}
                    {item.variant?.size?.name && (
                      <>
                        <span>Size {item.variant.size.name}</span>
                        <span>/</span>
                      </>
                    )}
                    <span>SL: {item.quantity}</span>
                  </div>

                  {!item.isPurchasable && (
                    <span className={styles.unpurchasableWarning}>
                      {item.unpurchasableReason || 'Sản phẩm không còn được bán'}
                    </span>
                  )}

                  <div className={styles.itemPriceRow}>
                    <span className={styles.itemPrice}>
                      {formatCurrency(item.lineTotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={updatingItemId === item.id}
                      className={styles.removeButton}
                      aria-label={`Xóa ${productName} khỏi giỏ hàng`}
                    >
                      {updatingItemId === item.id ? 'Đang xóa...' : 'Xóa'}
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Drawer>
  )
}

export default CartDrawer
