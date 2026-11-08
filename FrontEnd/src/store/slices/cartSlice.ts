import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit'
import axios from 'axios'
import { cartService } from '@/services/api/cartService'
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
  error: string | null
}

const initialState: CartState = {
  items: [],
  subtotal: 0,
  totalQuantity: 0,
  itemsCount: 0,
  hasUnpurchasableItems: false,
  isLoading: false,
  isUpdatingItemId: null,
  error: null,
}

// 1. Nạp toàn bộ giỏ hàng từ server
export const fetchCart = createAsyncThunk<
  Cart | null,
  void,
  { state: RootState }
>('cart/fetchCart', async (_, { signal, rejectWithValue }) => {
  // Nếu không có token đăng nhập thì bỏ qua ngay
  const token = localStorage.getItem('mode_studio_token')
  if (!token) {
    return null
  }

  try {
    const data = await cartService.getCart(signal)
    return data
  } catch (err: unknown) {
    if (signal.aborted || axios.isCancel(err)) {
      return rejectWithValue({ aborted: true })
    }
    const message =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || 'Không thể nạp thông tin giỏ hàng.'
    return rejectWithValue({ message })
  }
})

// 2. Thêm sản phẩm vào giỏ và tải lại toàn bộ giỏ từ server
export const addToCart = createAsyncThunk<
  void,
  { variantId: number; quantity: number },
  { state: RootState }
>('cart/addToCart', async ({ variantId, quantity }, { dispatch, rejectWithValue }) => {
  try {
    await cartService.addItem(variantId, quantity)
    await dispatch(fetchCart()).unwrap()
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
})

// 3. Cập nhật số lượng của dòng và tải lại toàn bộ giỏ từ server
export const updateCartItemQuantity = createAsyncThunk<
  void,
  { id: string; quantity: number },
  { state: RootState }
>(
  'cart/updateCartItemQuantity',
  async ({ id, quantity }, { dispatch, rejectWithValue }) => {
    try {
      await cartService.updateItem(id, quantity)
      await dispatch(fetchCart()).unwrap()
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
  },
)

// 4. Xóa dòng khỏi giỏ và tải lại toàn bộ giỏ từ server
export const removeCartItem = createAsyncThunk<
  void,
  string,
  { state: RootState }
>('cart/removeCartItem', async (id, { dispatch, rejectWithValue }) => {
  try {
    await cartService.removeItem(id)
    await dispatch(fetchCart()).unwrap()
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || 'Không thể xóa món hàng.'
    return rejectWithValue({ id, message })
  }
})

// 5. Xóa toàn bộ giỏ hàng
export const clearCart = createAsyncThunk<
  void,
  void,
  { state: RootState }
>('cart/clearCart', async (_, { dispatch, rejectWithValue }) => {
  try {
    await cartService.clearCart()
    await dispatch(fetchCart()).unwrap()
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message || 'Không thể xóa toàn bộ giỏ hàng.'
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
      state.error = null
    },
    setUpdatingItemId: (state, action: PayloadAction<string | null>) => {
      state.isUpdatingItemId = action.payload
    },
  },
  extraReducers: (builder) => {
    // fetchCart
    builder.addCase(fetchCart.pending, (state) => {
      state.isLoading = true
      state.error = null
    })
    builder.addCase(fetchCart.fulfilled, (state, action) => {
      state.isLoading = false
      // Nếu đã đăng xuất trong lúc request đang bay thì không nạp vào state
      if (!localStorage.getItem('mode_studio_token') || !action.payload) {
        state.items = []
        state.subtotal = 0
        state.totalQuantity = 0
        state.itemsCount = 0
        state.hasUnpurchasableItems = false
        return
      }

      state.items = action.payload.items
      state.subtotal = action.payload.subtotal
      state.totalQuantity = action.payload.totalQuantity
      state.itemsCount = action.payload.itemsCount
      state.hasUnpurchasableItems = action.payload.hasUnpurchasableItems
    })
    builder.addCase(fetchCart.rejected, (state, action) => {
      state.isLoading = false
      const payload = action.payload as { aborted?: boolean; message?: string } | undefined
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

export const { resetCart, setUpdatingItemId } = cartSlice.actions

export const selectCartItems = (state: RootState) => state.cart.items
export const selectCartSubtotal = (state: RootState) => state.cart.subtotal
export const selectCartTotalQuantity = (state: RootState) => state.cart.totalQuantity
export const selectCartItemsCount = (state: RootState) => state.cart.itemsCount
export const selectCartHasUnpurchasableItems = (state: RootState) =>
  state.cart.hasUnpurchasableItems
export const selectCartLoading = (state: RootState) => state.cart.isLoading
export const selectCartUpdatingItemId = (state: RootState) =>
  state.cart.isUpdatingItemId
export const selectCartError = (state: RootState) => state.cart.error

export default cartSlice.reducer
