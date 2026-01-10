// apps/web/src/api/client.ts
import { tokenStore } from '@abe-stack/shared';
import { createApiClient } from '@api-client';

import { config } from '../config';

export const api = createApiClient({
  baseUrl: config.apiUrl,
  getToken: () => tokenStore.get(),
});
