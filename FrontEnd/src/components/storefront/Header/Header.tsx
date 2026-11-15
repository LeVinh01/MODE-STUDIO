import React, { useState, useEffect, useRef } from 'react'
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

export const Header: React.FC<HeaderProps> = ({ cartCount = 0 }) => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAppSelector(selectCurrentUser)
  const isMobileMenuOpen = useAppSelector((state) => state.ui.isMobileMenuOpen)
  const isCartDrawerOpen = useAppSelector((state) => state.ui.isCartDrawerOpen)

  const isHomePage = location.pathname === '/'
  const [headerTheme, setHeaderTheme] = useState<'dark' | 'light'>('dark')
  const [headerTop, setHeaderTop] = useState(0)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)

  const headerRef = useRef<HTMLElement>(null)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const accountTriggerRef = useRef<HTMLButtonElement>(null)

  const isOverlayOpen = isMobileMenuOpen || isCartDrawerOpen || isAccountMenuOpen

  // Section theme & announcement bar detection (HOME PAGE ONLY)
  useEffect(() => {
    if (!isHomePage) return

    let rafId: number | null = null

    const detectThemeAndPosition = () => {
      // 1. Calculate top offset based on normal-flow announcement bar
      const announcementBar = document.querySelector(
        'aside[aria-label="Thông báo ưu đãi"]'
      )
      let topOffset = 0
      if (announcementBar) {
        const barRect = announcementBar.getBoundingClientRect()
        topOffset = Math.max(0, barRect.bottom)
      }
      setHeaderTop(topOffset)

      // 2. Detect section under header vertical center
      const headerEl = headerRef.current
      const headerHeight = headerEl ? headerEl.offsetHeight : 68
      const headerCenterY = topOffset + headerHeight / 2

      const sections = document.querySelectorAll<HTMLElement>('[data-header-theme]')
      let detectedTheme: 'dark' | 'light' = 'dark'
      let closestSection: HTMLElement | null = null
      let closestDist = -Infinity

      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i]
        const rect = sec.getBoundingClientRect()
        if (rect.top <= headerCenterY && rect.bottom > headerCenterY) {
          closestSection = sec
          break
        }
        if (rect.top <= headerCenterY && rect.top > closestDist) {
          closestDist = rect.top
          closestSection = sec
        }
      }

      if (closestSection) {
        const theme = closestSection.getAttribute('data-header-theme')
        if (theme === 'dark' || theme === 'light') {
          detectedTheme = theme
        }
      }

      setHeaderTheme(detectedTheme)
    }

    const scheduleUpdate = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        detectThemeAndPosition()
        rafId = null
      })
    }

    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate, { passive: true })

    // MutationObserver to immediately detect when AnnouncementBar is dismissed
    const observer = new MutationObserver(() => {
      scheduleUpdate()
    })
    observer.observe(document.body, { childList: true, subtree: true })

    // Initial check
    detectThemeAndPosition()

    return () => {
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      observer.disconnect()
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [isHomePage])

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

  const searchLink =
    location.pathname === '/search'
      ? `${location.pathname}${location.search}`
      : '/search'

  // Header class configuration
  const headerClassNames = cn(
    styles.header,
    isHomePage ? styles.homeHeader : styles.solidSticky,
    isHomePage &&
      !isOverlayOpen &&
      (headerTheme === 'dark' ? styles.themeDark : styles.themeLight),
    isOverlayOpen && styles.overlayOpen
  )

  const headerInlineStyle: React.CSSProperties = isHomePage
    ? { top: `${headerTop}px` }
    : {}

  return (
    <header
      ref={headerRef}
      className={headerClassNames}
      style={headerInlineStyle}
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

          <nav className={styles.desktopNav} aria-label="Điều hướng chính">
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

                  {user.role === 'admin' && (
                    <Link
                      to="/admin/products"
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
