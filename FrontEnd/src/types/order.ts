export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipping'
  | 'delivered'
  | 'cancelled'

export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded'
export type PaymentMethod = 'cod' | 'vnpay'

export interface ShippingAddress {
  fullName: string
  phone: string
  addressLine: string
  city?: string
  district?: string
  ward?: string
  postalCode?: string
}

export interface OrderItem {
  id: string
  orderId?: string
  productId: string
  variantId: string
  productName: string
  sku: string
  colorName: string
  sizeName: string
  imageUrl?: string | null
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface Order {
  id: string
  orderCode: string
  userId: string
  status: OrderStatus
  paymentMethod: PaymentMethod | string
  paymentStatus: PaymentStatus | string
  recipientName: string
  recipientPhone: string
  shippingAddress: string
  note?: string | null
  subtotal: number
  shippingFee: number
  discountAmount: number
  totalAmount: number
  cancelReason?: string | null
  cancelledAt?: string | null
  paidAt?: string | null
  createdAt: string
  items: OrderItem[]
}
