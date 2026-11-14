import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Menu, Search, ShoppingBag, User } from 'lucide-react'
import { MAIN_NAVIGATION } from '@/config/navigation'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  toggleMobileMenu,
  toggleCartDrawer,
} from '@/store/slices/uiSlice'
import { selectCurrentUser, resetAuth } from '@/store/slices/authSlice'
import { authService } from '@/services/api/authService'
import { UserRoleBadge } from '@/components/auth/UserRoleBadge'
import { cn } from '@/utils/cn'
import styles from './Header.module.scss'

export interface HeaderProps {
  cartCount?: number
}

export const Header = ({ cartCount = 0 }: HeaderProps) => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAppSelector(selectCurrentUser)
  const isMobileMenuOpen = useAppSelector((state) => state.ui.isMobileMenuOpen)

  const searchLink =
    location.pathname === '/search'
      ? `${location.pathname}${location.search}`
      : '/search'
  const [isScrolled, setIsScrolled] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)

  const accountMenuRef = useRef<HTMLDivElement>(null)
  const accountTriggerRef = useRef<HTMLButtonElement>(null)

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

  useEffect(() => {
    if (!isAccountMenuOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target as Node)
      ) {
        setIsAccountMenuOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setIsAccountMenuOpen(false)
        accountTriggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isAccountMenuOpen])

  const handleLogout = async () => {
    setIsAccountMenuOpen(false)
    try {
      await authService.logout()
    } catch {
      // Ignored: Token is cleared in finally block of authService.logout
    } finally {
      dispatch(resetAuth())
      navigate('/')
    }
  }

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
          <Link
            to={searchLink}
            aria-label="Tìm kiếm sản phẩm"
            className={styles.actionButton}
          >
            <Search size={20} />
          </Link>

          {user ? (
            <div className={styles.accountWrapper} ref={accountMenuRef}>
              <button
                ref={accountTriggerRef}
                type="button"
                onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                aria-label={`Tài khoản: ${user.fullName}`}
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="menu"
                className={cn(
                  styles.actionButton,
                  isAccountMenuOpen && styles.actionButtonActive,
                )}
              >
                <User size={20} />
              </button>

              {isAccountMenuOpen && (
                <div
                  role="menu"
                  aria-label="Tùy chọn tài khoản"
                  className={styles.accountDropdown}
                >
                  <div className={styles.accountDropdownHeader}>
                    <p className={styles.userName}>{user.fullName}</p>
                    <p className={styles.userEmail}>{user.email}</p>
                    <div className={styles.userRoleBadge}>
                      <UserRoleBadge role={user.role} />
                    </div>
                  </div>

                  <div className={styles.dropdownDivider} role="separator" />

                  <Link
                    to="/account"
                    role="menuitem"
                    className={styles.dropdownItem}
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    Thông tin tài khoản
                  </Link>

                  <Link
                    to="/orders"
                    role="menuitem"
                    className={styles.dropdownItem}
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    Đơn hàng của tôi
                  </Link>

                  {(user.role === 'admin' || user.role === 'operator') && (
                    <Link
                      to="/admin"
                      role="menuitem"
                      className={styles.dropdownItem}
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      Trang quản trị
                    </Link>
                  )}

                  <button
                    type="button"
                    role="menuitem"
                    className={cn(styles.dropdownItem, styles.logoutItem)}
                    onClick={handleLogout}
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              aria-label="Tài khoản khách hàng"
              className={styles.actionButton}
            >
              <User size={20} />
            </Link>
          )}

          <button
            type="button"
            onClick={() => dispatch(toggleCartDrawer())}
            aria-label={
              cartCount > 0
                ? `Giỏ hàng, ${cartCount} loại sản phẩm`
                : 'Giỏ hàng'
            }
            className={styles.actionButton}
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className={styles.cartBadge} aria-hidden="true">
                {cartCount}
              </span>
            )}
          </button>

          {/* Dev-only shortcuts (chỉ hiện khi VITE_SHOW_DEV_SHORTCUTS=true) */}
          {import.meta.env.VITE_SHOW_DEV_SHORTCUTS === 'true' && (
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

