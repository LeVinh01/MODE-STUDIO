import { NavLink, Link, useLocation } from 'react-router-dom'
import { ChevronRight, User, Package, Search } from 'lucide-react'
import { Drawer } from '@/components/feedback/Drawer'
import { MAIN_NAVIGATION } from '@/config/navigation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setMobileMenuOpen } from '@/store/slices/uiSlice'
import { selectCurrentUser } from '@/store/slices/authSlice'
import { cn } from '@/utils/cn'
import styles from './MobileMenu.module.scss'

export const MobileMenu = () => {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const user = useAppSelector(selectCurrentUser)
  const isOpen = useAppSelector((state) => state.ui.isMobileMenuOpen)

  const handleClose = () => {
    dispatch(setMobileMenuOpen(false))
  }

  const searchLink =
    location.pathname === '/search'
      ? `${location.pathname}${location.search}`
      : '/search'

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      position="left"
      size="sm"
      title="MODE STUDIO"
      footer={
        <div className={styles.footerActions}>
          {user ? (
            <>
              <Link
                to="/account"
                onClick={handleClose}
                className={styles.accountButton}
              >
                <User size={18} />
                <span>Thông tin tài khoản</span>
              </Link>
              <Link
                to="/orders"
                onClick={handleClose}
                className={styles.accountButton}
              >
                <Package size={18} />
                <span>Đơn hàng của tôi</span>
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              onClick={handleClose}
              className={styles.accountButton}
            >
              <User size={18} />
              <span>Đăng Nhập / Đăng Ký</span>
            </Link>
          )}

          {import.meta.env.VITE_SHOW_DEV_SHORTCUTS === 'true' && (
            <div className={styles.devRow}>
              <Link
                to="/admin"
                onClick={handleClose}
                className={styles.devLink}
              >
                Khu Vực Quản Trị
              </Link>
              <Link
                to="/design-system"
                onClick={handleClose}
                className={styles.devLink}
              >
                Design System
              </Link>
            </div>
          )}
        </div>
      }
    >
      <nav className={styles.nav} aria-label="Menu di động">
        <NavLink
          to={searchLink}
          onClick={handleClose}
          className={({ isActive }) =>
            cn(styles.navLink, isActive && styles.active)
          }
        >
          <span className={styles.navLabelWithIcon}>
            <Search size={18} aria-hidden="true" />
            Tìm kiếm
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </NavLink>

        {MAIN_NAVIGATION.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={handleClose}
            className={({ isActive }) =>
              cn(styles.navLink, isActive && styles.active)
            }
          >
            <span>{item.label}</span>
            <ChevronRight size={18} aria-hidden="true" />
          </NavLink>
        ))}
      </nav>
    </Drawer>
  )
}

export default MobileMenu

