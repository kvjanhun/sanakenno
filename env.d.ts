/** Minimal Vite env types for root tsc (web tests import web code that uses import.meta.env). */
interface ImportMetaEnv {
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
