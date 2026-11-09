import type {
  ApiCartItem,
  ApiCartResponse,
  ApiCategoryItem,
  ApiOrder,
  ApiOrderItem,
  ApiPaginationMeta,
  ApiProductDetailItem,
  ApiProductListItem,
} from '@/types/api'
import type { ApiUser, User } from '@/types/auth'
import type { Cart, CartItem } from '@/types/cart'
import type { PaginationMeta } from '@/types/common'
import type { Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus } from '@/types/order'
import type {
  Product,
  ProductCategory,
  ProductVariant,
} from '@/types/product'

/**
 * Kiểm tra xem sản phẩm có được đăng trong vòng 30 ngày trở lại đây không
 */
export const isProductNew = (publishedAt?: string | null): boolean => {
  if (!publishedAt) return false
  const pubTime = new Date(publishedAt).getTime()
  if (isNaN(pubTime)) return false
  const now = Date.now()
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
  return now - pubTime >= 0 && now - pubTime <= thirtyDaysMs
}

/**
 * Chuyển đổi ApiProductListItem sang Product
 */
export const mapProductListItemToProduct = (item: ApiProductListItem): Product => {
  const isNew = isProductNew(item.published_at)
  const isOutOfStock = !item.in_stock

  return {
    id: String(item.id),
    name: item.name,
    slug: item.slug,
    description: '',
    category: {
      id: String(item.category.id),
      name: item.category.name,
      slug: item.category.slug,
    },
    brand: item.brand
      ? {
          id: String(item.brand.id),
          name: item.brand.name,
          slug: item.brand.slug,
        }
      : null,
    basePrice: item.base_price,
    compareAtPrice: item.compare_at_price,
    variants: [],
    isPublished: true,
    isFeatured: item.is_featured,
    inStock: item.in_stock,
    publishedAt: item.published_at,
    featuredImage: item.main_image?.url,
    mainImage: item.main_image
      ? {
          url: item.main_image.url,
          altText: item.main_image.alt_text ?? undefined,
        }
      : null,
    availableColors: item.available_colors.map((c) => ({
      id: String(c.id),
      name: c.name,
      hexCode: c.hex_code ?? undefined,
    })),
    isNew,
    isOutOfStock,
  }
}

/**
 * Chuyển đổi ApiProductDetailItem sang Product
 */
export const mapProductDetailItemToProduct = (item: ApiProductDetailItem): Product => {
  const isNew = isProductNew(item.published_at)
  const isOutOfStock = !item.in_stock

  const variants: ProductVariant[] = item.variants.map((v) => ({
    id: String(v.id),
    productId: String(item.id),
    sku: v.sku,
    color: v.color.name,
    colorHex: v.color.hex_code ?? undefined,
    colorId: v.color.id,
    size: v.size.name,
    sizeId: v.size.id,
    sizeSortOrder: v.size.sort_order,
    price: item.base_price,
    originalPrice: item.compare_at_price ?? undefined,
    stock: v.stock_quantity,
    isActive: v.is_active,
    images: [],
  }))

  const mainImage = item.images.find((img) => img.is_main) || item.images[0]

  return {
    id: String(item.id),
    name: item.name,
    slug: item.slug,
    description: item.description ?? '',
    category: {
      id: String(item.category.id),
      name: item.category.name,
      slug: item.category.slug,
    },
    brand: item.brand
      ? {
          id: String(item.brand.id),
          name: item.brand.name,
          slug: item.brand.slug,
        }
      : null,
    basePrice: item.base_price,
    compareAtPrice: item.compare_at_price,
    variants,
    isPublished: true,
    isFeatured: item.is_featured,
    inStock: item.in_stock,
    publishedAt: item.published_at,
    featuredImage: mainImage?.url,
    mainImage: mainImage
      ? {
          url: mainImage.url,
          altText: mainImage.alt_text ?? undefined,
        }
      : null,
    images: item.images.map((img) => ({
      id: String(img.id),
      url: img.url,
      altText: img.alt_text ?? undefined,
      isMain: img.is_main,
      sortOrder: img.sort_order,
      colorId: img.color_id,
    })),
    availableColors: Array.from(
      new Map(
        item.variants.map((v) => [
          v.color.id,
          {
            id: String(v.color.id),
            name: v.color.name,
            hexCode: v.color.hex_code ?? undefined,
          },
        ]),
      ).values(),
    ),
    material: item.material,
    gender: item.gender,
    isNew,
    isOutOfStock,
  }
}

/**
 * Chuyển đổi ApiCategoryItem sang ProductCategory (kèm đệ quy children)
 */
