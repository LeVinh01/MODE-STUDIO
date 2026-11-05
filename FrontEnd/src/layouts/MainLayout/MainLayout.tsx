import { Outlet } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { toggleCartDrawer } from '@/store/slices/uiSlice'
import { AnnouncementBar, Header, MobileMenu, SearchModal, Footer } from '@/components/storefront'
import styles from './MainLayout.module.scss'

export const MainLayout = () => {
  const dispatch = useAppDispatch()
  const isCartDrawerOpen = useAppSelector((state) => state.ui.isCartDrawerOpen)

  return (
    <div className={styles.layoutStorefront}>
      {/* 1. Skip-to-content accessibility link */}
      <a href="#main-content" className={styles.skipToContent}>
        Chuyển đến nội dung chính
      </a>

      {/* 2. Dismissible Announcement Bar */}
      <AnnouncementBar />

      {/* 3. Sticky Editorial Header */}
      <Header cartCount={0} />

      {/* 4. Mobile Drawer Navigation */}
      <MobileMenu />

      {/* 5. Search Modal Dialog */}
      <SearchModal />

      {/* 6. Main Landmark Content */}
      <main id="main-content" tabIndex={-1} className={styles.mainContent}>
        <Outlet />
      </main>

      {/* 7. Khung aside giỏ hàng tạm thời (Sẽ thay thế bằng <Drawer position="right"> ở bước giỏ hàng sau) */}
      {isCartDrawerOpen && (
        <aside className={styles.cartDrawer} aria-label="Giỏ hàng tạm thời">
          <div className={styles.drawerHeader}>
            <h3 className={styles.drawerTitle}>Túi Mua Sắm / Shopping Bag</h3>
            <button
              type="button"
              onClick={() => dispatch(toggleCartDrawer())}
              aria-label="Đóng giỏ hàng"
              className={styles.closeButton}
            >
              ✕
            </button>
          </div>
          <p className={styles.drawerEmpty}>
            Giỏ hàng của bạn đang trống.
          </p>
        </aside>
      )}

      {/* 8. Chân trang đa cột chính thức */}
      <Footer />
    </div>
  )
}

export default MainLayout
