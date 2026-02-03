// shared/src/domain/feature-flags/index.ts

export { evaluateFlag } from './feature-flags.logic';

export {
  featureFlagSchema,
  tenantFeatureOverrideSchema,
  type FeatureFlag,
  type TenantFeatureOverride,
} from './feature-flags.schemas';
