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
      const { CheckoutPage } = await import(
        '@/pages/storefront/CheckoutPage/CheckoutPage'
      )
      return { Component: CheckoutPage }
    },
  },
]

