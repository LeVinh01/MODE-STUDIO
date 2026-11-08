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
  removeCartItem,
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

  const handleClose = () => {
    dispatch(setCartDrawerOpen(false))
  }

  const handleViewCart = () => {
    handleClose()
    navigate('/cart')
  }

  const handleCheckout = () => {
    handleClose()
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
        itemsCount > 0 ? `${itemsCount} sản phẩm` : undefined
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
                disabled={hasUnpurchasableItems}
              >
                Tiến Hành Đặt Hàng
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
          {items.map((item) => (
            <li key={item.id} className={styles.cartItem}>
              <Link
                to={`/products/${item.product.slug}`}
                onClick={handleClose}
                className={styles.itemImageLink}
                aria-label={`Xem chi tiết ${item.product.name}`}
              >
                {item.product.mainImage?.url ? (
                  <img
                    src={item.product.mainImage.url}
                    alt={item.product.mainImage.altText || item.product.name}
                    className={styles.itemImage}
                    loading="lazy"
                  />
                ) : (
                  <div className={styles.imagePlaceholder} aria-hidden="true">
                    MODE
                  </div>
                )}
              </Link>

              <div className={styles.itemDetails}>
                <Link
                  to={`/products/${item.product.slug}`}
                  onClick={handleClose}
                  className={styles.itemName}
                >
                  {item.product.name}
                </Link>

                <div className={styles.itemMeta}>
                  <span>{item.variant.color.name}</span>
                  <span>/</span>
                  <span>Size {item.variant.size.name}</span>
                  <span>/</span>
                  <span>SL: {item.quantity}</span>
                </div>

                {!item.isPurchasable && (
                  <span className={styles.unpurchasableWarning}>
                    {item.unpurchasableReason || 'Sản phẩm tạm ngừng kinh doanh'}
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
                    aria-label={`Xóa ${item.product.name} khỏi giỏ hàng`}
                  >
                    {updatingItemId === item.id ? 'Đang xóa...' : 'Xóa'}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  )
}

export default CartDrawer
