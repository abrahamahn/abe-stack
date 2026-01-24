// apps/server/src/config/auth/jwt.test.ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_JWT_ROTATION_CONFIG, loadJwtRotationConfig } from './jwt';

describe('JWT Rotation Configuration', () => {
  it('loads default configuration when no environment variables are set', () => {
    const env = {};
    const config = loadJwtRotationConfig(env);

    expect(config).toEqual({
      secret: '',
      previousSecret: undefined,
    });
  });

  it('loads JWT secret from environment variable', () => {
    const env = { JWT_SECRET: '32-char-min-secret-for-security-best-practice' };
    const config = loadJwtRotationConfig(env);

    expect(config).toMatchObject({
      secret: '32-char-min-secret-for-security-best-practice',
    });
  });

  it('loads both current and previous JWT secrets when available', () => {
    const env = {
      JWT_SECRET: 'my-current-secret-key-that-is-at-least-32-characters-long',
      JWT_SECRET_PREVIOUS: 'my-previous-secret-key-that-is-at-least-32-characters-long',
    };
    const config = loadJwtRotationConfig(env);

    expect(config).toEqual({
      secret: 'my-current-secret-key-that-is-at-least-32-characters-long',
      previousSecret: 'my-previous-secret-key-that-is-at-least-32-characters-long',
    });
  });

  it('handles empty string for previous secret', () => {
    const env = {
      JWT_SECRET: 'my-current-secret-key-that-is-at-least-32-characters-long',
      JWT_SECRET_PREVIOUS: '',
    };
    const config = loadJwtRotationConfig(env);

    expect(config).toEqual({
      secret: 'my-current-secret-key-that-is-at-least-32-characters-long',
      previousSecret: undefined,
    });
  });

  it('exports default configuration constants', () => {
    expect(DEFAULT_JWT_ROTATION_CONFIG).toBeDefined();
    expect(DEFAULT_JWT_ROTATION_CONFIG.secret).toBe('');
    expect(DEFAULT_JWT_ROTATION_CONFIG.previousSecret).toBeUndefined();
  });
});
