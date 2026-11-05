import type { ProductVariant } from './product'

export interface CartItem {
  id: string
  productId: string
  variantId: string
  name: string
  variant: Pick<ProductVariant, 'sku' | 'color' | 'size' | 'price' | 'images'>
  price: number
  quantity: number
}

export interface Cart {
  items: CartItem[]
  totalQuantity: number
  subtotal: number
}

