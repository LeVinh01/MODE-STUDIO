import type { RouteObject } from 'react-router-dom'

export const adminRoutes: RouteObject[] = [
  {
    index: true,
    lazy: async () => {
      const { DashboardPage } = await import(
        '@/pages/admin/DashboardPage/DashboardPage'
      )
      return { Component: DashboardPage }
    },
  },
  {
    path: 'products',
    lazy: async () => {
      const { ProductManagementPage } = await import(
        '@/pages/admin/ProductManagementPage/ProductManagementPage'
      )
      return { Component: ProductManagementPage }
    },
  },
  {
    path: 'orders',
    lazy: async () => {
      const { OrderManagementPage } = await import(
        '@/pages/admin/OrderManagementPage/OrderManagementPage'
      )
      return { Component: OrderManagementPage }
    },
  },
]

