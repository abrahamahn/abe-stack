// apps/server/src/config/infra/package.test.ts
import type { FullEnv, PackageManagerConfig } from '@abe-stack/core/contracts/config';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PACKAGE_MANAGER_CONFIG,
  loadPackageManagerConfig,
  validatePackageManagerConfig,
} from './package';

describe('Package Manager Configuration', () => {
  it('loads default configuration when no environment variables are set', () => {
    const env = {} as unknown as FullEnv;
    const config = loadPackageManagerConfig(env);

    expect(config).toEqual({
      provider: 'pnpm',
      strictPeerDeps: true,
      frozenLockfile: true,
      registry: undefined,
    });
  });

  it('loads npm configuration from environment variables', () => {
    const env = {
      PACKAGE_MANAGER_PROVIDER: 'npm',
      NPM_AUDIT: 'true',
      NPM_LEGACY_PEER_DEPS: 'false',
      NPM_REGISTRY: 'https://registry.npmjs.org/',
    } as unknown as FullEnv;

    const config = loadPackageManagerConfig(env);

    expect(config).toEqual({
      provider: 'npm',
      audit: true,
      legacyPeerDeps: false,
      registry: 'https://registry.npmjs.org/',
    });
  });

  it('loads pnpm configuration from environment variables', () => {
    const env = {
      PACKAGE_MANAGER_PROVIDER: 'pnpm',
      PNPM_STRICT_PEER_DEPS: 'false',
      PNPM_FROZEN_LOCKFILE: 'true',
      PNPM_REGISTRY: 'https://registry.npmjs.org/',
    } as unknown as FullEnv;

    const config = loadPackageManagerConfig(env);

    expect(config).toEqual({
      provider: 'pnpm',
      strictPeerDeps: false,
      frozenLockfile: true,
      registry: 'https://registry.npmjs.org/',
    });
  });

  it('loads yarn configuration from environment variables', () => {
    const env = {
      PACKAGE_MANAGER_PROVIDER: 'yarn',
      YARN_AUDIT: 'true',
      YARN_FROZEN_LOCKFILE: 'false',
      YARN_REGISTRY: 'https://registry.yarnpkg.com/',
    } as unknown as FullEnv;

    const config = loadPackageManagerConfig(env);

    expect(config).toEqual({
      provider: 'yarn',
      audit: true,
      frozenLockfile: false,
      registry: 'https://registry.yarnpkg.com/',
    });
  });

  it('defaults to pnpm when no explicit provider is set', () => {
    const env = {} as unknown as FullEnv;

    const config = loadPackageManagerConfig(env);

    expect(config.provider).toBe('pnpm');
  });

  it('validatePackageManagerConfig returns no errors for valid configuration', () => {
    const config = {
      provider: 'pnpm',
      strictPeerDeps: true,
      frozenLockfile: true,
      registry: 'https://registry.npmjs.org/',
    } satisfies PackageManagerConfig;

    const errors = validatePackageManagerConfig(config);
    expect(errors).toHaveLength(0);
  });

  it('validatePackageManagerConfig returns no errors for valid npm configuration', () => {
    const config = {
      provider: 'npm',
      audit: true,
      legacyPeerDeps: false,
      registry: 'https://registry.npmjs.org/',
    } satisfies PackageManagerConfig;

    const errors = validatePackageManagerConfig(config);
    expect(errors).toHaveLength(0);
  });

  it('validatePackageManagerConfig returns no errors for valid yarn configuration', () => {
    const config = {
      provider: 'yarn',
      audit: true,
      frozenLockfile: true,
      registry: 'https://registry.yarnpkg.com/',
    } satisfies PackageManagerConfig;

    const errors = validatePackageManagerConfig(config);
    expect(errors).toHaveLength(0);
  });

  it('exports default configuration constants', () => {
    expect(DEFAULT_PACKAGE_MANAGER_CONFIG).toBeDefined();
    expect(DEFAULT_PACKAGE_MANAGER_CONFIG.provider).toBe('pnpm');
    expect(DEFAULT_PACKAGE_MANAGER_CONFIG.strictPeerDeps).toBe(true);
    expect(DEFAULT_PACKAGE_MANAGER_CONFIG.frozenLockfile).toBe(true);
  });
});
