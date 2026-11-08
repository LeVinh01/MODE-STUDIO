import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import {
  AnnouncementBar,
  Header,
  MobileMenu,
  SearchModal,
  Footer,
  CartDrawer,
} from '@/components/storefront'
import { selectCartItemsCount } from '@/store/slices/cartSlice'
import styles from './MainLayout.module.scss'

export interface MainLayoutProps {
  children?: ReactNode
}

export const MainLayout = ({ children }: MainLayoutProps = {}) => {
  const itemsCount = useAppSelector(selectCartItemsCount)

  return (
    <div className={styles.layoutStorefront}>
      {/* 1. Skip-to-content accessibility link */}
      <a href="#main-content" className={styles.skipToContent}>
        Chuyển đến nội dung chính
      </a>

      {/* 2. Dismissible Announcement Bar */}
      <AnnouncementBar />

      {/* 3. Sticky Editorial Header */}
      <Header cartCount={itemsCount} />

      {/* 4. Mobile Drawer Navigation */}
      <MobileMenu />

      {/* 5. Search Modal Dialog */}
      <SearchModal />

      {/* 6. Main Landmark Content */}
      <main id="main-content" tabIndex={-1} className={styles.mainContent}>
        {children ?? <Outlet />}
      </main>

      {/* 7. Ngăn kéo giỏ hàng (CartDrawer) */}
      <CartDrawer />

      {/* 8. Chân trang đa cột chính thức */}
      <Footer />
    </div>
  )
}

export default MainLayout
