import { createElement } from 'react'
import type { RouteObject } from 'react-router-dom'

export const storefrontRoutes: RouteObject[] = [
  {
    index: true,
    lazy: async () => {
      const { HomePage } = await import('@/pages/storefront/HomePage/HomePage')
      return { Component: HomePage }
    },
  },
  {
    path: 'products',
    lazy: async () => {
      const { ProductListingPage } = await import(
        '@/pages/storefront/ProductListingPage/ProductListingPage'
      )
      return { Component: ProductListingPage }
    },
  },
  {
    path: 'search',
    lazy: async () => {
      const { SearchPage } = await import(
        '@/pages/storefront/SearchPage/SearchPage'
      )
      return { Component: SearchPage }
    },
  },
  {
    path: 'products/:slug',
    lazy: async () => {
      const { ProductDetailPage } = await import(
        '@/pages/storefront/ProductDetailPage/ProductDetailPage'
      )
      return { Component: ProductDetailPage }
    },
  },
  {
    path: 'cart',
    lazy: async () => {
      const { CartPage } = await import('@/pages/storefront/CartPage/CartPage')
      return { Component: CartPage }
    },
  },
  {
    path: 'checkout',
    lazy: async () => {
      const [{ CheckoutPage }, { ProtectedRoute }] = await Promise.all([
        import('@/pages/storefront/CheckoutPage/CheckoutPage'),
        import('@/components/auth/ProtectedRoute/ProtectedRoute'),
      ])
      return {
        Component: () =>
          createElement(ProtectedRoute, null, createElement(CheckoutPage)),
      }
    },
  },
  {
    path: 'order-success/:orderCode',
    lazy: async () => {
      const [{ OrderSuccessPage }, { ProtectedRoute }] = await Promise.all([
        import('@/pages/storefront/OrderSuccessPage/OrderSuccessPage'),
        import('@/components/auth/ProtectedRoute/ProtectedRoute'),
      ])
      return {
        Component: () =>
          createElement(
            ProtectedRoute,
            null,
            createElement(OrderSuccessPage),
          ),
      }
    },
  },
  {
    path: 'account',
    lazy: async () => {
      const [{ AccountPage }, { ProtectedRoute }] = await Promise.all([
        import('@/pages/storefront/AccountPage/AccountPage'),
        import('@/components/auth/ProtectedRoute/ProtectedRoute'),
      ])
      return {
        Component: () =>
          createElement(ProtectedRoute, null, createElement(AccountPage)),
      }
    },
  },
  {
    path: 'orders',
    lazy: async () => {
      const [{ MyOrdersPage }, { ProtectedRoute }] = await Promise.all([
        import('@/pages/storefront/MyOrdersPage/MyOrdersPage'),
        import('@/components/auth/ProtectedRoute/ProtectedRoute'),
      ])
      return {
        Component: () =>
          createElement(ProtectedRoute, null, createElement(MyOrdersPage)),
      }
    },
  },
  {
    path: 'orders/:orderCode',
    lazy: async () => {
      const [{ OrderDetailPage }, { ProtectedRoute }] = await Promise.all([
        import('@/pages/storefront/OrderDetailPage/OrderDetailPage'),
        import('@/components/auth/ProtectedRoute/ProtectedRoute'),
      ])
      return {
        Component: () =>
          createElement(
            ProtectedRoute,
            null,
            createElement(OrderDetailPage),
          ),
      }
    },
  },
  // Các trang thông tin tĩnh storefront
  {
    path: 'policy/returns',
    lazy: async () => {
      const { InfoPage } = await import('@/pages/storefront/InfoPage')
      return { Component: InfoPage }
    },
  },
  {
    path: 'size-guide',
    lazy: async () => {
      const { InfoPage } = await import('@/pages/storefront/InfoPage')
      return { Component: InfoPage }
    },
  },
  {
    path: 'shipping',
    lazy: async () => {
      const { InfoPage } = await import('@/pages/storefront/InfoPage')
      return { Component: InfoPage }
    },
  },
  {
    path: 'faq',
    lazy: async () => {
      const { InfoPage } = await import('@/pages/storefront/InfoPage')
      return { Component: InfoPage }
    },
  },
  {
    path: 'about',
    lazy: async () => {
      const { InfoPage } = await import('@/pages/storefront/InfoPage')
      return { Component: InfoPage }
    },
  },
  {
    path: 'editorial',
    lazy: async () => {
      const { InfoPage } = await import('@/pages/storefront/InfoPage')
      return { Component: InfoPage }
    },
  },
  {
    path: 'stores',
    lazy: async () => {
      const { InfoPage } = await import('@/pages/storefront/InfoPage')
      return { Component: InfoPage }
    },
  },
  {
    path: 'contact',
    lazy: async () => {
      const { InfoPage } = await import('@/pages/storefront/InfoPage')
      return { Component: InfoPage }
    },
  },
]

