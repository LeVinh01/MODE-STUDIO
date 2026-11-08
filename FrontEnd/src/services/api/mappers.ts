import type {
  ApiCategoryItem,
  ApiPaginationMeta,
  ApiProductDetailItem,
  ApiProductListItem,
} from '@/types/api'
import type { ApiUser, User } from '@/types/auth'
import type { PaginationMeta } from '@/types/common'
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

