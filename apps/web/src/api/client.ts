// apps/web/src/api/client.ts
import { createApiClient } from '@abe-stack/sdk';
import { tokenStore } from '@abe-stack/shared';

import { config } from '../config';

export const api = createApiClient({
  baseUrl: config.apiUrl,
  getToken: () => tokenStore.get(),
});
