import { Link, Outlet } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, Store } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { toggleAdminSidebar } from '@/store/slices/uiSlice'

export const AdminLayout = () => {
  const dispatch = useAppDispatch()
  const isAdminSidebarOpen = useAppSelector((state) => state.ui.isAdminSidebarOpen)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fafafa' }}>
      {isAdminSidebarOpen && (
        <aside
          style={{
            width: '240px',
            background: '#111111',
            color: '#ffffff',
            padding: '1.5rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          <div style={{ padding: '0 0.5rem' }}>
            <span
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
              }}
            >
              MODE ADMIN
            </span>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link
              to="/admin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: '#ece7df',
                textDecoration: 'none',
                padding: '0.5rem 0.75rem',
                borderRadius: '4px',
              }}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/admin/products"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: '#ece7df',
                textDecoration: 'none',
                padding: '0.5rem 0.75rem',
                borderRadius: '4px',
              }}
            >
              <Package size={18} />
              <span>Products</span>
            </Link>
            <Link
              to="/admin/orders"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: '#ece7df',
                textDecoration: 'none',
                padding: '0.5rem 0.75rem',
                borderRadius: '4px',
              }}
            >
              <ShoppingCart size={18} />
              <span>Orders</span>
            </Link>
          </nav>

          <div style={{ marginTop: 'auto', borderTop: '1px solid #333', paddingTop: '1rem' }}>
            <Link
              to="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: '#a1a1aa',
                textDecoration: 'none',
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
              }}
            >
              <Store size={18} />
              <span>Back to Store</span>
            </Link>
          </div>
        </aside>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e4e4e7',
            padding: '1rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            type="button"
            onClick={() => dispatch(toggleAdminSidebar())}
            style={{
              background: '#f4f4f5',
              border: '1px solid #e4e4e7',
              padding: '0.4rem 0.8rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {isAdminSidebarOpen ? 'Hide Menu' : 'Show Menu'}
          </button>
          <span style={{ fontSize: '0.875rem', color: '#52525b' }}>Operations & Management</span>
        </header>

        <main style={{ padding: '2rem', flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout

