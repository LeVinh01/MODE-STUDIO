import { Link } from 'react-router-dom'

export const CartPage = () => {
  return (
    <section>
      <h2>Giỏ Hàng / Shopping Bag</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        Hiện tại giỏ hàng của bạn đang trống.
      </p>
      <Link
        to="/products"
        style={{
          display: 'inline-block',
          padding: 'var(--space-3) var(--space-6)',
          backgroundColor: 'var(--color-black)',
          color: 'var(--color-white)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.875rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        Khám Phá Bộ Sưu Tập
      </Link>
    </section>
  )
}

export default CartPage
