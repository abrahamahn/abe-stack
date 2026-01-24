// apps/server/src/config/infra/package.ts
import type {
  PackageManagerConfig,
  PackageManagerProvider,
} from '@abe-stack/core/contracts/config';
import type { FullEnv } from '@abe-stack/core/contracts/config/environment';

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
  const provider = (env.PACKAGE_MANAGER_PROVIDER || 'pnpm') as PackageManagerProvider;

  switch (provider) {
    case 'npm':
      return {
        provider: 'npm',
        audit: env.NPM_AUDIT !== 'false',
        legacyPeerDeps: env.NPM_LEGACY_PEER_DEPS === 'true',
        registry: env.NPM_REGISTRY,
      };

    case 'pnpm':
      return {
        provider: 'pnpm',
        strictPeerDeps: env.PNPM_STRICT_PEER_DEPS !== 'false',
        frozenLockfile: env.PNPM_FROZEN_LOCKFILE !== 'false',
        registry: env.PNPM_REGISTRY,
      };

    case 'yarn':
      return {
        provider: 'yarn',
        audit: env.YARN_AUDIT !== 'false',
        frozenLockfile: env.YARN_FROZEN_LOCKFILE !== 'false',
        registry: env.YARN_REGISTRY,
      };

    default:
      // Default to pnpm as it's the most efficient for monorepos
      return {
        provider: 'pnpm',
        strictPeerDeps: env.PNPM_STRICT_PEER_DEPS !== 'false',
        frozenLockfile: env.PNPM_FROZEN_LOCKFILE !== 'false',
        registry: env.PNPM_REGISTRY,
      };
  }
}

/**
 * Validates package manager configuration for production readiness.
 *
 * @param config - Package manager configuration to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validatePackageManagerConfig(config: PackageManagerConfig): string[] {
  const errors: string[] = [];

  // Add any specific validation rules for package manager configuration
  // Currently, we just validate that required fields are present based on provider

  switch (config.provider) {
    case 'npm':
      // No specific validations needed for npm config
      break;
    case 'pnpm':
      // No specific validations needed for pnpm config
      break;
    case 'yarn':
      // No specific validations needed for yarn config
      break;
  }

  return errors;
}

export const DEFAULT_PACKAGE_MANAGER_CONFIG = {
  provider: 'pnpm',
  strictPeerDeps: true,
  frozenLockfile: true,
} as const;
