import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import axios from 'axios'
import { cartService } from '@/services/api/cartService'
import { mapApiCartToCart } from '@/services/api/mappers'
import * as guestCartStorage from '@/utils/guestCartStorage'
import type { GuestCartItem } from '@/utils/guestCartStorage'
import type { Cart, CartItem } from '@/types/cart'
import type { RootState } from '../index'

export interface CartState {
  items: CartItem[]
  subtotal: number
  totalQuantity: number
  itemsCount: number
  hasUnpurchasableItems: boolean
  isLoading: boolean
  isUpdatingItemId: string | null
  isMerging: boolean
  error: string | null
  noticeMessage: string | null
  latestRequestId: string | null
}

const initialState: CartState = {
  items: [],
  subtotal: 0,
  totalQuantity: 0,
  itemsCount: 0,
  hasUnpurchasableItems: false,
  isLoading: false,
  isUpdatingItemId: null,
  isMerging: false,
  error: null,
  noticeMessage: null,
  latestRequestId: null,
}

export interface FetchCartOptions {
  isUserAction?: boolean
  rollbackSnapshot?: GuestCartItem[]
}

// 1. Nạp toàn bộ giỏ hàng (hỗ trợ cả giỏ tài khoản và giỏ khách vãng lai)
export const fetchCart = createAsyncThunk<
  { cart: Cart; missingVariantsRemoved?: number },
  FetchCartOptions | undefined,
  { state: RootState }
>('cart/fetchCart', async (options, { signal, rejectWithValue }) => {
  const token = localStorage.getItem('mode_studio_token')

  try {
    if (token) {
      // Người dùng đã đăng nhập: lấy giỏ hàng từ máy chủ
      const data = await cartService.getCart(signal)
      return { cart: data }
    }

    // Khách chưa đăng nhập: đọc giỏ hàng từ localStorage và gọi /cart/quote
    const guestItems = guestCartStorage.getGuestCart()

    if (guestItems.length === 0) {
      return {
        cart: {
          items: [],
          subtotal: 0,
          totalQuantity: 0,
          itemsCount: 0,
          hasUnpurchasableItems: false,
        },
      }
    }

    const payload = guestItems.map((it) => ({
      variant_id: it.variantId,
      quantity: it.quantity,
    }))

    const quoteRes = await cartService.quoteCart(payload, signal)

    // Nếu server báo các variant_id không còn tồn tại: tự động loại bỏ khỏi giỏ khách
    let missingCount = 0
    if (quoteRes.missing_variant_ids && quoteRes.missing_variant_ids.length > 0) {
      missingCount = quoteRes.missing_variant_ids.length
      guestCartStorage.removeMissingVariants(quoteRes.missing_variant_ids)
    }

    const mapped = mapApiCartToCart(quoteRes)
    return { cart: mapped, missingVariantsRemoved: missingCount }
  } catch (err: unknown) {
    if (signal.aborted || axios.isCancel(err)) {
      return rejectWithValue({ aborted: true })
    }

    // Ca biên: nếu thao tác của người dùng thất bại (429, lỗi mạng, 5xx), hoàn lại storage về trạng thái trước đó
    if (options?.isUserAction && options.rollbackSnapshot) {
      guestCartStorage.saveGuestCart(options.rollbackSnapshot)
    }

    const axiosError = err as {
      response?: {
        status?: number
        data?: { message?: string }
      }
    }

    let message = 'Không thể tải thông tin giỏ hàng.'
    if (axiosError.response?.status === 429) {
      message = 'Bạn thao tác quá nhanh. Vui lòng thử lại sau 1 phút.'
    } else if (axiosError.response?.data?.message) {
      message = axiosError.response.data.message
    } else if (typeof window !== 'undefined' && !window.navigator.onLine) {
      message = 'Mất kết nối mạng. Thao tác giỏ hàng chưa thể lưu lại.'
    }

    return rejectWithValue({ message, isUserAction: options?.isUserAction })
  }
})

// 2. Thêm sản phẩm vào giỏ (hỗ trợ cả tài khoản và khách)
export const addToCart = createAsyncThunk<
  { clamped?: boolean; stock?: number },
  { variantId: number; quantity: number; stockQuantity?: number },
  { state: RootState }
