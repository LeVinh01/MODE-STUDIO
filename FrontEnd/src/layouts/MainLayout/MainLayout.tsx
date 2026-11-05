import { Link, Outlet } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { toggleCartDrawer } from '@/store/slices/uiSlice'

export const MainLayout = () => {
  const dispatch = useAppDispatch()
  const isCartDrawerOpen = useAppSelector((state) => state.ui.isCartDrawerOpen)

  return (
    <div className="layout-storefront">
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 2rem',
          borderBottom: '1px solid #e4e4e7',
        }}
      >
        <Link
          to="/"
          style={{
            fontWeight: 600,
            letterSpacing: '0.1em',
            textDecoration: 'none',
            color: '#111',
            fontSize: '1.25rem',
          }}
        >
          MODE STUDIO
        </Link>

        <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#111' }}>
            Home
          </Link>
          <Link to="/products" style={{ textDecoration: 'none', color: '#111' }}>
            Collections
          </Link>
          <Link to="/cart" style={{ textDecoration: 'none', color: '#111' }}>
            Bag
          </Link>
          <Link to="/checkout" style={{ textDecoration: 'none', color: '#111' }}>
            Checkout
          </Link>
          <Link
            to="/admin"
            style={{
              textDecoration: 'none',
              color: '#52525b',
              fontSize: '0.875rem',
            }}
          >
            Admin
          </Link>
          <button
            type="button"
            onClick={() => dispatch(toggleCartDrawer())}
            aria-label="Toggle cart drawer"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ShoppingBag size={20} />
          </button>
        </nav>
      </header>

      {isCartDrawerOpen && (
        <aside
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '320px',
            height: '100%',
            background: '#fff',
            borderLeft: '1px solid #e4e4e7',
            padding: '1.5rem',
            zIndex: 100,
            boxShadow: '-4px 0 16px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3>Shopping Bag</h3>
            <button
              type="button"
              onClick={() => dispatch(toggleCartDrawer())}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
          <p style={{ marginTop: '1rem', color: '#52525b' }}>Your bag is empty.</p>
        </aside>
      )}

      <main style={{ minHeight: '70vh', padding: '2rem' }}>
        <Outlet />
      </main>

      <footer
        style={{
          borderTop: '1px solid #e4e4e7',
          padding: '2rem',
          textAlign: 'center',
          color: '#52525b',
          fontSize: '0.875rem',
        }}
      >
        <p>© {new Date().getFullYear()} MODE STUDIO. Curated Luxury & Editorial Fashion.</p>
      </footer>
    </div>
  )
}

export default MainLayout

