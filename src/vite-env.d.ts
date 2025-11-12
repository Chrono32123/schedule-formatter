/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TWITCH_CLIENT_ID: string
  readonly VITE_TWITCH_CLIENT_SECRET: string
  readonly VITE_IMGBB_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
