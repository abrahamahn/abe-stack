// main/shared/src/config/env.package.manager.test.ts
import { describe, expect, it } from 'vitest';

import { PackageManagerEnvSchema } from './env.package.manager';

describe('PackageManagerEnvSchema', () => {
  describe('defaults', () => {
    it('defaults PACKAGE_MANAGER_PROVIDER to pnpm', () => {
      const result = PackageManagerEnvSchema.parse({});
      expect(result.PACKAGE_MANAGER_PROVIDER).toBe('pnpm');
    });

    it('defaults NPM_AUDIT to true', () => {
      const result = PackageManagerEnvSchema.parse({});
      expect(result.NPM_AUDIT).toBe('true');
    });

    it('defaults NPM_LEGACY_PEER_DEPS to false', () => {
      const result = PackageManagerEnvSchema.parse({});
      expect(result.NPM_LEGACY_PEER_DEPS).toBe('false');
    });

    it('defaults PNPM_STRICT_PEER_DEPS to true', () => {
      const result = PackageManagerEnvSchema.parse({});
      expect(result.PNPM_STRICT_PEER_DEPS).toBe('true');
    });

    it('defaults PNPM_FROZEN_LOCKFILE to true', () => {
      const result = PackageManagerEnvSchema.parse({});
      expect(result.PNPM_FROZEN_LOCKFILE).toBe('true');
    });

    it('defaults YARN_AUDIT to true', () => {
      const result = PackageManagerEnvSchema.parse({});
      expect(result.YARN_AUDIT).toBe('true');
    });

    it('defaults YARN_FROZEN_LOCKFILE to true', () => {
      const result = PackageManagerEnvSchema.parse({});
      expect(result.YARN_FROZEN_LOCKFILE).toBe('true');
    });

    it('leaves optional registry fields undefined when absent', () => {
      const result = PackageManagerEnvSchema.parse({});
      expect(result.NPM_REGISTRY).toBeUndefined();
      expect(result.PNPM_REGISTRY).toBeUndefined();
      expect(result.YARN_REGISTRY).toBeUndefined();
    });
  });

  describe('PACKAGE_MANAGER_PROVIDER', () => {
    it('accepts npm', () => {
      expect(
        PackageManagerEnvSchema.parse({ PACKAGE_MANAGER_PROVIDER: 'npm' }).PACKAGE_MANAGER_PROVIDER,
      ).toBe('npm');
    });

    it('accepts pnpm', () => {
      expect(
        PackageManagerEnvSchema.parse({ PACKAGE_MANAGER_PROVIDER: 'pnpm' })
          .PACKAGE_MANAGER_PROVIDER,
      ).toBe('pnpm');
    });

    it('accepts yarn', () => {
      expect(
        PackageManagerEnvSchema.parse({ PACKAGE_MANAGER_PROVIDER: 'yarn' })
          .PACKAGE_MANAGER_PROVIDER,
      ).toBe('yarn');
    });

    it('rejects bun', () => {
      expect(() =>
        PackageManagerEnvSchema.parse({ PACKAGE_MANAGER_PROVIDER: 'bun' }),
      ).toThrow();
    });

    it('rejects an empty string', () => {
      expect(() =>
        PackageManagerEnvSchema.parse({ PACKAGE_MANAGER_PROVIDER: '' }),
      ).toThrow();
    });

    it('rejects NPM in uppercase', () => {
      expect(() =>
        PackageManagerEnvSchema.parse({ PACKAGE_MANAGER_PROVIDER: 'NPM' }),
      ).toThrow();
    });

    it('rejects a numeric value', () => {
      expect(() =>
        PackageManagerEnvSchema.parse({ PACKAGE_MANAGER_PROVIDER: 1 }),
      ).toThrow();
    });
  });

  describe('boolean flag fields', () => {
    it('accepts true for NPM_AUDIT', () => {
      expect(PackageManagerEnvSchema.parse({ NPM_AUDIT: 'true' }).NPM_AUDIT).toBe('true');
    });

    it('accepts false for NPM_AUDIT', () => {
      expect(PackageManagerEnvSchema.parse({ NPM_AUDIT: 'false' }).NPM_AUDIT).toBe('false');
    });

    it('rejects 1 for NPM_AUDIT', () => {
      expect(() => PackageManagerEnvSchema.parse({ NPM_AUDIT: '1' })).toThrow();
    });

    it('rejects a boolean true for NPM_AUDIT', () => {
      expect(() => PackageManagerEnvSchema.parse({ NPM_AUDIT: true })).toThrow();
    });

    it('rejects yes for NPM_AUDIT', () => {
      expect(() => PackageManagerEnvSchema.parse({ NPM_AUDIT: 'yes' })).toThrow();
    });

    it('accepts false for NPM_LEGACY_PEER_DEPS', () => {
      expect(
        PackageManagerEnvSchema.parse({ NPM_LEGACY_PEER_DEPS: 'false' }).NPM_LEGACY_PEER_DEPS,
      ).toBe('false');
    });

    it('rejects invalid PNPM_STRICT_PEER_DEPS value', () => {
      expect(() =>
        PackageManagerEnvSchema.parse({ PNPM_STRICT_PEER_DEPS: 'on' }),
      ).toThrow();
    });

    it('rejects invalid PNPM_FROZEN_LOCKFILE value', () => {
      expect(() =>
        PackageManagerEnvSchema.parse({ PNPM_FROZEN_LOCKFILE: '0' }),
      ).toThrow();
    });

    it('rejects invalid YARN_AUDIT value', () => {
      expect(() => PackageManagerEnvSchema.parse({ YARN_AUDIT: 'TRUE' })).toThrow();
    });

    it('rejects invalid YARN_FROZEN_LOCKFILE value', () => {
      expect(() =>
        PackageManagerEnvSchema.parse({ YARN_FROZEN_LOCKFILE: 'enabled' }),
      ).toThrow();
    });
  });

  describe('registry fields', () => {
    it('accepts a custom NPM_REGISTRY URL', () => {
      const result = PackageManagerEnvSchema.parse({
        NPM_REGISTRY: 'https://registry.npmjs.org',
      });
      expect(result.NPM_REGISTRY).toBe('https://registry.npmjs.org');
    });

    it('accepts a PNPM_REGISTRY string', () => {
      const result = PackageManagerEnvSchema.parse({
        PNPM_REGISTRY: 'https://registry.internal.example.com',
      });
      expect(result.PNPM_REGISTRY).toBe('https://registry.internal.example.com');
    });

    it('accepts a YARN_REGISTRY string', () => {
      const result = PackageManagerEnvSchema.parse({
        YARN_REGISTRY: 'https://registry.yarnpkg.com',
      });
      expect(result.YARN_REGISTRY).toBe('https://registry.yarnpkg.com');
    });

    it('rejects a non-string NPM_REGISTRY', () => {
      expect(() => PackageManagerEnvSchema.parse({ NPM_REGISTRY: 9000 })).toThrow();
    });
  });

  describe('complete configuration', () => {
    it('accepts a fully specified npm setup', () => {
      const result = PackageManagerEnvSchema.parse({
        PACKAGE_MANAGER_PROVIDER: 'npm',
        NPM_AUDIT: 'true',
        NPM_LEGACY_PEER_DEPS: 'false',
        NPM_REGISTRY: 'https://registry.npmjs.org',
        PNPM_STRICT_PEER_DEPS: 'true',
        PNPM_FROZEN_LOCKFILE: 'true',
        YARN_AUDIT: 'false',
        YARN_FROZEN_LOCKFILE: 'false',
      });
      expect(result.PACKAGE_MANAGER_PROVIDER).toBe('npm');
      expect(result.NPM_AUDIT).toBe('true');
    });
  });

  describe('non-object input', () => {
    it('rejects null', () => {
      expect(() => PackageManagerEnvSchema.parse(null)).toThrow();
    });

    it('rejects an array', () => {
      expect(() => PackageManagerEnvSchema.parse(['pnpm'])).toThrow();
    });

    it('rejects a string', () => {
      expect(() => PackageManagerEnvSchema.parse('pnpm')).toThrow();
    });
  });

  describe('safeParse', () => {
    it('returns success:true for an empty object', () => {
      const result = PackageManagerEnvSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('returns success:false for an invalid provider without throwing', () => {
      const result = PackageManagerEnvSchema.safeParse({ PACKAGE_MANAGER_PROVIDER: 'cargo' });
      expect(result.success).toBe(false);
    });

    it('returns success:false for an invalid boolean flag without throwing', () => {
      const result = PackageManagerEnvSchema.safeParse({ NPM_AUDIT: 'maybe' });
      expect(result.success).toBe(false);
    });
  });
});
