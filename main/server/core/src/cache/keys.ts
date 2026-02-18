// main/server/core/src/cache/keys.ts

import { MS_PER_MINUTE } from '@bslt/shared';

export const CacheKeys = {
  user: (id: string) => `user:${id}`,
  userByEmail: (email: string) => `user:email:${email}`,
  featureFlags: (tenantId: string) => `flags:${tenantId}`,
  featureFlagsGlobal: () => 'flags:global',
  entitlements: (tenantId: string) => `entitlements:${tenantId}`,
} as const;

export const CacheTags = {
  user: (id: string) => `user:${id}`,
  featureFlags: () => 'feature-flags',
  entitlements: (tenantId: string) => `entitlements:${tenantId}`,
} as const;

export const CacheTTL = {
  user: 5 * MS_PER_MINUTE,
  featureFlags: MS_PER_MINUTE,
  entitlements: 5 * MS_PER_MINUTE,
} as const;
