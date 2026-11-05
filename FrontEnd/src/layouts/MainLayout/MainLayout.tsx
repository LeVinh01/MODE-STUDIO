import { Link, Outlet } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { toggleCartDrawer } from '@/store/slices/uiSlice'
import styles from './MainLayout.module.scss'

export const MainLayout = () => {
  const dispatch = useAppDispatch()
  const isCartDrawerOpen = useAppSelector((state) => state.ui.isCartDrawerOpen)

  return (
    <div className={styles.layoutStorefront}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          MODE STUDIO
        </Link>

        <nav className={styles.nav}>
          <Link to="/" className={styles.navLink}>
            Home
          </Link>
          <Link to="/products" className={styles.navLink}>
            Collections
          </Link>
          <Link to="/cart" className={styles.navLink}>
            Bag
          </Link>
          <Link to="/checkout" className={styles.navLink}>
            Checkout
          </Link>
          <Link to="/admin" className={styles.adminLink}>
            Admin
          </Link>
          <button
            type="button"
            onClick={() => dispatch(toggleCartDrawer())}
            aria-label="Toggle cart drawer"
            className={styles.cartButton}
          >
            <ShoppingBag size={20} />
          </button>
        </nav>
      </header>

      {isCartDrawerOpen && (
        <aside className={styles.cartDrawer}>
          <div className={styles.drawerHeader}>
            <h3 className={styles.drawerTitle}>Shopping Bag</h3>
            <button
              type="button"
              onClick={() => dispatch(toggleCartDrawer())}
              aria-label="Close cart drawer"
              className={styles.closeButton}
            >
              ✕
            </button>
          </div>
          <p className={styles.drawerEmpty}>Your bag is currently empty.</p>
        </aside>
      )}

      <main className={styles.mainContent}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} MODE STUDIO. Curated Luxury & Editorial Fashion.</p>
      </footer>
    </div>
  )
}

export default MainLayout
