import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface UiState {
  isCartDrawerOpen: boolean
  isAdminSidebarOpen: boolean
}

const initialState: UiState = {
  isCartDrawerOpen: false,
  isAdminSidebarOpen: true,
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleCartDrawer: (state) => {
      state.isCartDrawerOpen = !state.isCartDrawerOpen
    },
    setCartDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.isCartDrawerOpen = action.payload
    },
    toggleAdminSidebar: (state) => {
      state.isAdminSidebarOpen = !state.isAdminSidebarOpen
    },
    setAdminSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isAdminSidebarOpen = action.payload
    },
  },
})

export const {
  toggleCartDrawer,
  setCartDrawerOpen,
  toggleAdminSidebar,
  setAdminSidebarOpen,
} = uiSlice.actions

export default uiSlice.reducer

