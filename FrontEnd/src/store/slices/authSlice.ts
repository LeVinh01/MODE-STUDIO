import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { User } from '@/types/auth'
import type { RootState } from '../index'

export interface AuthState {
  user: User | null
  isInitialized: boolean
  isLoading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  isInitialized: false,
  isLoading: false,
  error: null,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload
      state.error = null
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    resetAuth: (state) => {
      state.user = null
      state.error = null
    },
  },
})

export const { setUser, setInitialized, setLoading, setError, resetAuth } =
  authSlice.actions

export const selectCurrentUser = (state: RootState) => state.auth.user
export const selectIsAuthInitialized = (state: RootState) =>
  state.auth.isInitialized
export const selectAuthLoading = (state: RootState) => state.auth.isLoading
export const selectAuthError = (state: RootState) => state.auth.error
export const selectIsAuthenticated = (state: RootState) =>
  Boolean(state.auth.user)
export const selectUserRole = (state: RootState) => state.auth.user?.role

export default authSlice.reducer
