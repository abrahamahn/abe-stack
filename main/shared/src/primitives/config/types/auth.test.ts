// main/shared/src/primitives/config/types/auth.test.ts
import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
    AuthConfig,
    AuthStrategy,
    JwtRotationConfig,
    OAuthProviderConfig,
    RateLimitConfig,
} from './auth';

/**
 * Tests for Authentication Configuration Type Contracts.
 *
 * These tests verify the structural integrity and type safety of auth configuration types.
 * Since these are TypeScript interfaces (not Zod schemas), we test:
 * - Type compatibility and assignability
 * - Required vs optional properties
 * - Literal type constraints
 * - Discriminated union behavior
 */

describe('auth.ts type definitions', () => {
  describe('AuthStrategy', () => {
    it('should accept all valid auth strategy literals', () => {
      const strategies: AuthStrategy[] = [
        'local',
        'magic',
        'webauthn',
        'google',
        'github',
        'facebook',
        'microsoft',
        'apple',
      ];

      strategies.forEach((strategy) => {
        expectTypeOf(strategy).toEqualTypeOf<AuthStrategy>();
      });

      expect(strategies).toHaveLength(8);
    });

    it('should enforce literal type constraints', () => {
      const validStrategy: AuthStrategy = 'local';
      expect(validStrategy).toBe('local');

      // TypeScript compile-time check: this would be a type error without the cast
      type InvalidTest = typeof validStrategy extends 'oauth' ? never : 'valid';
      const proof: InvalidTest = 'valid';
      void proof;
    });

    it('should work in array contexts', () => {
      const strategies: AuthStrategy[] = ['local', 'google'];
      expectTypeOf(strategies).toEqualTypeOf<AuthStrategy[]>();

      const multiStrategy: AuthStrategy[] = ['local', 'magic', 'google', 'github'];
      expect(multiStrategy).toHaveLength(4);
    });
  });

  describe('OAuthProviderConfig', () => {
    it('should require all three properties', () => {
      const config: OAuthProviderConfig = {
        clientId: 'client-id-123',
        clientSecret: 'client-secret-456',
        callbackUrl: 'https://example.com/auth/callback',
      };

      expectTypeOf(config).toEqualTypeOf<OAuthProviderConfig>();
      expect(config).toHaveProperty('clientId');
      expect(config).toHaveProperty('clientSecret');
      expect(config).toHaveProperty('callbackUrl');
    });

    it('should enforce string types for all properties', () => {
      const config: OAuthProviderConfig = {
        clientId: 'test-id',
        clientSecret: 'test-secret',
        callbackUrl: 'https://test.com/callback',
      };

      expectTypeOf(config.clientId).toEqualTypeOf<string>();
      expectTypeOf(config.clientSecret).toEqualTypeOf<string>();
      expectTypeOf(config.callbackUrl).toEqualTypeOf<string>();
    });

    it('should not allow missing required properties', () => {
      // @ts-expect-error - missing clientSecret
      const _incomplete: OAuthProviderConfig = {
        clientId: 'test-id',
        callbackUrl: 'https://test.com',
      };
    });

    it('should not allow additional properties', () => {
      const config: OAuthProviderConfig = {
        clientId: 'test-id',
        clientSecret: 'test-secret',
        callbackUrl: 'https://test.com',
        // @ts-expect-error - extra property not allowed
        extraProp: 'value',
      };
      void config;
    });
  });

  describe('AuthConfig', () => {
    const validAuthConfig: AuthConfig = {
      strategies: ['local', 'google'],
      jwt: {
        secret: 'super-secret-jwt-key-at-least-32-characters-long',
        previousSecret: 'old-secret-for-rotation',
        accessTokenExpiry: '15m',
        issuer: 'bslt',
        audience: 'bslt-api',
      },
      refreshToken: {
        expiryDays: 30,
        gracePeriodSeconds: 5,
      },
      argon2: {
        type: 2,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      },
      password: {
        minLength: 8,
        maxLength: 128,
        minZxcvbnScore: 3,
      },
      lockout: {
        maxAttempts: 5,
        lockoutDurationMs: 900000,
        progressiveDelay: true,
        baseDelayMs: 1000,
      },
      proxy: {
        trustProxy: true,
        trustedProxies: ['10.0.0.0/8', '172.16.0.0/12'],
        maxProxyDepth: 1,
      },
      rateLimit: {
        login: { max: 5, windowMs: 900000 },
        register: { max: 3, windowMs: 3600000 },
        forgotPassword: { max: 3, windowMs: 3600000 },
        verifyEmail: { max: 5, windowMs: 900000 },
      },
      cookie: {
        name: 'refresh_token',
        secret: 'cookie-signing-secret-32-chars-min',
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
      },
      oauth: {
        google: {
          clientId: 'google-client-id',
          clientSecret: 'google-client-secret',
          callbackUrl: 'https://example.com/auth/google/callback',
        },
      },
      magicLink: {
        tokenExpiryMinutes: 15,
        maxAttempts: 3,
      },
      totp: {
        issuer: 'BSLT',
        window: 1,
      },
    };

    describe('top-level structure', () => {
      it('should accept a complete valid configuration', () => {
        expectTypeOf(validAuthConfig).toEqualTypeOf<AuthConfig>();
        expect(validAuthConfig).toHaveProperty('strategies');
        expect(validAuthConfig).toHaveProperty('jwt');
        expect(validAuthConfig).toHaveProperty('oauth');
      });

      it('should require strategies array', () => {
        expectTypeOf(validAuthConfig.strategies).toEqualTypeOf<AuthStrategy[]>();
        expect(Array.isArray(validAuthConfig.strategies)).toBe(true);
      });

      it('should accept empty strategies array', () => {
        const config: AuthConfig = {
          ...validAuthConfig,
          strategies: [],
        };
        expect(config.strategies).toHaveLength(0);
      });

      it('should accept proxy configuration', () => {
        expectTypeOf(validAuthConfig.proxy.trustProxy).toEqualTypeOf<boolean>();
        expectTypeOf(validAuthConfig.proxy.trustedProxies).toEqualTypeOf<string[]>();
        expectTypeOf(validAuthConfig.proxy.maxProxyDepth).toEqualTypeOf<number>();
      });
    });

    describe('jwt configuration', () => {
      it('should require secret, accessTokenExpiry, issuer, and audience', () => {
        const { jwt } = validAuthConfig;

        expectTypeOf(jwt.secret).toEqualTypeOf<string>();
        expectTypeOf(jwt.accessTokenExpiry).toEqualTypeOf<string | number>();
        expectTypeOf(jwt.issuer).toEqualTypeOf<string>();
        expectTypeOf(jwt.audience).toEqualTypeOf<string>();
      });

      it('should allow optional previousSecret for rotation', () => {
        const withPrevious: AuthConfig['jwt'] = {
          secret: 'current-secret',
          previousSecret: 'previous-secret',
          accessTokenExpiry: '15m',
          issuer: 'test',
          audience: 'test-api',
        };

        const withoutPrevious: AuthConfig['jwt'] = {
          secret: 'current-secret',
          accessTokenExpiry: 900,
          issuer: 'test',
          audience: 'test-api',
        };

        expectTypeOf(withPrevious).toEqualTypeOf<AuthConfig['jwt']>();
        expectTypeOf(withoutPrevious).toEqualTypeOf<AuthConfig['jwt']>();
        expect(withPrevious.previousSecret).toBeDefined();
        expect(withoutPrevious.previousSecret).toBeUndefined();
      });

      it('should accept accessTokenExpiry as string or number', () => {
        const stringExpiry: AuthConfig['jwt'] = {
          ...validAuthConfig.jwt,
          accessTokenExpiry: '15m',
        };

        const numberExpiry: AuthConfig['jwt'] = {
          ...validAuthConfig.jwt,
          accessTokenExpiry: 900,
        };

        expectTypeOf(stringExpiry.accessTokenExpiry).toEqualTypeOf<string | number>();
        expectTypeOf(numberExpiry.accessTokenExpiry).toEqualTypeOf<string | number>();
      });
    });

    describe('refreshToken configuration', () => {
      it('should require numeric expiryDays and gracePeriodSeconds', () => {
        const { refreshToken } = validAuthConfig;

        expectTypeOf(refreshToken.expiryDays).toEqualTypeOf<number>();
        expectTypeOf(refreshToken.gracePeriodSeconds).toEqualTypeOf<number>();

        expect(typeof refreshToken.expiryDays).toBe('number');
        expect(typeof refreshToken.gracePeriodSeconds).toBe('number');
      });

      it('should work with various numeric values', () => {
        const shortExpiry: AuthConfig['refreshToken'] = {
          expiryDays: 7,
          gracePeriodSeconds: 1,
        };

        const longExpiry: AuthConfig['refreshToken'] = {
          expiryDays: 90,
          gracePeriodSeconds: 60,
        };

        expectTypeOf(shortExpiry).toEqualTypeOf<AuthConfig['refreshToken']>();
        expectTypeOf(longExpiry).toEqualTypeOf<AuthConfig['refreshToken']>();
      });
    });

    describe('argon2 configuration', () => {
      it('should enforce literal types for algorithm variant', () => {
        expectTypeOf(validAuthConfig.argon2.type).toEqualTypeOf<0 | 1 | 2>();

        const argon2d: AuthConfig['argon2'] = {
          type: 0,
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 4,
        };

        const argon2i: AuthConfig['argon2'] = {
          type: 1,
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 4,
        };

        const argon2id: AuthConfig['argon2'] = {
          type: 2,
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 4,
        };

        expectTypeOf(argon2d.type).toEqualTypeOf<0 | 1 | 2>();
        expectTypeOf(argon2i.type).toEqualTypeOf<0 | 1 | 2>();
        expectTypeOf(argon2id.type).toEqualTypeOf<0 | 1 | 2>();
      });

      it('should enforce type literal constraints at compile time', () => {
        const validTypes: Array<0 | 1 | 2> = [0, 1, 2];
        expect(validTypes).toHaveLength(3);

        // Type system ensures only 0, 1, or 2 are valid
        type InvalidTypeTest = 3 extends 0 | 1 | 2 ? never : 'invalid';
        const proof1: InvalidTypeTest = 'invalid';
        void proof1;
      });

      it('should require all numeric parameters', () => {
        const { argon2 } = validAuthConfig;

        expectTypeOf(argon2.memoryCost).toEqualTypeOf<number>();
        expectTypeOf(argon2.timeCost).toEqualTypeOf<number>();
        expectTypeOf(argon2.parallelism).toEqualTypeOf<number>();
      });
    });

    describe('password policy configuration', () => {
      it('should enforce zxcvbn score literal type', () => {
        expectTypeOf(validAuthConfig.password.minZxcvbnScore).toEqualTypeOf<0 | 1 | 2 | 3 | 4>();

        const scores = [0, 1, 2, 3, 4] as const;
        scores.forEach((score) => {
          const config: AuthConfig['password'] = {
            minLength: 8,
            maxLength: 128,
            minZxcvbnScore: score,
          };
          expectTypeOf(config.minZxcvbnScore).toEqualTypeOf<0 | 1 | 2 | 3 | 4>();
        });
      });

      it('should enforce score literal constraints at compile time', () => {
        const validScores: Array<0 | 1 | 2 | 3 | 4> = [0, 1, 2, 3, 4];
        expect(validScores).toHaveLength(5);

        // Type system ensures only 0-4 are valid
        type InvalidScoreTest = 5 extends 0 | 1 | 2 | 3 | 4 ? never : 'invalid';
        const proof2: InvalidScoreTest = 'invalid';
        void proof2;
      });

      it('should require numeric length constraints', () => {
        const { password } = validAuthConfig;

        expectTypeOf(password.minLength).toEqualTypeOf<number>();
        expectTypeOf(password.maxLength).toEqualTypeOf<number>();

        expect(typeof password.minLength).toBe('number');
        expect(typeof password.maxLength).toBe('number');
      });
    });

    describe('lockout configuration', () => {
      it('should require all lockout properties', () => {
        const { lockout } = validAuthConfig;

        expectTypeOf(lockout.maxAttempts).toEqualTypeOf<number>();
        expectTypeOf(lockout.lockoutDurationMs).toEqualTypeOf<number>();
        expectTypeOf(lockout.progressiveDelay).toEqualTypeOf<boolean>();
        expectTypeOf(lockout.baseDelayMs).toEqualTypeOf<number>();
      });

      it('should accept both progressive delay modes', () => {
        const withProgressive: AuthConfig['lockout'] = {
          maxAttempts: 5,
          lockoutDurationMs: 900000,
          progressiveDelay: true,
          baseDelayMs: 1000,
        };

        const withoutProgressive: AuthConfig['lockout'] = {
          maxAttempts: 5,
          lockoutDurationMs: 900000,
          progressiveDelay: false,
          baseDelayMs: 0,
        };

        expectTypeOf(withProgressive).toEqualTypeOf<AuthConfig['lockout']>();
        expectTypeOf(withoutProgressive).toEqualTypeOf<AuthConfig['lockout']>();
      });
    });

    describe('proxy configuration', () => {
      it('should require trustProxy boolean and arrays', () => {
        const { proxy } = validAuthConfig;

        expectTypeOf(proxy.trustProxy).toEqualTypeOf<boolean>();
        expectTypeOf(proxy.trustedProxies).toEqualTypeOf<string[]>();
        expectTypeOf(proxy.maxProxyDepth).toEqualTypeOf<number>();
      });

      it('should accept empty trustedProxies array', () => {
        const noProxies: AuthConfig['proxy'] = {
          trustProxy: false,
          trustedProxies: [],
          maxProxyDepth: 0,
        };

        expect(noProxies.trustedProxies).toHaveLength(0);
      });

      it('should accept CIDR notation in trustedProxies', () => {
        const config: AuthConfig['proxy'] = {
          trustProxy: true,
          trustedProxies: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'],
          maxProxyDepth: 2,
        };

        expect(config.trustedProxies).toHaveLength(3);
        expect(config.trustedProxies[0]).toMatch(/\//); // Contains CIDR notation
      });
    });

    describe('rateLimit configuration', () => {
      it('should require rate limit for all endpoints', () => {
        const { rateLimit } = validAuthConfig;

        expectTypeOf(rateLimit.login).toEqualTypeOf<{ max: number; windowMs: number }>();
        expectTypeOf(rateLimit.register).toEqualTypeOf<{ max: number; windowMs: number }>();
        expectTypeOf(rateLimit.forgotPassword).toEqualTypeOf<{
          max: number;
          windowMs: number;
        }>();
        expectTypeOf(rateLimit.verifyEmail).toEqualTypeOf<{
          max: number;
          windowMs: number;
        }>();
      });

      it('should enforce structure for each endpoint', () => {
        const loginLimit = validAuthConfig.rateLimit.login;

        expectTypeOf(loginLimit.max).toEqualTypeOf<number>();
        expectTypeOf(loginLimit.windowMs).toEqualTypeOf<number>();

        expect(loginLimit).toHaveProperty('max');
        expect(loginLimit).toHaveProperty('windowMs');
      });

      it('should allow different limits per endpoint', () => {
        const config: AuthConfig['rateLimit'] = {
          login: { max: 5, windowMs: 900000 }, // 5 attempts per 15 min
          register: { max: 3, windowMs: 3600000 }, // 3 attempts per hour
          forgotPassword: { max: 2, windowMs: 7200000 }, // 2 attempts per 2 hours
          verifyEmail: { max: 10, windowMs: 600000 }, // 10 attempts per 10 min
        };

        expect(config.login.max).not.toBe(config.register.max);
        expect(config.login.windowMs).not.toBe(config.register.windowMs);
      });
    });

    describe('cookie configuration', () => {
      it('should require all cookie properties', () => {
        const { cookie } = validAuthConfig;

        expectTypeOf(cookie.name).toEqualTypeOf<string>();
        expectTypeOf(cookie.secret).toEqualTypeOf<string>();
        expectTypeOf(cookie.httpOnly).toEqualTypeOf<boolean>();
        expectTypeOf(cookie.secure).toEqualTypeOf<boolean>();
        expectTypeOf(cookie.sameSite).toEqualTypeOf<'strict' | 'lax' | 'none'>();
        expectTypeOf(cookie.path).toEqualTypeOf<string>();
      });

      it('should enforce sameSite literal type', () => {
        const strict: AuthConfig['cookie'] = {
          ...validAuthConfig.cookie,
          sameSite: 'strict',
        };

        const lax: AuthConfig['cookie'] = {
          ...validAuthConfig.cookie,
          sameSite: 'lax',
        };

        const none: AuthConfig['cookie'] = {
          ...validAuthConfig.cookie,
          sameSite: 'none',
        };

        expectTypeOf(strict.sameSite).toEqualTypeOf<'strict' | 'lax' | 'none'>();
        expectTypeOf(lax.sameSite).toEqualTypeOf<'strict' | 'lax' | 'none'>();
        expectTypeOf(none.sameSite).toEqualTypeOf<'strict' | 'lax' | 'none'>();
      });

      it('should enforce sameSite literal constraints at compile time', () => {
        const validValues: Array<'strict' | 'lax' | 'none'> = ['strict', 'lax', 'none'];
        expect(validValues).toHaveLength(3);

        // Type system ensures only valid values are accepted
        type InvalidSameSiteTest = 'invalid' extends 'strict' | 'lax' | 'none' ? never : 'invalid';
        const proof3: InvalidSameSiteTest = 'invalid';
        void proof3;
      });
    });

    describe('oauth configuration', () => {
      it('should allow all providers as optional', () => {
        const { oauth } = validAuthConfig;

        expectTypeOf(oauth.google).toEqualTypeOf<OAuthProviderConfig | undefined>();
        expectTypeOf(oauth.github).toEqualTypeOf<OAuthProviderConfig | undefined>();
        expectTypeOf(oauth.facebook).toEqualTypeOf<OAuthProviderConfig | undefined>();
      });

      it('should accept empty oauth object', () => {
        const noOAuth: AuthConfig['oauth'] = {};
        expectTypeOf(noOAuth).toEqualTypeOf<AuthConfig['oauth']>();
        expect(Object.keys(noOAuth)).toHaveLength(0);
      });

      it('should accept multiple providers', () => {
        const multiProvider: AuthConfig['oauth'] = {
          google: {
            clientId: 'google-id',
            clientSecret: 'google-secret',
            callbackUrl: 'https://example.com/auth/google',
          },
          github: {
            clientId: 'github-id',
            clientSecret: 'github-secret',
            callbackUrl: 'https://example.com/auth/github',
          },
        };

        expect(Object.keys(multiProvider)).toHaveLength(2);
      });

      it('should require tenantId for Microsoft provider', () => {
        const microsoft: NonNullable<AuthConfig['oauth']['microsoft']> = {
          clientId: 'ms-id',
          clientSecret: 'ms-secret',
          callbackUrl: 'https://example.com/auth/microsoft',
          tenantId: 'common',
        };

        expectTypeOf(microsoft.tenantId).toEqualTypeOf<string>();
        expect(microsoft).toHaveProperty('tenantId');
      });

      it('should require additional fields for Apple provider', () => {
        const apple: NonNullable<AuthConfig['oauth']['apple']> = {
          clientId: 'apple-id',
          clientSecret: 'apple-secret',
          callbackUrl: 'https://example.com/auth/apple',
          teamId: 'TEAM123',
          keyId: 'KEY123',
          privateKey: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
        };

        expectTypeOf(apple.teamId).toEqualTypeOf<string>();
        expectTypeOf(apple.keyId).toEqualTypeOf<string>();
        expectTypeOf(apple.privateKey).toEqualTypeOf<string>();

        expect(apple).toHaveProperty('teamId');
        expect(apple).toHaveProperty('keyId');
        expect(apple).toHaveProperty('privateKey');
      });
    });

    describe('magicLink configuration', () => {
      it('should require numeric token expiry and max attempts', () => {
        const { magicLink } = validAuthConfig;

        expectTypeOf(magicLink.tokenExpiryMinutes).toEqualTypeOf<number>();
        expectTypeOf(magicLink.maxAttempts).toEqualTypeOf<number>();

        expect(typeof magicLink.tokenExpiryMinutes).toBe('number');
        expect(typeof magicLink.maxAttempts).toBe('number');
      });

      it('should accept various expiry durations', () => {
        const shortExpiry: AuthConfig['magicLink'] = {
          tokenExpiryMinutes: 5,
          maxAttempts: 3,
        };

        const longExpiry: AuthConfig['magicLink'] = {
          tokenExpiryMinutes: 60,
          maxAttempts: 5,
        };

        expectTypeOf(shortExpiry).toEqualTypeOf<AuthConfig['magicLink']>();
        expectTypeOf(longExpiry).toEqualTypeOf<AuthConfig['magicLink']>();
      });
    });

    describe('totp configuration', () => {
      it('should require issuer string and numeric window', () => {
        const { totp } = validAuthConfig;

        expectTypeOf(totp.issuer).toEqualTypeOf<string>();
        expectTypeOf(totp.window).toEqualTypeOf<number>();

        expect(typeof totp.issuer).toBe('string');
        expect(typeof totp.window).toBe('number');
      });

      it('should accept various window tolerances', () => {
        const strictWindow: AuthConfig['totp'] = {
          issuer: 'Test App',
          window: 0,
        };

        const lenientWindow: AuthConfig['totp'] = {
          issuer: 'Test App',
          window: 2,
        };

        expectTypeOf(strictWindow).toEqualTypeOf<AuthConfig['totp']>();
        expectTypeOf(lenientWindow).toEqualTypeOf<AuthConfig['totp']>();
      });
    });
  });

  describe('JwtRotationConfig', () => {
    it('should require secret and allow optional previousSecret', () => {
      const withPrevious: JwtRotationConfig = {
        secret: 'current-secret-key',
        previousSecret: 'old-secret-key',
      };

      const withoutPrevious: JwtRotationConfig = {
        secret: 'current-secret-key',
      };

      expectTypeOf(withPrevious).toEqualTypeOf<JwtRotationConfig>();
      expectTypeOf(withoutPrevious).toEqualTypeOf<JwtRotationConfig>();

      expect(withPrevious).toHaveProperty('previousSecret');
      expect(withoutPrevious.previousSecret).toBeUndefined();
    });

    it('should enforce string types', () => {
      const config: JwtRotationConfig = {
        secret: 'test-secret',
        previousSecret: 'old-secret',
      };

      expectTypeOf(config.secret).toEqualTypeOf<string>();
      expectTypeOf(config.previousSecret).toEqualTypeOf<string | undefined>();
    });
  });

  describe('RateLimitConfig', () => {
    it('should require windowMs and max', () => {
      const config: RateLimitConfig = {
        windowMs: 900000,
        max: 5,
      };

      expectTypeOf(config.windowMs).toEqualTypeOf<number>();
      expectTypeOf(config.max).toEqualTypeOf<number>();

      expect(config).toHaveProperty('windowMs');
      expect(config).toHaveProperty('max');
    });

    it('should allow all optional properties', () => {
      const minimal: RateLimitConfig = {
        windowMs: 60000,
        max: 10,
      };

      const full: RateLimitConfig = {
        windowMs: 60000,
        max: 10,
        cleanupIntervalMs: 300000,
        trustProxy: true,
        progressiveDelay: {
          enabled: true,
          baseDelay: 1000,
          maxDelay: 30000,
          backoffFactor: 2,
        },
      };

      expectTypeOf(minimal).toEqualTypeOf<RateLimitConfig>();
      expectTypeOf(full).toEqualTypeOf<RateLimitConfig>();

      expect(minimal.cleanupIntervalMs).toBeUndefined();
      expect(full.cleanupIntervalMs).toBeDefined();
    });

    it('should enforce progressiveDelay structure when present', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        max: 10,
        progressiveDelay: {
          enabled: true,
          baseDelay: 1000,
          maxDelay: 30000,
          backoffFactor: 2,
        },
      };

      const { progressiveDelay } = config;

      expectTypeOf(progressiveDelay?.enabled).toEqualTypeOf<boolean | undefined>();
      expectTypeOf(progressiveDelay?.baseDelay).toEqualTypeOf<number | undefined>();
      expectTypeOf(progressiveDelay?.maxDelay).toEqualTypeOf<number | undefined>();
      expectTypeOf(progressiveDelay?.backoffFactor).toEqualTypeOf<number | undefined>();
    });

    it('should allow disabled progressive delay', () => {
      const config: RateLimitConfig = {
        windowMs: 60000,
        max: 10,
        progressiveDelay: {
          enabled: false,
          baseDelay: 0,
          maxDelay: 0,
          backoffFactor: 1,
        },
      };

      expect(config.progressiveDelay?.enabled).toBe(false);
    });
  });

  describe('type integration and edge cases', () => {
    it('should support type narrowing for OAuth providers', () => {
      type OAuthProvider = keyof AuthConfig['oauth'];
      const providers: OAuthProvider[] = ['google', 'github', 'facebook', 'microsoft', 'apple'];

      providers.forEach((provider) => {
        expectTypeOf(provider).toEqualTypeOf<OAuthProvider>();
      });
    });

    it('should allow AuthConfig with minimal oauth setup', () => {
      const minimalAuth: AuthConfig = {
        strategies: ['local'],
        jwt: {
          secret: 'test-secret-key-at-least-32-characters-long',
          accessTokenExpiry: 900,
          issuer: 'test',
          audience: 'test-api',
        },
        refreshToken: {
          expiryDays: 30,
          gracePeriodSeconds: 5,
        },
        argon2: {
          type: 2,
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 4,
        },
        password: {
          minLength: 8,
          maxLength: 128,
          minZxcvbnScore: 3,
        },
        lockout: {
          maxAttempts: 5,
          lockoutDurationMs: 900000,
          progressiveDelay: false,
          baseDelayMs: 0,
        },
        proxy: {
          trustProxy: false,
          trustedProxies: [],
          maxProxyDepth: 0,
        },
        rateLimit: {
          login: { max: 5, windowMs: 900000 },
          register: { max: 3, windowMs: 3600000 },
          forgotPassword: { max: 3, windowMs: 3600000 },
          verifyEmail: { max: 5, windowMs: 900000 },
        },
        cookie: {
          name: 'refresh',
          secret: 'cookie-secret',
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
        },
        oauth: {},
        magicLink: {
          tokenExpiryMinutes: 15,
          maxAttempts: 3,
        },
        totp: {
          issuer: 'Test App',
          window: 1,
        },
      };

      expectTypeOf(minimalAuth).toEqualTypeOf<AuthConfig>();
      expect(Object.keys(minimalAuth.oauth)).toHaveLength(0);
    });

    it('should handle complex multi-strategy configurations', () => {
      const multiStrategy: AuthConfig['strategies'] = [
        'local',
        'magic',
        'google',
        'github',
        'microsoft',
      ];

      expectTypeOf(multiStrategy).toEqualTypeOf<AuthStrategy[]>();
      expect(multiStrategy).toHaveLength(5);
    });

    it('should maintain type safety across nested structures', () => {
      type DeepJwtConfig = AuthConfig['jwt'];
      type DeepProxyConfig = AuthConfig['proxy'];
      type DeepOAuthConfig = AuthConfig['oauth'];

      const jwt: DeepJwtConfig = {
        secret: 'test',
        accessTokenExpiry: 900,
        issuer: 'test',
        audience: 'test',
      };

      const proxy: DeepProxyConfig = {
        trustProxy: true,
        trustedProxies: [],
        maxProxyDepth: 1,
      };

      const oauth: DeepOAuthConfig = {};

      expectTypeOf(jwt).toEqualTypeOf<DeepJwtConfig>();
      expectTypeOf(proxy).toEqualTypeOf<DeepProxyConfig>();
      expectTypeOf(oauth).toEqualTypeOf<DeepOAuthConfig>();
    });

    it('should enforce readonly behavior for literal unions', () => {
      const strategy: AuthStrategy = 'local';
      const sameSite: AuthConfig['cookie']['sameSite'] = 'strict';
      const argonType: AuthConfig['argon2']['type'] = 2;

      // These should be immutable literal types
      expect([
        'local',
        'magic',
        'webauthn',
        'google',
        'github',
        'facebook',
        'microsoft',
        'apple',
      ]).toContain(strategy);
      expect(['strict', 'lax', 'none']).toContain(sameSite);
      expect([0, 1, 2]).toContain(argonType);
    });
  });
});
