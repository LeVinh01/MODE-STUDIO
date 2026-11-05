import { Link, Outlet } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, Store } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { toggleAdminSidebar } from '@/store/slices/uiSlice'
import styles from './AdminLayout.module.scss'

export const AdminLayout = () => {
  const dispatch = useAppDispatch()
  const isAdminSidebarOpen = useAppSelector((state) => state.ui.isAdminSidebarOpen)

  return (
    <div className={styles.layoutAdmin}>
      {isAdminSidebarOpen && (
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <span className={styles.brandText}>MODE ADMIN</span>
          </div>

          <nav className={styles.nav}>
            <Link to="/admin" className={styles.navItem}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>
            <Link to="/admin/products" className={styles.navItem}>
              <Package size={18} />
              <span>Products</span>
            </Link>
            <Link to="/admin/orders" className={styles.navItem}>
              <ShoppingCart size={18} />
              <span>Orders</span>
            </Link>
          </nav>

          <div className={styles.sidebarFooter}>
            <Link to="/" className={styles.backLink}>
              <Store size={18} />
              <span>Back to Store</span>
            </Link>
          </div>
        </aside>
      )}

      <div className={styles.contentWrapper}>
        <header className={styles.header}>
          <button
            type="button"
            onClick={() => dispatch(toggleAdminSidebar())}
            className={styles.toggleButton}
          >
            {isAdminSidebarOpen ? 'Hide Menu' : 'Show Menu'}
          </button>
          <span className={styles.headerSubtitle}>Operations &amp; Management</span>
        </header>

        <main className={styles.mainBody}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
