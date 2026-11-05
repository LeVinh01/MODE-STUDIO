import { createBrowserRouter } from 'react-router-dom'
import { storefrontRoutes } from './storefrontRoutes'
import { adminRoutes } from './adminRoutes'

export const router = createBrowserRouter([
  {
    path: '/',
    lazy: async () => {
      const { MainLayout } = await import('@/layouts/MainLayout/MainLayout')
      return { Component: MainLayout }
    },
    children: storefrontRoutes,
  },
  {
    path: '/admin',
    lazy: async () => {
      const { AdminLayout } = await import('@/layouts/AdminLayout/AdminLayout')
      return { Component: AdminLayout }
    },
    children: adminRoutes,
  },
  {
    path: '*',
    lazy: async () => {
      const { NotFoundPage } = await import('@/pages/NotFoundPage/NotFoundPage')
      return { Component: NotFoundPage }
    },
  },
])

export default router