>(
  'cart/addToCart',
  async ({ variantId, quantity, stockQuantity = 20 }, { dispatch, rejectWithValue }) => {
    const token = localStorage.getItem('mode_studio_token')

    if (token) {
      try {
        await cartService.addItem(variantId, quantity)
        await dispatch(fetchCart()).unwrap()
        return {}
      } catch (err: unknown) {
        const axiosError = err as {
          response?: {
            status?: number
            data?: {
              message?: string
              errors?: { quantity?: string[]; variant_id?: string[] }
              available_stock?: number
            }
          }
        }
        return rejectWithValue(
          axiosError.response?.data || {
            message: 'Không thể thêm sản phẩm vào giỏ hàng.',
          },
        )
      }
    }

    // Khách vãng lai: lưu snapshot trước khi ghi
    const snapshot = guestCartStorage.getGuestCart()

    try {
      const addResult = guestCartStorage.addOrUpdateGuestItem(
        variantId,
        quantity,
        stockQuantity,
      )

      await dispatch(
        fetchCart({
          isUserAction: true,
          rollbackSnapshot: snapshot,
        }),
      ).unwrap()

      return {
        clamped: addResult.clamped,
        stock: addResult.availableStock,
      }
    } catch (err: unknown) {
      // Đã rollback trong fetchCart nếu quote lỗi, nếu lỗi khác thì rollback tại đây
      guestCartStorage.saveGuestCart(snapshot)
      const errorMsg = (err as { message?: string })?.message || 'Không thể thêm sản phẩm vào giỏ hàng.'
      return rejectWithValue({ message: errorMsg })
    }
  },
)

// 3. Cập nhật số lượng của dòng trong giỏ
export const updateCartItemQuantity = createAsyncThunk<
  void,
  { id: string; quantity: number; stockQuantity?: number },
  { state: RootState }
>(
  'cart/updateCartItemQuantity',
  async ({ id, quantity, stockQuantity = 20 }, { dispatch, rejectWithValue }) => {
    const token = localStorage.getItem('mode_studio_token')

    if (token) {
      try {
        await cartService.updateItem(id, quantity)
        await dispatch(fetchCart()).unwrap()
        return
      } catch (err: unknown) {
        const axiosError = err as {
          response?: {
            status?: number
            data?: {
              message?: string
              errors?: { quantity?: string[] }
              available_stock?: number
            }
          }
        }
        return rejectWithValue({
          id,
          data:
            axiosError.response?.data || {
              message: 'Không thể cập nhật số lượng.',
            },
        })
      }
    }

    // Khách vãng lai: trích xuất variantId từ id "guest-<variantId>"
    const variantId = Number(id.replace('guest-', ''))
    const snapshot = guestCartStorage.getGuestCart()

    try {
      guestCartStorage.updateGuestItemQuantity(
        variantId,
        quantity,
        stockQuantity,
      )

      await dispatch(
        fetchCart({
          isUserAction: true,
          rollbackSnapshot: snapshot,
        }),
      ).unwrap()
    } catch (err: unknown) {
      guestCartStorage.saveGuestCart(snapshot)
      const errorMsg = (err as { message?: string })?.message || 'Không thể cập nhật số lượng.'
      return rejectWithValue({ id, data: { message: errorMsg } })
    }
  },
)

// 4. Xóa dòng khỏi giỏ
export const removeCartItem = createAsyncThunk<
  void,
  string,
  { state: RootState }
>('cart/removeCartItem', async (id, { dispatch, rejectWithValue }) => {
  const token = localStorage.getItem('mode_studio_token')

  if (token) {
    try {
      await cartService.removeItem(id)
      await dispatch(fetchCart()).unwrap()
      return
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Không thể xóa món hàng.'
      return rejectWithValue({ id, message })
    }
  }

  // Khách vãng lai
  const variantId = Number(id.replace('guest-', ''))
  const snapshot = guestCartStorage.getGuestCart()

  try {
    guestCartStorage.removeGuestItem(variantId)
    await dispatch(
      fetchCart({
        isUserAction: true,
        rollbackSnapshot: snapshot,
      }),
    ).unwrap()
  } catch (err: unknown) {
    guestCartStorage.saveGuestCart(snapshot)
    const message = (err as { message?: string })?.message || 'Không thể xóa món hàng.'
    return rejectWithValue({ id, message })
  }
})

// 5. Xóa toàn bộ giỏ hàng
export const clearCart = createAsyncThunk<
  void,
  void,
  { state: RootState }
