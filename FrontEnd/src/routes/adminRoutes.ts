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
    path: 'products/new',
    lazy: async () => {
      const { ProductFormPage } = await import(
        '@/pages/admin/ProductFormPage/ProductFormPage'
      )
      return { Component: ProductFormPage }
    },
  },
  {
    path: 'products/:id/edit',
    lazy: async () => {
      const { ProductFormPage } = await import(
        '@/pages/admin/ProductFormPage/ProductFormPage'
      )
      return { Component: ProductFormPage }
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
  {
    path: 'orders/:orderCode',
    lazy: async () => {
      const { AdminOrderDetailPage } = await import(
        '@/pages/admin/AdminOrderDetailPage/AdminOrderDetailPage'
      )
      return { Component: AdminOrderDetailPage }
    },
  },
  {
    path: 'inventory',
    lazy: async () => {
      const { InventoryManagementPage } = await import(
        '@/pages/admin/InventoryManagementPage/InventoryManagementPage'
      )
      return { Component: InventoryManagementPage }
    },
  },
  {
    path: 'customers',
    lazy: async () => {
      const { CustomerManagementPage } = await import(
        '@/pages/admin/CustomerManagementPage/CustomerManagementPage'
      )
      return { Component: CustomerManagementPage }
    },
  },
]

