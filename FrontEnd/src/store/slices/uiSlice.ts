import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface UiState {
  isCartDrawerOpen: boolean
  isAdminSidebarOpen: boolean
  isMobileMenuOpen: boolean
  isSearchOpen: boolean
}

const initialState: UiState = {
  isCartDrawerOpen: false,
  isAdminSidebarOpen: true,
  isMobileMenuOpen: false,
  isSearchOpen: false,
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
    toggleMobileMenu: (state) => {
      state.isMobileMenuOpen = !state.isMobileMenuOpen
    },
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.isMobileMenuOpen = action.payload
    },
    toggleSearch: (state) => {
      state.isSearchOpen = !state.isSearchOpen
    },
    setSearchOpen: (state, action: PayloadAction<boolean>) => {
      state.isSearchOpen = action.payload
    },
  },
})

export const {
  toggleCartDrawer,
  setCartDrawerOpen,
  toggleAdminSidebar,
  setAdminSidebarOpen,
  toggleMobileMenu,
  setMobileMenuOpen,
  toggleSearch,
  setSearchOpen,
} = uiSlice.actions

export default uiSlice.reducer

