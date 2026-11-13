/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SHOW_DEV_SHORTCUTS?: string
  readonly VITE_ENABLE_NEWSLETTER?: string
  readonly VITE_ENABLE_VNPAY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

