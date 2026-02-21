// main/apps/server/src/config/auth/rate-limit.ts
import { RATE_LIMIT_DEFAULTS, getBool, getInt } from '@bslt/shared/config';

import type { RateLimitConfig } from '@bslt/shared/config';

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
    windowMs: getInt(env['RATE_LIMIT_WINDOW_MS'], RATE_LIMIT_DEFAULTS.GLOBAL_WINDOW_MS),
    max: getInt(
      env['RATE_LIMIT_MAX'],
      isProd ? RATE_LIMIT_DEFAULTS.GLOBAL_MAX_PROD : RATE_LIMIT_DEFAULTS.GLOBAL_MAX_DEV,
    ),
    cleanupIntervalMs: getInt(
      env['RATE_LIMIT_CLEANUP_INTERVAL_MS'],
      RATE_LIMIT_DEFAULTS.GLOBAL_WINDOW_MS,
    ),

    progressiveDelay: {
      enabled: progressiveDelayEnabledValue,
      baseDelay: getInt(
        env['RATE_LIMIT_BASE_DELAY_MS'],
        RATE_LIMIT_DEFAULTS.PROGRESSIVE_BASE_DELAY_MS,
      ),
      maxDelay: getInt(
        env['RATE_LIMIT_MAX_DELAY_MS'],
        RATE_LIMIT_DEFAULTS.PROGRESSIVE_MAX_DELAY_MS,
      ),
      backoffFactor: RATE_LIMIT_DEFAULTS.PROGRESSIVE_BACKOFF_FACTOR,
    },
  };
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: RATE_LIMIT_DEFAULTS.GLOBAL_WINDOW_MS,
  max: RATE_LIMIT_DEFAULTS.GLOBAL_MAX_PROD,
  cleanupIntervalMs: RATE_LIMIT_DEFAULTS.GLOBAL_WINDOW_MS,
};
