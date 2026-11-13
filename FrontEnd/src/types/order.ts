export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipping'
  | 'delivered'
  | 'cancelled'

export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'refunded'
export type PaymentMethod = 'cod' | 'vnpay'

export interface OrderItem {
  id: number | string
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
  orderCode: string
  status: OrderStatus
  paymentMethod: PaymentMethod | string
  paymentStatus: PaymentStatus | string
  recipientName: string
  recipientPhone: string
  shippingAddress: string
  carrier?: string | null
  trackingCode?: string | null
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

export interface CreateOrderPayload {
  recipient_name: string
  recipient_phone: string
  shipping_address: string
  note?: string | null
  payment_method: 'cod' | 'vnpay'
}

export interface InsufficientStockItem {
  variantId: number
  productName: string
  requestedQuantity: number
  availableStock: number
}
