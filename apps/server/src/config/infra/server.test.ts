// apps/server/src/config/infra/server.test.ts
import type { FullEnv } from '@abe-stack/core/contracts/config';
import { describe, expect, test } from 'vitest';
import { loadServer } from './server';

describe('Server Configuration', () => {
  describe('loadServer', () => {
    test('should load default values when no env vars set', () => {
      const config = loadServer({} as unknown as FullEnv);

      expect(config.host).toBe('0.0.0.0');
      expect(config.port).toBe(8080);
      // Correcting the array match
      expect(config.cors.origin).toEqual(['http://localhost:5173']);
      expect(config.cors.credentials).toBe(true);
    });

    test('should prefer API_PORT over PORT', () => {
      const config = loadServer({
        API_PORT: 3000,
        PORT: 4000,
      } as unknown as FullEnv);

      expect(config.port).toBe(3000);
    });

    test('should include strategic port fallbacks', () => {
      const config = loadServer({} as unknown as FullEnv);
      // Updated to match the high-value hardcoded ports in your logic
      expect(config.portFallbacks).toEqual([8080, 3000, 5000, 8000]);
    });

    test('should handle production-specific defaults', () => {
      const prod = loadServer({ NODE_ENV: 'production' } as unknown as FullEnv);

      // trustProxy should auto-enable in production
      expect(prod.trustProxy).toBe(true);
      // rate limiting should be stricter
      expect(prod.rateLimit.max).toBe(100);
    });

    test('should parse multiple CORS origins', () => {
      const config = loadServer({
        CORS_ORIGIN: 'https://app.com, https://admin.com',
      } as unknown as FullEnv);

      expect(config.cors.origin).toEqual(['https://app.com', 'https://admin.com']);
    });

    test('should handle maintenance mode toggle', () => {
      const normal = loadServer({} as unknown as FullEnv);
      const maintenance = loadServer({ MAINTENANCE_MODE: 'true' } as unknown as FullEnv);

      expect(normal.maintenanceMode).toBe(false);
      expect(maintenance.maintenanceMode).toBe(true);
    });
  });
});
