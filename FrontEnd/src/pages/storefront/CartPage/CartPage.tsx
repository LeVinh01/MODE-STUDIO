import { Button } from '@/components/common/Button'

export const CartPage = () => {
  return (
    <section>
      <h2>Giỏ Hàng / Shopping Bag</h2>
      <p
        style={{
          color: 'var(--color-text-secondary)',
          marginTop: 'var(--space-2)',
          marginBottom: 'var(--space-6)',
        }}
      >
        Hiện tại giỏ hàng của bạn đang trống.
      </p>
      <Button to="/products" variant="primary" size="md">
        Khám Phá Bộ Sưu Tập
      </Button>
    </section>
  )
}

export default CartPage
