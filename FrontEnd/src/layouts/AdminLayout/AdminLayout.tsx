import React from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Palette,
  ShoppingCart,
  Store,
  Boxes,
  Users,
  LogOut,
  Menu,
  ChevronRight,
  Calendar,
  ChevronsUpDown,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { toggleAdminSidebar, setAdminSidebarOpen } from '@/store/slices/uiSlice'
import { resetAuth } from '@/store/slices/authSlice'
import { authService } from '@/services/api/authService'
import styles from './AdminLayout.module.scss'

interface BreadcrumbItem {
  label: string
  to?: string
}

interface PageMeta {
  title: string
  breadcrumbs: BreadcrumbItem[]
}

const getPageMeta = (pathname: string): PageMeta => {
  const cleanPath = pathname.replace(/\/$/, '')

  if (cleanPath === '/admin') {
    return {
      title: 'Tổng quan',
      breadcrumbs: [
        { label: 'Quản trị', to: '/admin' },
        { label: 'Tổng quan' },
      ],
    }
  }

  if (cleanPath === '/admin/products') {
    return {
      title: 'Quản lý sản phẩm',
      breadcrumbs: [
        { label: 'Quản trị', to: '/admin' },
        { label: 'Sản phẩm' },
      ],
    }
  }

  if (cleanPath === '/admin/colors') {
    return {
      title: 'Quản lý màu sắc',
      breadcrumbs: [
        { label: 'Quản trị', to: '/admin' },
        { label: 'Màu sắc' },
      ],
    }
  }

  if (cleanPath === '/admin/products/new') {
    return {
      title: 'Thêm sản phẩm mới',
      breadcrumbs: [
        { label: 'Quản trị', to: '/admin' },
        { label: 'Sản phẩm', to: '/admin/products' },
        { label: 'Thêm mới' },
      ],
    }
  }

  if (cleanPath.startsWith('/admin/products/') && cleanPath.endsWith('/edit')) {
    return {
      title: 'Chỉnh sửa sản phẩm',
      breadcrumbs: [
        { label: 'Quản trị', to: '/admin' },
        { label: 'Sản phẩm', to: '/admin/products' },
        { label: 'Chỉnh sửa' },
      ],
    }
  }

  if (cleanPath === '/admin/orders') {
    return {
      title: 'Quản lý đơn hàng',
      breadcrumbs: [
        { label: 'Quản trị', to: '/admin' },
        { label: 'Đơn hàng' },
      ],
    }
  }

  if (cleanPath.startsWith('/admin/orders/')) {
    const code = cleanPath.replace('/admin/orders/', '')
    return {
      title: 'Chi tiết đơn hàng',
      breadcrumbs: [
        { label: 'Quản trị', to: '/admin' },
        { label: 'Đơn hàng', to: '/admin/orders' },
        { label: `#${code}` },
      ],
    }
  }

  if (cleanPath === '/admin/customers') {
    return {
      title: 'Quản lý khách hàng',
      breadcrumbs: [
        { label: 'Quản trị', to: '/admin' },
        { label: 'Khách hàng' },
      ],
    }
  }

  if (cleanPath === '/admin/inventory') {
    return {
      title: 'Quản lý kho hàng',
      breadcrumbs: [
        { label: 'Quản trị', to: '/admin' },
        { label: 'Kho hàng' },
      ],
    }
  }

  return {
    title: 'Quản trị',
    breadcrumbs: [{ label: 'Quản trị', to: '/admin' }],
  }
}

const getTodayVnFormatted = (): string => {
  const now = new Date()
  const days = [
    'Chủ Nhật',
    'Thứ Hai',
    'Thứ Ba',
    'Thứ Tư',
    'Thứ Năm',
    'Thứ Sáu',
    'Thứ Bảy',
  ]
  const dayName = days[now.getDay()]
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  return `${dayName}, ${day}/${month}/${year}`
}

const getRoleLabel = (role?: string): string => {
  if (role === 'admin') return 'Quản trị viên'
  if (role === 'operator') return 'Vận hành viên'
  return 'Nhân viên'
}

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  end?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'TỔNG QUAN',
    items: [
      {
        to: '/admin',
        label: 'Tổng quan',
        icon: LayoutDashboard,
        end: true,
      },
    ],
  },
  {
    label: 'CỬA HÀNG & KHO',
    items: [
      {
        to: '/admin/products',
        label: 'Sản phẩm',
        icon: Package,
      },
      {
        to: '/admin/colors',
        label: 'Màu sắc',
        icon: Palette,
      },
      {
        to: '/admin/orders',
        label: 'Đơn hàng',
        icon: ShoppingCart,
      },
      {
        to: '/admin/inventory',
        label: 'Kho hàng',
        icon: Boxes,
      },
    ],
  },
  {
    label: 'KHÁCH HÀNG',
    items: [
      {
        to: '/admin/customers',
        label: 'Khách hàng',
        icon: Users,
      },
    ],
  },
]

