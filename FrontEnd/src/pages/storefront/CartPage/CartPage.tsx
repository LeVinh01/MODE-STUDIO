import { Link } from 'react-router-dom'

export const CartPage = () => {
  return (
    <section>
      <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Shopping Bag</h2>
      <p style={{ color: '#52525b', marginBottom: '1.5rem' }}>Your shopping bag is currently empty.</p>
      <Link
        to="/products"
        style={{
          display: 'inline-block',
          padding: '0.75rem 1.5rem',
          background: '#111',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '2px',
        }}
      >
        Explore Collections
      </Link>
    </section>
  )
}

export default CartPage

