import apiClient from './client'
import type {
  AdminCustomerDetail,
  AdminCustomerFilterParams,
  AdminCustomerListItem,
  ApiAdminCustomerDetailResponse,
  ApiAdminCustomerListItem,
} from '@/types/adminCustomer'
import type { ApiPaginatedResponse, ApiPaginationMeta } from '@/types/api'
import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/types/order'

export const adminCustomerService = {
  async getCustomers(
    params?: AdminCustomerFilterParams,
    signal?: AbortSignal,
  ): Promise<{ customers: AdminCustomerListItem[]; meta: ApiPaginationMeta }> {
    const cleanParams: Record<string, string | number> = {}
    if (params?.search?.trim()) cleanParams.search = params.search.trim()
    if (params?.page) cleanParams.page = params.page
    if (params?.per_page) cleanParams.per_page = params.per_page

    const res = await apiClient.get<ApiPaginatedResponse<ApiAdminCustomerListItem>>(
      '/admin/customers',
      { params: cleanParams, signal },
    )

    const customers: AdminCustomerListItem[] = (res.data.data || []).map((item) => ({
      id: item.id,
      fullName: item.full_name,
      email: item.email,
      phone: item.phone,
      createdAt: item.created_at,
      ordersCount: item.orders_count,
      totalSpent: item.total_spent,
      lastOrderAt: item.last_order_at,
    }))

    return {
      customers,
      meta: res.data.meta,
    }
  },

  async getCustomerDetail(
    id: number,
    signal?: AbortSignal,
  ): Promise<AdminCustomerDetail> {
    const res = await apiClient.get<ApiAdminCustomerDetailResponse>(
      `/admin/customers/${id}`,
      { signal },
    )

    const d = res.data

    return {
      customer: {
        id: d.customer.id,
        fullName: d.customer.full_name,
        email: d.customer.email,
        phone: d.customer.phone,
        createdAt: d.customer.created_at,
      },
      stats: {
        ordersCount: d.stats.orders_count,
        deliveredOrdersCount: d.stats.delivered_orders_count,
        totalSpent: d.stats.total_spent,
        lastOrderAt: d.stats.last_order_at,
      },
      recentOrders: (d.recent_orders || []).map((o) => ({
        id: o.id,
        orderCode: o.order_code,
        status: o.status as OrderStatus,
        paymentMethod: o.payment_method as PaymentMethod,
        paymentStatus: o.payment_status as PaymentStatus,
        totalAmount: o.total_amount,
        itemsCount: o.items_count,
        carrier: o.carrier,
        trackingCode: o.tracking_code,
        createdAt: o.created_at,
      })),
    }
  },
}
