import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, User, Package, Search } from 'lucide-react'
import { BRAND_NAME, BRAND_LOGOS } from '@/config/brand'
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
  const [logoFailed, setLogoFailed] = useState(false)

  const handleClose = () => {
    dispatch(setMobileMenuOpen(false))
  }

  const searchLink =
    location.pathname === '/search'
      ? `${location.pathname}${location.search}`
      : '/search'

  const pathname = location.pathname
  const search = location.search

  const isItemActive = (to: string) => {
    if (to === '/') {
      return pathname === '/' || pathname === '/nu'
    }
    if (to === '/nam') {
      return pathname === '/nam'
    }
    if (to.includes('category=accessories')) {
      return pathname === '/products' && search.includes('category=accessories')
    }
    return pathname === to
  }

  const drawerTitle = !logoFailed ? (
    <img
      src={BRAND_LOGOS.cream}
      alt={BRAND_NAME}
      width={70}
      height={44}
      style={{ height: 38, width: 'auto', objectFit: 'contain' }}
      onError={() => setLogoFailed(true)}
    />
  ) : (
    <span>{BRAND_NAME}</span>
  )

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      position="left"
      size="sm"
      title={drawerTitle}
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
                to="/account/orders"
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
        <Link
          to={searchLink}
          onClick={handleClose}
          className={cn(styles.navLink, pathname === '/search' && styles.active)}
        >
          <span className={styles.navLabelWithIcon}>
            <Search size={18} aria-hidden="true" />
            Tìm kiếm
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </Link>

        {MAIN_NAVIGATION.map((item) => {
          const active = isItemActive(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={handleClose}
              className={cn(styles.navLink, active && styles.active)}
              aria-current={active ? 'page' : undefined}
            >
              <span>{item.label}</span>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          )
        })}
      </nav>
    </Drawer>
  )
}

export default MobileMenu

