/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SHOW_DEV_SHORTCUTS?: string
  readonly VITE_ENABLE_NEWSLETTER?: string
  readonly VITE_ENABLE_VNPAY?: string
  readonly VITE_ENABLE_WISHLIST?: string
  readonly VITE_ENABLE_AI_STYLING?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

