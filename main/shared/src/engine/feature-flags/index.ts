// main/shared/src/engine/feature-flags/index.ts

export { evaluateFlag } from './feature-flags.logic';

export {
  createFeatureFlagRequestSchema,
  featureFlagSchema,
  setTenantFeatureOverrideRequestSchema,
  tenantFeatureOverrideSchema,
  updateFeatureFlagRequestSchema,
  type CreateFeatureFlagRequest,
  type FeatureFlag,
  type SetTenantFeatureOverrideRequest,
  type TenantFeatureOverride,
  type UpdateFeatureFlagRequest,
} from './feature-flags.schemas';
