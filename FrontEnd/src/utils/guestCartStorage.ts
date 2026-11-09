export interface GuestCartItem {
  variantId: number
  quantity: number
}

const GUEST_CART_STORAGE_KEY = 'mode_studio_guest_cart'
const MAX_GUEST_CART_ITEMS = 50
const MAX_ITEM_QUANTITY = 20

// Bộ nhớ RAM dự phòng nếu localStorage bị vô hiệu hóa hoàn toàn
let inMemoryGuestCart: GuestCartItem[] = []

/**
 * Đọc danh sách giỏ khách từ localStorage an toàn với try/catch.
 * Tự động lọc bỏ các bản ghi không hợp lệ hoặc hỏng dữ liệu.
 */
export function getGuestCart(): GuestCartItem[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY)
    if (!raw) return [...inMemoryGuestCart]

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(GUEST_CART_STORAGE_KEY)
      return []
    }

    const validated: GuestCartItem[] = []
    for (const item of parsed) {
      if (
        item &&
        typeof item === 'object' &&
        typeof item.variantId === 'number' &&
        item.variantId > 0 &&
        typeof item.quantity === 'number' &&
        item.quantity > 0
      ) {
        validated.push({
          variantId: Math.floor(item.variantId),
          quantity: Math.min(MAX_ITEM_QUANTITY, Math.max(1, Math.floor(item.quantity))),
        })
      }
    }

    // Giới hạn tối đa 50 dòng
    const truncated = validated.slice(0, MAX_GUEST_CART_ITEMS)
    inMemoryGuestCart = [...truncated]
    return truncated
  } catch {
    return [...inMemoryGuestCart]
  }
}

/**
 * Ghi danh sách giỏ khách vào localStorage an toàn
 */
export function saveGuestCart(items: GuestCartItem[]): void {
  const sanitized = items
    .filter((it) => it.variantId > 0 && it.quantity > 0)
    .slice(0, MAX_GUEST_CART_ITEMS)
    .map((it) => ({
      variantId: Math.floor(it.variantId),
      quantity: Math.min(MAX_ITEM_QUANTITY, Math.max(1, Math.floor(it.quantity))),
    }))

  inMemoryGuestCart = [...sanitized]

  try {
    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(sanitized))
  } catch {
    // Không ném lỗi nếu trình duyệt chặn storage
  }
}

/**
 * Xóa sạch giỏ khách
 */
export function clearGuestCart(): void {
  inMemoryGuestCart = []
  try {
    localStorage.removeItem(GUEST_CART_STORAGE_KEY)
  } catch {
    // Bỏ qua lỗi storage
  }
}

/**
 * Thêm hoặc cộng dồn sản phẩm vào giỏ khách
 * Giới hạn theo min(tồn kho, 20) tính trên TỔNG số lượng đã có + số mới
 */
export function addOrUpdateGuestItem(
  variantId: number,
  quantityToAdd: number,
  stockQuantity: number,
): {
  items: GuestCartItem[]
  totalQuantity: number
  clamped: boolean
  availableStock: number
} {
  const currentItems = getGuestCart()
  const existingIndex = currentItems.findIndex((it) => it.variantId === variantId)

  const allowedMax = Math.min(Math.max(0, stockQuantity), MAX_ITEM_QUANTITY)
  let currentQty = 0

  if (existingIndex >= 0) {
    currentQty = currentItems[existingIndex].quantity
  }

  const requestedTotal = currentQty + quantityToAdd
  let finalQty = requestedTotal
  let clamped = false

  if (requestedTotal > allowedMax) {
    finalQty = Math.max(currentQty, allowedMax)
    clamped = true
  }

  if (existingIndex >= 0) {
    currentItems[existingIndex].quantity = finalQty
  } else {
    // Nếu chưa có thì kiểm tra giới hạn 50 dòng
    if (currentItems.length >= MAX_GUEST_CART_ITEMS) {
      throw new Error(`Giỏ hàng chỉ có thể chứa tối đa ${MAX_GUEST_CART_ITEMS} loại sản phẩm.`)
    }
    currentItems.push({
      variantId,
      quantity: finalQty,
    })
  }

  saveGuestCart(currentItems)

  return {
    items: currentItems,
    totalQuantity: finalQty,
    clamped,
    availableStock: stockQuantity,
  }
}

/**
 * Cập nhật số lượng của một dòng trong giỏ khách
 */
export function updateGuestItemQuantity(
  variantId: number,
  targetQuantity: number,
  stockQuantity: number,
): {
  items: GuestCartItem[]
  finalQuantity: number
  clamped: boolean
} {
  const currentItems = getGuestCart()
  const index = currentItems.findIndex((it) => it.variantId === variantId)

  if (index === -1) {
    return {
      items: currentItems,
      finalQuantity: 0,
      clamped: false,
    }
  }

  const allowedMax = Math.min(Math.max(0, stockQuantity), MAX_ITEM_QUANTITY)
  let finalQty = targetQuantity
  let clamped = false

  if (targetQuantity > allowedMax) {
    finalQty = allowedMax
    clamped = true
  }

  finalQty = Math.max(1, finalQty)
  currentItems[index].quantity = finalQty

  saveGuestCart(currentItems)

  return {
    items: currentItems,
    finalQuantity: finalQty,
    clamped,
  }
}

/**
 * Xóa một dòng khỏi giỏ khách theo variantId
 */
export function removeGuestItem(variantId: number): GuestCartItem[] {
  const currentItems = getGuestCart()
  const filtered = currentItems.filter((it) => it.variantId !== variantId)
  saveGuestCart(filtered)
  return filtered
}

/**
 * Tự động loại bỏ các variant_id không còn tồn tại (từ missing_variant_ids)
 */
export function removeMissingVariants(missingIds: number[]): GuestCartItem[] {
  if (!missingIds || missingIds.length === 0) return getGuestCart()

  const missingSet = new Set(missingIds)
  const currentItems = getGuestCart()
  const filtered = currentItems.filter((it) => !missingSet.has(it.variantId))
  saveGuestCart(filtered)
  return filtered
}
