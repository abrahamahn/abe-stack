/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_HOST: string;
  readonly VITE_APP_TITLE: string;
  // Add other env variables as needed
  readonly [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// For window.__config
interface Window {
  __config?: any;
}