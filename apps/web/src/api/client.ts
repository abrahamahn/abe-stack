// apps/web/src/api/client.ts
import { tokenStore } from '@abe-stack/core';
import { createApiClient } from '@abe-stack/sdk';
import { clientConfig } from '@config';

import type { TokenStore } from '@abe-stack/core';
import type { ApiClient } from '@abe-stack/sdk';

const tokenStoreTyped: TokenStore = tokenStore;
const createApiClientTyped: (config: {
  baseUrl: string;
  getToken: () => string | null;
}) => ApiClient = createApiClient;

export const api = createApiClientTyped({
  baseUrl: clientConfig.apiUrl,
  getToken: () => tokenStoreTyped.get(),
});
