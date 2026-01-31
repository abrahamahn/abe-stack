// apps/web/src/api/client.ts
import { createApiClient, type ApiClient } from '@abe-stack/client';
import { tokenStore } from '@abe-stack/core';

import { clientConfig } from '@/config';

export const api: ApiClient = createApiClient({
  baseUrl: clientConfig.apiUrl,
  getToken: (): string | null => tokenStore.get(),
});
