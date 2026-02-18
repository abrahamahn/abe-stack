// main/shared/src/config/env.package.manager.ts
/**
 * Package Manager Environment Configuration
 *
 * Package manager types, env interface, and validation schema.
 * Merged from config/types/infra.ts (package manager section) and config/env.ts.
 *
 * @module config/env.package.manager
 */

import {
  createEnumSchema,
  createSchema,
  parseObject,
  parseOptional,
  parseString,
  withDefault,
} from '../primitives/schema';

import { trueFalseSchema } from './env.base';

import type { Schema } from '../primitives/schema';

// ============================================================================
// Types
// ============================================================================

export type PackageManagerProvider = 'npm' | 'pnpm' | 'yarn';

/** NPM package manager configuration. */
export interface NpmConfig {
  provider: 'npm';
  audit: boolean;
  legacyPeerDeps: boolean;
  registry?: string;
}

/** PNPM package manager configuration. */
export interface PnpmConfig {
  provider: 'pnpm';
  strictPeerDeps: boolean;
  frozenLockfile: boolean;
  registry?: string;
}

/** Yarn package manager configuration. */
export interface YarnConfig {
  provider: 'yarn';
  audit: boolean;
  frozenLockfile: boolean;
  registry?: string;
}

export type PackageManagerConfig = NpmConfig | PnpmConfig | YarnConfig;

// ============================================================================
// Env Interface
// ============================================================================

/** Package manager environment variables */
export interface PackageManagerEnv {
  PACKAGE_MANAGER_PROVIDER: 'npm' | 'pnpm' | 'yarn';
  NPM_AUDIT: 'true' | 'false';
  NPM_LEGACY_PEER_DEPS: 'true' | 'false';
  NPM_REGISTRY?: string | undefined;
  PNPM_STRICT_PEER_DEPS: 'true' | 'false';
  PNPM_FROZEN_LOCKFILE: 'true' | 'false';
  PNPM_REGISTRY?: string | undefined;
  YARN_AUDIT: 'true' | 'false';
  YARN_FROZEN_LOCKFILE: 'true' | 'false';
  YARN_REGISTRY?: string | undefined;
}

// ============================================================================
// Env Schema
// ============================================================================

export const PackageManagerEnvSchema: Schema<PackageManagerEnv> = createSchema<PackageManagerEnv>(
  (data: unknown) => {
    const obj = parseObject(data, 'PackageManagerEnv');
    return {
      PACKAGE_MANAGER_PROVIDER: createEnumSchema(
        ['npm', 'pnpm', 'yarn'] as const,
        'PACKAGE_MANAGER_PROVIDER',
      ).parse(withDefault(obj['PACKAGE_MANAGER_PROVIDER'], 'pnpm')),
      NPM_AUDIT: trueFalseSchema.parse(withDefault(obj['NPM_AUDIT'], 'true')),
      NPM_LEGACY_PEER_DEPS: trueFalseSchema.parse(
        withDefault(obj['NPM_LEGACY_PEER_DEPS'], 'false'),
      ),
      NPM_REGISTRY: parseOptional(obj['NPM_REGISTRY'], (v: unknown) => parseString(v, 'NPM_REGISTRY')),
      PNPM_STRICT_PEER_DEPS: trueFalseSchema.parse(
        withDefault(obj['PNPM_STRICT_PEER_DEPS'], 'true'),
      ),
      PNPM_FROZEN_LOCKFILE: trueFalseSchema.parse(withDefault(obj['PNPM_FROZEN_LOCKFILE'], 'true')),
      PNPM_REGISTRY: parseOptional(obj['PNPM_REGISTRY'], (v: unknown) => parseString(v, 'PNPM_REGISTRY')),
      YARN_AUDIT: trueFalseSchema.parse(withDefault(obj['YARN_AUDIT'], 'true')),
      YARN_FROZEN_LOCKFILE: trueFalseSchema.parse(withDefault(obj['YARN_FROZEN_LOCKFILE'], 'true')),
      YARN_REGISTRY: parseOptional(obj['YARN_REGISTRY'], (v: unknown) => parseString(v, 'YARN_REGISTRY')),
    };
  },
);
