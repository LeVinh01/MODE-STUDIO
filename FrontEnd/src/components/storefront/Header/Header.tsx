import { useState, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, Search, ShoppingBag, User } from 'lucide-react'
import { MAIN_NAVIGATION } from '@/config/navigation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  toggleMobileMenu,
  toggleSearch,
  toggleCartDrawer,
} from '@/store/slices/uiSlice'
import { cn } from '@/utils/cn'
import styles from './Header.module.scss'

export interface HeaderProps {
  cartCount?: number
}

export const Header = ({ cartCount = 0 }: HeaderProps) => {
  const dispatch = useAppDispatch()
  const isMobileMenuOpen = useAppSelector((state) => state.ui.isMobileMenuOpen)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <header
      className={cn(styles.header, isScrolled && styles.scrolled)}
      role="banner"
    >
      <div className={styles.inner}>
        {/* Left Section: Mobile Hamburger & Desktop Nav */}
        <div className={styles.leftSection}>
          <button
            type="button"
            onClick={() => dispatch(toggleMobileMenu())}
            aria-label="Mở menu điều hướng"
            aria-expanded={isMobileMenuOpen}
            className={styles.mobileMenuToggle}
          >
            <Menu size={22} />
          </button>

          <nav
            className={styles.desktopNav}
            aria-label="Điều hướng chính"
          >
            {MAIN_NAVIGATION.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(styles.navLink, isActive && styles.active)
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Center Section: Editorial Logo */}
        <div className={styles.centerSection}>
          <Link to="/" className={styles.logo} aria-label="MODE STUDIO Trang Chủ">
            MODE STUDIO
          </Link>
        </div>

        {/* Right Section: Quick Action Icons */}
        <div className={styles.rightSection}>
          <button
            type="button"
            onClick={() => dispatch(toggleSearch())}
            aria-label="Tìm kiếm sản phẩm"
            className={styles.actionButton}
          >
            <Search size={20} />
          </button>

          <Link
            to="/account"
            aria-label="Tài khoản khách hàng"
            className={styles.actionButton}
          >
            <User size={20} />
          </Link>

          <button
            type="button"
            onClick={() => dispatch(toggleCartDrawer())}
            aria-label={`Giỏ hàng${cartCount > 0 ? ` (${cartCount} sản phẩm)` : ''}`}
            className={styles.actionButton}
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className={styles.cartBadge} aria-hidden="true">
                {cartCount}
              </span>
            )}
          </button>

          {/* Dev-only shortcuts */}
          {import.meta.env.DEV && (
            <div className={styles.devBadgeGroup}>
              <Link to="/admin" className={styles.devLink} title="Admin Workspace">
                Admin
              </Link>
              <Link to="/design-system" className={styles.devLink} title="Design System Showcase">
                DS
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header

