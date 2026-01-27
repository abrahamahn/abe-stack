// apps/web/src/api/client.ts
import { tokenStore } from '@abe-stack/core';
import { createApiClient, type ApiClient } from '@abe-stack/sdk';
import { clientConfig } from '@/config';

export const api: ApiClient = createApiClient({
  baseUrl: clientConfig.apiUrl,
  getToken: () => tokenStore.get(),
});
