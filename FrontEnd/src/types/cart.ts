export interface CartVariantColor {
  id: string
  name: string
  hexCode?: string | null
}

export interface CartVariantSize {
  id: string
  name: string
}

export interface CartItemVariant {
  id: string
  sku?: string | null
  color?: CartVariantColor | null
  size?: CartVariantSize | null
  stockQuantity: number
  isActive: boolean
}

export interface CartItemProduct {
  id: string
  name: string
  slug: string
  status: string
  mainImage?: {
    url: string
    altText?: string | null
  } | null
}

export interface CartItem {
  id: string
  variantId: string
  variant: CartItemVariant
  product?: CartItemProduct | null
  unitPrice: number
  quantity: number
  lineTotal: number
  isPurchasable: boolean
  unpurchasableReason?: string | null
}

export interface Cart {
  items: CartItem[]
  subtotal: number
  totalQuantity: number
  itemsCount: number
  hasUnpurchasableItems: boolean
}