export const mapCategoryItemToCategory = (item: ApiCategoryItem): ProductCategory => {
  return {
    id: String(item.id),
    name: item.name,
    slug: item.slug,
    description: item.description ?? undefined,
    imageUrl: item.image_url,
    sortOrder: item.sort_order,
    children: item.children?.map(mapCategoryItemToCategory),
  }
}

/**
 * Chuyển đổi ApiPaginationMeta sang PaginationMeta
 */
export const mapApiPaginationMeta = (meta: ApiPaginationMeta): PaginationMeta => {
  return {
    currentPage: meta.current_page,
    lastPage: meta.last_page,
    perPage: meta.per_page,
    total: meta.total,
  }
}

/**
 * Chuyển đổi ApiUser (snake_case) sang User (camelCase)
 */
export const mapApiUserToUser = (apiUser: ApiUser): User => {
  return {
    id: String(apiUser.id),
    fullName: apiUser.full_name,
    email: apiUser.email,
    phone: apiUser.phone,
    role: apiUser.role,
    status: apiUser.status,
    emailVerifiedAt: apiUser.email_verified_at,
    lastLoginAt: apiUser.last_login_at,
  }
}

/**
 * Chuyển đổi ApiCartItem sang CartItem (chuẩn hóa camelCase, an toàn với id null ở giỏ khách)
 */
export const mapApiCartItemToCartItem = (item: ApiCartItem): CartItem => {
  const rowId = item.id !== null && item.id !== undefined ? String(item.id) : `guest-${item.variant.id}`

  return {
    id: rowId,
    variantId: String(item.variant.id),
    variant: {
      id: String(item.variant.id),
      sku: item.variant.sku ?? null,
      color: item.variant.color
        ? {
            id: String(item.variant.color.id),
            name: item.variant.color.name,
            hexCode: item.variant.color.hex_code,
          }
        : null,
      size: item.variant.size
        ? {
            id: String(item.variant.size.id),
            name: item.variant.size.name,
          }
        : null,
      stockQuantity: item.variant.stock_quantity ?? 0,
      isActive: Boolean(item.variant.is_active),
    },
    product: item.product
      ? {
          id: String(item.product.id),
          name: item.product.name,
          slug: item.product.slug,
          status: item.product.status,
          mainImage: item.product.main_image
            ? {
                url: item.product.main_image.url,
                altText: item.product.main_image.alt_text,
              }
            : null,
        }
      : null,
    unitPrice: item.unit_price,
    quantity: item.quantity,
    lineTotal: item.line_total,
    isPurchasable: item.is_purchasable,
    unpurchasableReason: item.unpurchasable_reason,
  }
}

/**
 * Chuyển đổi ApiCartResponse sang Cart
 */
export const mapApiCartToCart = (apiCart: ApiCartResponse): Cart => {
  return {
    items: (apiCart.items || []).map(mapApiCartItemToCartItem),
    subtotal: apiCart.subtotal,
    totalQuantity: apiCart.total_quantity,
    itemsCount: apiCart.items_count,
    hasUnpurchasableItems: apiCart.has_unpurchasable_items,
  }
}

/**
 * Chuyển đổi ApiOrderItem sang OrderItem
 */
export const mapApiOrderItemToOrderItem = (apiItem: ApiOrderItem): OrderItem => {
  return {
    id: apiItem.id,
    productId: String(apiItem.product_id),
    variantId: String(apiItem.variant_id),
    productName: apiItem.product_name,
    sku: apiItem.sku,
    colorName: apiItem.color_name,
    sizeName: apiItem.size_name,
    imageUrl: apiItem.image_url,
    unitPrice: apiItem.unit_price,
    quantity: apiItem.quantity,
    lineTotal: apiItem.line_total,
  }
}

/**
 * Chuyển đổi ApiOrder sang Order (camelCase, không có id/userId)
 */
export const mapApiOrderToOrder = (apiOrder: ApiOrder): Order => {
  return {
    orderCode: apiOrder.order_code,
    status: apiOrder.status as OrderStatus,
    paymentMethod: apiOrder.payment_method as PaymentMethod,
    paymentStatus: apiOrder.payment_status as PaymentStatus,
    recipientName: apiOrder.recipient_name,
    recipientPhone: apiOrder.recipient_phone,
    shippingAddress: apiOrder.shipping_address,
    note: apiOrder.note,
    subtotal: apiOrder.subtotal,
    shippingFee: apiOrder.shipping_fee,
    discountAmount: apiOrder.discount_amount,
    totalAmount: apiOrder.total_amount,
    cancelReason: apiOrder.cancel_reason,
    cancelledAt: apiOrder.cancelled_at,
    paidAt: apiOrder.paid_at,
    createdAt: apiOrder.created_at,
    items: (apiOrder.items || []).map(mapApiOrderItemToOrderItem),
  }
}


