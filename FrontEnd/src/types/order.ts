import type { CartItem } from './cart'

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface ShippingAddress {
  fullName: string
  phone: string
  addressLine: string
  city: string
  district?: string
  ward?: string
  postalCode?: string
}

export interface OrderItem extends CartItem {
  orderId: string
}

export interface Order {
  id: string
  orderNumber: string
  customerId: string
  items: OrderItem[]
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: string
  shippingAddress: ShippingAddress
  subtotal: number
  shippingFee: number
  totalAmount: number
  note?: string
  createdAt: string
  updatedAt: string
}

