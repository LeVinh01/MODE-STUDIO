import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { storefrontRoutes } from './storefrontRoutes'
import { adminRoutes } from './adminRoutes'

const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: 'design-system',
        lazy: async () => {
          const { DesignSystemShowcasePage } = await import(
            '@/pages/dev/DesignSystemShowcasePage'
          )
          return { Component: DesignSystemShowcasePage }
        },
      },
    ]
  : []

export const router = createBrowserRouter([
  {
    path: '/',
    lazy: async () => {
      const { MainLayout } = await import('@/layouts/MainLayout/MainLayout')
      return { Component: MainLayout }
    },
    children: [...storefrontRoutes, ...devRoutes],
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
