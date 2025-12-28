import { UserType } from "@/server/database/models/auth";
import { PostRateLimitError } from "@/server/services/shared/errors/PostErrors";
import { MetricsService } from "@/server/services/shared/monitoring";

import { RateLimiter } from "./RateLimiter";

interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
}

export class PostRateLimiter extends RateLimiter {
  private readonly metrics: MetricsService;
  private readonly limitsByUserType: Map<UserType, RateLimitConfig>;
  protected namespace: string;

  constructor() {
    super("post_creation", 3600, 100);
    this.metrics = MetricsService.getInstance();
    this.namespace = "post_creation";

    // Configure rate limits by user type
    this.limitsByUserType = new Map([
      [UserType.PREMIUM, { windowSeconds: 3600, maxRequests: 500 }],
      [UserType.VERIFIED, { windowSeconds: 3600, maxRequests: 200 }],
      [UserType.STANDARD, { windowSeconds: 3600, maxRequests: 100 }],
      [UserType.RESTRICTED, { windowSeconds: 3600, maxRequests: 20 }],
    ]);
  }

  protected async getCurrentCount(key: string): Promise<number> {
    return super.getCurrentCount(key);
  }

  protected async increment(key: string, windowSeconds: number): Promise<void> {
    await super.increment(key, windowSeconds);
  }

  protected async reset(key: string): Promise<void> {
    await super.reset(key);
  }

  public async checkLimit(
    userId: string,
    userType: UserType = UserType.STANDARD
  ): Promise<void> {
    const config =
      this.limitsByUserType.get(userType) ||
      this.limitsByUserType.get(UserType.STANDARD)!;

    try {
      const key = this.generateKey(userId, userType);
      const current = await this.getCurrentCount(key);

      if (current >= config.maxRequests) {
        this.metrics.recordRateLimit(userType);
        throw new PostRateLimitError(
          `Rate limit exceeded for ${userType} user. Maximum ${config.maxRequests} posts per ${config.windowSeconds / 3600} hour(s).`
        );
      }

      await this.increment(key, config.windowSeconds);
    } catch (error) {
      if (error instanceof PostRateLimitError) {
        throw error;
      }
      throw new Error("Error checking rate limit");
    }
  }

  public async getRemainingLimit(
    userId: string,
    userType: UserType = UserType.STANDARD
  ): Promise<number> {
    const config =
      this.limitsByUserType.get(userType) ||
      this.limitsByUserType.get(UserType.STANDARD)!;
    const key = this.generateKey(userId, userType);
    const current = await this.getCurrentCount(key);
    return Math.max(0, config.maxRequests - current);
  }

  public async resetLimit(
    userId: string,
    userType: UserType = UserType.STANDARD
  ): Promise<void> {
    const key = this.generateKey(userId, userType);
    await this.reset(key);
  }

  private generateKey(userId: string, userType: UserType): string {
    return `${this.namespace}:${userType}:${userId}`;
  }

  public getLimitConfig(userType: UserType): RateLimitConfig {
    return (
      this.limitsByUserType.get(userType) ||
      this.limitsByUserType.get(UserType.STANDARD)!
    );
  }

  public async isWithinLimit(
    userId: string,
    userType: UserType = UserType.STANDARD
  ): Promise<boolean> {
    try {
      await this.checkLimit(userId, userType);
      return true;
    } catch (error) {
      if (error instanceof PostRateLimitError) {
        return false;
      }
      throw error;
    }
  }
}
