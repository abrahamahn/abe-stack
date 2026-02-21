// main/server/core/src/auth/handlers/strategies.ts
import { AUTH_STRATEGIES } from '@bslt/shared/config';

import type { AppContext } from '../types';
import type { AuthStrategy } from '@bslt/shared';

export interface AuthStrategiesResponse {
  enabled: AuthStrategy[];
  disabled: AuthStrategy[];
}

export function handleGetAuthStrategies(ctx: AppContext): {
  status: 200;
  body: AuthStrategiesResponse;
} {
  const enabledRaw = Array.isArray(ctx.config.auth.strategies) ? ctx.config.auth.strategies : [];
  const enabled = enabledRaw.filter((s): s is AuthStrategy => AUTH_STRATEGIES.includes(s));
  const disabled = AUTH_STRATEGIES.filter((s) => !enabled.includes(s));

  return {
    status: 200,
    body: { enabled, disabled },
  };
}
