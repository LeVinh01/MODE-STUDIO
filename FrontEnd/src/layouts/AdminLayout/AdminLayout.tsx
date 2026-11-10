import { Link, NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, Store, Boxes } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { toggleAdminSidebar } from '@/store/slices/uiSlice'
import { Button } from '@/components/common/Button'
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
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
              }
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to="/admin/products"
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
              }
            >
              <Package size={18} />
              <span>Sản phẩm</span>
            </NavLink>
            <NavLink
              to="/admin/orders"
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
              }
            >
              <ShoppingCart size={18} />
              <span>Đơn hàng</span>
            </NavLink>
            <NavLink
              to="/admin/inventory"
              className={({ isActive }) =>
                isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
              }
            >
              <Boxes size={18} />
              <span>Kho hàng</span>
            </NavLink>
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
          <Button
            variant="secondary"
            size="sm"
            onClick={() => dispatch(toggleAdminSidebar())}
          >
            {isAdminSidebarOpen ? 'Hide Menu' : 'Show Menu'}
          </Button>
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
