import { TooManyRequestsError } from "@services/shared/errors/ServiceError";

export class RateLimiter {
  private cache = new Map<string, { count: number; expiresAt: number }>();

  constructor(
    protected namespace: string,
    protected windowSeconds: number,
    protected maxRequests: number,
  ) {}

  protected async getCurrentCount(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry || entry.expiresAt < Date.now()) {
      return 0;
    }
    return entry.count;
  }

  protected async increment(key: string, windowSeconds: number): Promise<void> {
    const entry = this.cache.get(key) || {
      count: 0,
      expiresAt: Date.now() + windowSeconds * 1000,
    };
    entry.count++;
    this.cache.set(key, entry);
  }

  protected async reset(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async checkLimit(identifier: string): Promise<void> {
    const key = `${this.namespace}:${identifier}`;
    const now = Date.now();
    const attempt = this.cache.get(key);

    if (!attempt || now > attempt.expiresAt) {
      this.cache.set(key, {
        count: 1,
        expiresAt: now + this.windowSeconds * 1000,
      });
      return;
    }

    if (attempt.count >= this.maxRequests) {
      throw new TooManyRequestsError(
        "Too many attempts. Please try again later.",
      );
    }

    attempt.count++;
  }
}
