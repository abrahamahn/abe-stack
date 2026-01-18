// apps/web/src/api/client.ts
import { tokenStore } from '@abe-stack/core';
import { createApiClient } from '@abe-stack/sdk';
import { clientConfig } from '@config';

export const api = createApiClient({
  baseUrl: clientConfig.apiUrl,
  getToken: () => tokenStore.get(),
});
