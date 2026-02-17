// main/shared/src/core/tenant-settings/index.ts

/**
 * @file Tenant Settings Re-export (Backward Compatibility)
 * @description Re-exports tenant settings schemas from their canonical location in core/tenant.
 * @module Core/TenantSettings
 */

export {
  createTenantSettingSchema,
  tenantSettingSchema,
  updateTenantSettingSchema,
  type CreateTenantSetting,
  type TenantSetting,
  type UpdateTenantSetting,
} from './tenant-settings.schemas';
