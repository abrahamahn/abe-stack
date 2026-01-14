// apps/web/src/api/client.ts
import { tokenStore } from '@abe-stack/contracts';
import { createApiClient } from '@abe-stack/sdk';

import { config } from '../config';

export const api = createApiClient({
  baseUrl: config.apiUrl,
  getToken: () => tokenStore.get(),
});
