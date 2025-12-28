import { createApiClient } from '@abe-stack/api-client';

const env = import.meta.env as unknown as { VITE_API_URL?: string };
const baseUrl = env.VITE_API_URL ?? 'http://localhost:8080';

export const api = createApiClient({
  baseUrl,
  getToken: () => localStorage.getItem('token'),
});
