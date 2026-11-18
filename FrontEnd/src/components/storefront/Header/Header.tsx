import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Search, ShoppingBag, User } from 'lucide-react'
import { BRAND_NAME, BRAND_LOGOS } from '@/config/brand'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  toggleMobileMenu,
  toggleCartDrawer,
} from '@/store/slices/uiSlice'
import { selectCurrentUser, resetAuth } from '@/store/slices/authSlice'
import { authService } from '@/services/api/authService'
import { UserRoleBadge } from '@/components/auth/UserRoleBadge'
import { HeaderSearchBar } from './HeaderSearchBar'
import { cn } from '@/utils/cn'
import styles from './Header.module.scss'

export interface HeaderProps {
  cartCount?: number
}

export const Header: React.FC<HeaderProps> = ({ cartCount = 0 }) => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAppSelector(selectCurrentUser)
  const isMobileMenuOpen = useAppSelector((state) => state.ui.isMobileMenuOpen)

  // Account dropdown & mobile search states
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)

  // Close account menu & mobile search on route change
  const currentPath = location.pathname + location.search
  const [prevPath, setPrevPath] = useState(currentPath)
  if (prevPath !== currentPath) {
    setPrevPath(currentPath)
    setIsAccountMenuOpen(false)
    setIsMobileSearchOpen(false)
  }

  const accountMenuRef = useRef<HTMLDivElement>(null)
  const accountTriggerRef = useRef<HTMLButtonElement>(null)

  // Click outside & Escape for account dropdown
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
      // Ignored
    } finally {
      dispatch(resetAuth())
      navigate('/')
    }
  }

  // Active navigation states derived from URL
  const pathname = location.pathname
  const search = location.search

  const isWomenActive = pathname === '/' || pathname === '/nu'
  const isMenActive = pathname === '/nam'
  const isAccessoriesActive =
    pathname === '/products' && search.includes('category=accessories')

  return (
    <header className={styles.header} role="banner">
      <div className={styles.container}>
        {/* Left Section: Mobile Hamburger Toggle + Brand Logo + Nav Items */}
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

          {/* OMBRE Logo */}
          <Link
            to="/"
            className={styles.logoLink}
            aria-label={`${BRAND_NAME} Trang Chủ`}
          >
            {!logoFailed ? (
              <img
                src={BRAND_LOGOS.cream}
                alt={BRAND_NAME}
                width={88}
                height={56}
                className={styles.logoImg}
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <span className={styles.logoText}>{BRAND_NAME}</span>
            )}
          </Link>

          {/* Desktop Nav: NỮ, NAM, PHỤ KIỆN (Uniqlo style underline) */}
          <nav className={styles.desktopNav} aria-label="Điều hướng danh mục">
            <Link
              to="/"
              className={cn(styles.navLink, isWomenActive && styles.active)}
              aria-current={isWomenActive ? 'page' : undefined}
            >
              NỮ
            </Link>
            <Link
              to="/nam"
              className={cn(styles.navLink, isMenActive && styles.active)}
              aria-current={isMenActive ? 'page' : undefined}
            >
              NAM
            </Link>
            <Link
              to="/products?category=accessories"
              className={cn(styles.navLink, isAccessoriesActive && styles.active)}
              aria-current={isAccessoriesActive ? 'page' : undefined}
            >
              PHỤ KIỆN
            </Link>
          </nav>
        </div>

        {/* Right Section: Pill Search + Account Menu + Cart Icon */}
        <div className={styles.rightSection}>
          {/* Desktop Search Bar & Mobile Search Overlay */}
          <HeaderSearchBar
            isMobileSearchOpen={isMobileSearchOpen}
            onCloseMobileSearch={() => setIsMobileSearchOpen(false)}
          />

          {/* Mobile Search Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(true)}
            aria-label="Mở thanh tìm kiếm"
            className={cn(styles.actionButton, styles.mobileSearchButton)}
          >
            <Search size={20} />
          </button>

          {/* Account Icon / Dropdown */}
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
                  isAccountMenuOpen && styles.actionButtonActive
                )}
              >
                <User size={20} />
              </button>

              {isAccountMenuOpen && (
                <div
                  className={styles.accountDropdown}
                  role="menu"
                  aria-label="Menu tài khoản"
                >
                  <div className={styles.dropdownHeader}>
                    <div className={styles.userNameRow}>
                      <span className={styles.userName}>{user.fullName}</span>
                      <UserRoleBadge role={user.role} />
                    </div>
                    <span className={styles.userEmail}>{user.email}</span>
                  </div>

                  <div className={styles.dropdownDivider} role="separator" />

                  {(user.role === 'admin' || user.role === 'operator') && (
                    <Link
                      to="/admin"
                      className={styles.dropdownItem}
                      role="menuitem"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      Trang Quản Trị
                    </Link>
                  )}

                  <Link
                    to="/account"
                    className={styles.dropdownItem}
                    role="menuitem"
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    Thông Tin Tài Khoản
                  </Link>

                  <Link
                    to="/account/orders"
                    className={styles.dropdownItem}
                    role="menuitem"
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    Đơn Hàng Của Tôi
                  </Link>

                  <div className={styles.dropdownDivider} role="separator" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className={cn(styles.dropdownItem, styles.logoutButton)}
                    role="menuitem"
                  >
                    Đăng Xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              aria-label="Đăng nhập tài khoản"
              className={styles.actionButton}
            >
              <User size={20} />
            </Link>
          )}

          {/* Cart Icon with Item Count Badge */}
          <button
            type="button"
            onClick={() => dispatch(toggleCartDrawer())}
            aria-label={`Giỏ hàng (${cartCount} sản phẩm)`}
            className={cn(styles.actionButton, styles.cartButton)}
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className={styles.cartBadge} aria-hidden="true">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
