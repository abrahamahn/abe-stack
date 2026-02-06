export interface RateLimitConfig {
  windowMs: number;
  max: number;
  progressiveDelay?: {
    enabled: boolean;
    baseDelay: number;
    maxDelay: number;
    backoffFactor: number;
  };
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetMs: number;
  allowed: boolean;
}

interface Visit {
  count: number;
  resetTime: number;
  lastVisit: number;
}

export class RateLimiter {
  private readonly visits = new Map<string, Visit>();
  private readonly config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async check(key: string): Promise<RateLimitInfo> {
    const now = Date.now();
    let visit = this.visits.get(key);

    if (visit === undefined || now > visit.resetTime) {
      visit = {
        count: 0,
        resetTime: now + this.config.windowMs,
        lastVisit: now,
      };
      this.visits.set(key, visit);
    }

    visit.count++;

    const allowed = visit.count <= this.config.max;
    const remaining = Math.max(0, this.config.max - visit.count);
    const resetMs = visit.resetTime - now;

    // Simulate async for interface compatibility (e.g. if we move to Redis later)
    return Promise.resolve({
      limit: this.config.max,
      remaining,
      resetMs,
      allowed,
    });
  }

  async destroy(): Promise<void> {
    this.visits.clear();
    return Promise.resolve();
  }
}