export const AdminLayout: React.FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const isAdminSidebarOpen = useAppSelector((state) => state.ui.isAdminSidebarOpen)
  const user = useAppSelector((state) => state.auth.user)

  const pageMeta = getPageMeta(location.pathname)
  const todayVn = getTodayVnFormatted()
  const roleLabel = getRoleLabel(user?.role)
  const userInitial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'A'

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      dispatch(setAdminSidebarOpen(false))
    }
  }

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch {
      // Ignored
    } finally {
      dispatch(resetAuth())
      navigate('/login')
    }
  }

  return (
    <div className={styles.layoutAdmin}>
      {/* Mobile Drawer Backdrop */}
      {isAdminSidebarOpen && (
        <div
          className={styles.backdrop}
          onClick={() => dispatch(setAdminSidebarOpen(false))}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      {isAdminSidebarOpen && (
        <aside className={styles.sidebar}>
          {/* 1. Brand Logo & Quiet Luxury Subtitle */}
          <div className={styles.brand}>
            <Link to="/admin" className={styles.brandLink} onClick={handleNavClick}>
              <span className={styles.brandTitle}>MODE STUDIO</span>
              <span className={styles.brandSubtitle}>QUẢN TRỊ</span>
            </Link>
          </div>

          {/* 2. Grouped Navigation with small muted labels */}
          <nav className={styles.nav} aria-label="Menu quản trị">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className={styles.navGroup}>
                <div className={styles.groupLabel}>{group.label}</div>
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={handleNavClick}
                      className={({ isActive }) =>
                        isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
                      }
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            ))}
          </nav>

          {/* 3. Account / Logout controls at bottom */}
          <div className={styles.sidebarFooter}>
            <div className={styles.userCard}>
              <div className={styles.userAvatar}>{userInitial}</div>
              <div className={styles.userMeta}>
                <span className={styles.userName} title={user?.fullName || 'Quản trị viên'}>
                  {user?.fullName || 'Quản trị viên'}
                </span>
                <span className={styles.userRole}>{roleLabel}</span>
              </div>
              <ChevronsUpDown size={14} className={styles.userChevron} aria-hidden="true" />
            </div>

            <div className={styles.footerLinks}>
              <Link to="/" className={styles.backLink} onClick={handleNavClick}>
                <Store size={16} />
                <span>Xem cửa hàng</span>
              </Link>
              <button
                type="button"
                className={styles.logoutButton}
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Content wrapper with Editorial Header */}
      <div className={styles.contentWrapper}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.menuToggleBtn}
              onClick={() => dispatch(toggleAdminSidebar())}
              aria-label={isAdminSidebarOpen ? 'Thu gọn menu' : 'Mở rộng menu'}
              title={isAdminSidebarOpen ? 'Thu gọn menu' : 'Mở rộng menu'}
            >
              <Menu size={18} />
            </button>

            <div className={styles.headerTitleBlock}>
              <nav aria-label="Đường dẫn trang" className={styles.breadcrumbs}>
                {pageMeta.breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.label}>
                    {idx > 0 && <ChevronRight size={12} className={styles.crumbSeparator} />}
                    {crumb.to ? (
                      <Link to={crumb.to} className={styles.crumbLink}>
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className={styles.crumbCurrent}>{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
              <h1 className={styles.headerPageTitle}>{pageMeta.title}</h1>
            </div>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.dateBadge} title="Ngày làm việc hôm nay">
              <Calendar size={14} className={styles.dateIcon} />
              <span>{todayVn}</span>
            </div>

            <div className={styles.headerDivider} />

            <div className={styles.headerProfile}>
              <div className={styles.headerAvatar}>{userInitial}</div>
              <div className={styles.headerProfileText}>
                <span className={styles.headerUserName}>
                  {user?.fullName || 'Quản trị viên'}
                </span>
                <span className={styles.headerUserRole}>{roleLabel}</span>
              </div>
            </div>
          </div>
        </header>

        <main className={styles.mainBody}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
