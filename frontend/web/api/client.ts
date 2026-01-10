import { createApiClient } from '@api-client';
import { tokenStore } from '@stores';

const env = import.meta.env as unknown as { VITE_API_URL?: string };
const baseUrl = env.VITE_API_URL ?? 'http://localhost:8080'; // host only; /api is added by the client

export const api = createApiClient({
  baseUrl,
  getToken: () => tokenStore.get(),
});
