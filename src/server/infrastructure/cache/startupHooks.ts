import { container } from "@/server/infrastructure/di";
import { TYPES } from "@/server/infrastructure/di/types";

import { ICacheService } from "./ICacheService";

/**
 * Initialize cache service on startup
 * @throws Error if initialization fails
 */
export async function initializeCache(): Promise<void> {
  try {
    const cacheService = container.get<ICacheService>(TYPES.CacheService);
    await cacheService.initialize();
  } catch (error) {
    console.error("Failed to initialize cache service:", error);
    throw error;
  }
}

/**
 * Shutdown cache service on application exit
 * @throws Error if shutdown fails
 */
export async function shutdownCache(): Promise<void> {
  try {
    const cacheService = container.get<ICacheService>(TYPES.CacheService);
    await cacheService.shutdown();
  } catch (error) {
    console.error("Failed to shutdown cache service:", error);
    throw error;
  }
}