>('cart/clearCart', async (_, { dispatch, rejectWithValue }) => {
  const token = localStorage.getItem('mode_studio_token')

  if (token) {
    try {
      await cartService.clearCart()
      await dispatch(fetchCart()).unwrap()
      return
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Không thể xóa toàn bộ giỏ hàng.'
      return rejectWithValue({ message })
    }
  }

  // Khách vãng lai
  const snapshot = guestCartStorage.getGuestCart()
  try {
    guestCartStorage.clearGuestCart()
    await dispatch(
      fetchCart({
        isUserAction: true,
        rollbackSnapshot: snapshot,
      }),
    ).unwrap()
  } catch (err: unknown) {
    guestCartStorage.saveGuestCart(snapshot)
    const message = (err as { message?: string })?.message || 'Không thể xóa toàn bộ giỏ hàng.'
    return rejectWithValue({ message })
  }
})

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Đăng xuất hoặc đổi phiên: xóa sạch state giỏ ngay lập tức
    resetCart: (state) => {
      state.items = []
      state.subtotal = 0
      state.totalQuantity = 0
      state.itemsCount = 0
      state.hasUnpurchasableItems = false
      state.isLoading = false
      state.isUpdatingItemId = null
      state.isMerging = false
      state.error = null
      state.noticeMessage = null
      state.latestRequestId = null
    },
    // Gán trực tiếp dữ liệu giỏ hàng mới (dùng khi merge thành công)
    setCart: (state, action: PayloadAction<Cart>) => {
      state.items = action.payload.items
      state.subtotal = action.payload.subtotal
      state.totalQuantity = action.payload.totalQuantity
      state.itemsCount = action.payload.itemsCount
      state.hasUnpurchasableItems = action.payload.hasUnpurchasableItems
      // Xóa latestRequestId để mọi fetchCart cũ chạy trước đó không được ghi đè
      state.latestRequestId = null
      state.isLoading = false
    },
    setIsMerging: (state, action: PayloadAction<boolean>) => {
      state.isMerging = action.payload
    },
    setUpdatingItemId: (state, action: PayloadAction<string | null>) => {
      state.isUpdatingItemId = action.payload
    },
    setNoticeMessage: (state, action: PayloadAction<string | null>) => {
      state.noticeMessage = action.payload
    },
    clearNoticeMessage: (state) => {
      state.noticeMessage = null
    },
  },
  extraReducers: (builder) => {
    // fetchCart
    builder.addCase(fetchCart.pending, (state, action) => {
      state.isLoading = true
      state.latestRequestId = action.meta.requestId
      state.error = null
    })
    builder.addCase(fetchCart.fulfilled, (state, action) => {
      // Yêu cầu 3: Request mới nhất thắng, bỏ qua phản hồi của request cũ đến muộn
      if (state.latestRequestId !== action.meta.requestId) {
        return
      }

      state.isLoading = false

      if (!action.payload?.cart) {
        state.items = []
        state.subtotal = 0
        state.totalQuantity = 0
        state.itemsCount = 0
        state.hasUnpurchasableItems = false
        return
      }

      const cart = action.payload.cart
      state.items = cart.items
      state.subtotal = cart.subtotal
      state.totalQuantity = cart.totalQuantity
      state.itemsCount = cart.itemsCount
      state.hasUnpurchasableItems = cart.hasUnpurchasableItems

      if (
        action.payload.missingVariantsRemoved &&
        action.payload.missingVariantsRemoved > 0
      ) {
        state.noticeMessage = `${action.payload.missingVariantsRemoved} sản phẩm không còn tồn tại đã được loại khỏi giỏ hàng.`
      }
    })
    builder.addCase(fetchCart.rejected, (state, action) => {
      if (state.latestRequestId !== action.meta.requestId) {
        return
      }

      state.isLoading = false
      const payload = action.payload as
        | { aborted?: boolean; message?: string }
        | undefined

      if (payload?.aborted) {
        return
      }
      state.error = payload?.message || 'Không thể tải giỏ hàng.'
    })

    // updateCartItemQuantity
    builder.addCase(updateCartItemQuantity.pending, (state, action) => {
      state.isUpdatingItemId = action.meta.arg.id
    })
    builder.addCase(updateCartItemQuantity.fulfilled, (state) => {
      state.isUpdatingItemId = null
    })
    builder.addCase(updateCartItemQuantity.rejected, (state) => {
      state.isUpdatingItemId = null
    })

    // removeCartItem
    builder.addCase(removeCartItem.pending, (state, action) => {
      state.isUpdatingItemId = action.meta.arg
    })
    builder.addCase(removeCartItem.fulfilled, (state) => {
      state.isUpdatingItemId = null
    })
    builder.addCase(removeCartItem.rejected, (state) => {
      state.isUpdatingItemId = null
    })
  },
})

export const {
  resetCart,
  setCart,
  setIsMerging,
  setUpdatingItemId,
  setNoticeMessage,
  clearNoticeMessage,
} = cartSlice.actions

export const selectCartItems = (state: RootState) => state.cart.items
export const selectCartSubtotal = (state: RootState) => state.cart.subtotal
export const selectCartTotalQuantity = (state: RootState) => state.cart.totalQuantity
export const selectCartItemsCount = (state: RootState) => state.cart.itemsCount
export const selectCartHasUnpurchasableItems = (state: RootState) =>
  state.cart.hasUnpurchasableItems
export const selectCartLoading = (state: RootState) => state.cart.isLoading
export const selectCartUpdatingItemId = (state: RootState) =>
  state.cart.isUpdatingItemId
export const selectCartIsMerging = (state: RootState) => state.cart.isMerging
export const selectCartError = (state: RootState) => state.cart.error
export const selectCartNoticeMessage = (state: RootState) => state.cart.noticeMessage

export default cartSlice.reducer
