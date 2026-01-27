// apps/server/src/config/infra/package.ts
import type {
  FullEnv,
  NpmConfig,
  PackageManagerConfig,
  PackageManagerProvider,
  PnpmConfig,
  YarnConfig,
} from '@abe-stack/core/config';

/**
 * Loads package manager configuration from environment variables.
 *
 * Supports the three major JavaScript package managers: npm, pnpm, and yarn.
 * The configuration affects how dependencies are installed and managed in the project.
 *
 * @param env - Environment variable map
 * @returns Complete package manager configuration
 *
 * @example
 * ```env
 * # For npm
 * PACKAGE_MANAGER_PROVIDER=npm
 * NPM_AUDIT=true
 * NPM_LEGACY_PEER_DEPS=false
 *
 * # For pnpm
 * PACKAGE_MANAGER_PROVIDER=pnpm
 * PNPM_STRICT_PEER_DEPS=true
 * PNPM_FROZEN_LOCKFILE=true
 *
 * # For yarn
 * PACKAGE_MANAGER_PROVIDER=yarn
 * YARN_AUDIT=true
 * YARN_FROZEN_LOCKFILE=true
 * ```
 */

export function loadPackageManagerConfig(env: FullEnv): PackageManagerConfig {
  const provider = env.PACKAGE_MANAGER_PROVIDER as PackageManagerProvider;

  switch (provider) {
    case 'npm': {
      const config: NpmConfig = {
        provider: 'npm',
        audit: env.NPM_AUDIT !== 'false',
        legacyPeerDeps: env.NPM_LEGACY_PEER_DEPS === 'true',
      };
      if (env.NPM_REGISTRY !== undefined) {
        config.registry = env.NPM_REGISTRY;
      }
      return config;
    }

    case 'pnpm': {
      const config: PnpmConfig = {
        provider: 'pnpm',
        strictPeerDeps: env.PNPM_STRICT_PEER_DEPS !== 'false',
        frozenLockfile: env.PNPM_FROZEN_LOCKFILE !== 'false',
      };
      if (env.PNPM_REGISTRY !== undefined) {
        config.registry = env.PNPM_REGISTRY;
      }
      return config;
    }

    case 'yarn': {
      const config: YarnConfig = {
        provider: 'yarn',
        audit: env.YARN_AUDIT !== 'false',
        frozenLockfile: env.YARN_FROZEN_LOCKFILE !== 'false',
      };
      if (env.YARN_REGISTRY !== undefined) {
        config.registry = env.YARN_REGISTRY;
      }
      return config;
    }

    default: {
      // Default to pnpm as it's the most efficient for monorepos
      const config: PnpmConfig = {
        provider: 'pnpm',
        strictPeerDeps: env.PNPM_STRICT_PEER_DEPS !== 'false',
        frozenLockfile: env.PNPM_FROZEN_LOCKFILE !== 'false',
      };
      if (env.PNPM_REGISTRY !== undefined) {
        config.registry = env.PNPM_REGISTRY;
      }
      return config;
    }
  }
}

export const DEFAULT_PACKAGE_MANAGER_CONFIG = {
  provider: 'pnpm',
  strictPeerDeps: true,
  frozenLockfile: true,
} as const;
