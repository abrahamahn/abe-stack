// apps/server/src/config/auth/rate-limit.ts
import { getBool, getInt } from '@abe-stack/shared/config';

import type { RateLimitConfig } from '@abe-stack/shared/config';

/**
 * Load Rate Limit Configuration.
 *
 * Configures the "Global" API rate limit as well as progressive delay settings.
 *
 * **Progressive Delay**:
 * Instead of hard-blocking users immediately, we can slow down responses
 * (backoff) to discourage brute-force or scraping without impacting legitimate users.
 */
export function loadRateLimitConfig(env: Record<string, string | undefined>): RateLimitConfig {
  const isProd = env['NODE_ENV'] === 'production';

  const progressiveDelayEnabled = env['RATE_LIMIT_PROGRESSIVE_DELAY_ENABLED'];
  const progressiveDelayEnabledValue =
    progressiveDelayEnabled != null && progressiveDelayEnabled !== ''
      ? getBool(progressiveDelayEnabled)
      : true;

  return {
    windowMs: getInt(env['RATE_LIMIT_WINDOW_MS'], 60 * 1000),
    max: getInt(env['RATE_LIMIT_MAX'], isProd ? 100 : 1000),
    cleanupIntervalMs: getInt(env['RATE_LIMIT_CLEANUP_INTERVAL_MS'], 60 * 1000),

    progressiveDelay: {
      enabled: progressiveDelayEnabledValue,
      baseDelay: getInt(env['RATE_LIMIT_BASE_DELAY_MS'], 1000),
      maxDelay: getInt(env['RATE_LIMIT_MAX_DELAY_MS'], 10000),
      backoffFactor: 2,
    },
  };
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60000,
  max: 100,
  cleanupIntervalMs: 60000,
};
