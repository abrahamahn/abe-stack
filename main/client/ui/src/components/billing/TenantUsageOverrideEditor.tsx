// main/client/ui/src/components/billing/TenantUsageOverrideEditor.tsx
import {
  forwardRef,
  useCallback,
  useState,
  type ComponentPropsWithoutRef,
  type SyntheticEvent,
  type ReactElement,
} from 'react';

import { Button } from '../../elements/Button';
import { cn } from '../../utils/cn';

// ============================================================================
// Types
// ============================================================================

/** A single metric override entry for a tenant */
export interface MetricOverride {
  /** The metric key (e.g., "storage_gb", "api_calls") */
  readonly metricKey: string;
  /** Human-readable metric name */
  readonly name: string;
  /** The current override limit value (-1 = unlimited, 0 = use plan default) */
  readonly limitOverride: number;
  /** Unit label for display */
  readonly unit: string;
  /** The plan default limit for reference */
  readonly planDefault: number;
}

export interface TenantUsageOverrideEditorProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'onSubmit' | 'onReset'
> {
  /** Tenant ID being edited */
  tenantId: string;
  /** Tenant display name */
  tenantName: string;
  /** Current metric overrides */
  overrides: MetricOverride[];
  /** Whether save is in progress */
  saving?: boolean;
  /** Error message from last save attempt */
  error?: string | null;
  /** Callback when overrides are saved */
  onSave?: (tenantId: string, overrides: Array<{ metricKey: string; limit: number }>) => void;
  /** Callback when a single override is reset to plan default */
  onReset?: (tenantId: string, metricKey: string) => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * TenantUsageOverrideEditor provides an admin-level interface for editing
 * per-tenant usage limit overrides. Each metric shows the plan default
 * alongside an editable override value.
 *
 * @example
 * ```tsx
 * <TenantUsageOverrideEditor
 *   tenantId="tenant-123"
 *   tenantName="Acme Corp"
 *   overrides={[
 *     { metricKey: 'storage_gb', name: 'Storage', limitOverride: 50, unit: 'GB', planDefault: 10 },
 *     { metricKey: 'api_calls', name: 'API Calls', limitOverride: -1, unit: 'calls/mo', planDefault: 10000 },
 *   ]}
 *   onSave={handleSave}
 *   onReset={handleReset}
 * />
 * ```
 */
export const TenantUsageOverrideEditor = forwardRef<HTMLDivElement, TenantUsageOverrideEditorProps>(
  (
    {
      tenantId,
      tenantName,
      overrides,
      saving = false,
      error = null,
      onSave,
      onReset,
      className,
      ...rest
    },
    ref,
  ): ReactElement => {
    // Local state for editing overrides
    const [editValues, setEditValues] = useState<Record<string, string>>(() => {
      const values: Record<string, string> = {};
      for (const override of overrides) {
        values[override.metricKey] = String(override.limitOverride);
      }
      return values;
    });

    const handleValueChange = useCallback((metricKey: string, value: string) => {
      setEditValues((prev) => ({ ...prev, [metricKey]: value }));
    }, []);

    const handleSubmit = useCallback(
      (e: SyntheticEvent) => {
        e.preventDefault();
        if (onSave === undefined) return;

        const updates = Object.entries(editValues).map(([metricKey, value]) => ({
          metricKey,
          limit: parseInt(value, 10) || 0,
        }));

        onSave(tenantId, updates);
      },
      [tenantId, editValues, onSave],
    );

    const handleResetMetric = useCallback(
      (metricKey: string) => {
        if (onReset !== undefined) {
          onReset(tenantId, metricKey);
        }
        // Also reset the local value to plan default
        const override = overrides.find((o) => o.metricKey === metricKey);
        if (override !== undefined) {
          setEditValues((prev) => ({
            ...prev,
            [metricKey]: String(override.planDefault),
          }));
        }
      },
      [tenantId, overrides, onReset],
    );

    return (
      <div ref={ref} className={cn('tenant-usage-override-editor', className)} {...rest}>
        <div className="tenant-usage-override-editor__header">
          <h3 className="tenant-usage-override-editor__title">Usage Overrides: {tenantName}</h3>
          <p className="tenant-usage-override-editor__subtitle text-sm text-muted-foreground">
            Override plan limits for this workspace. Set to -1 for unlimited, 0 to use plan default.
          </p>
        </div>

        {error !== null && (
          <div className="tenant-usage-override-editor__error mt-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="tenant-usage-override-editor__form mt-4">
          <div className="tenant-usage-override-editor__table">
            {/* Table header */}
            <div className="tenant-usage-override-editor__row tenant-usage-override-editor__row--header grid grid-cols-4 gap-4 border-b pb-2 text-sm font-medium text-muted-foreground">
              <span>Metric</span>
              <span>Plan Default</span>
              <span>Override Limit</span>
              <span>Actions</span>
            </div>

            {/* Metric rows */}
            {overrides.map((override) => {
              const currentValue = editValues[override.metricKey] ?? String(override.limitOverride);
              const isModified = parseInt(currentValue, 10) !== override.planDefault;

              return (
                <div
                  key={override.metricKey}
                  className={cn(
                    'tenant-usage-override-editor__row grid grid-cols-4 items-center gap-4 border-b py-3',
                    isModified && 'bg-amber-50',
                  )}
                >
                  {/* Metric name */}
                  <div>
                    <span className="font-medium">{override.name}</span>
                    <span className="ml-1 text-xs text-muted-foreground">({override.unit})</span>
                  </div>

                  {/* Plan default */}
                  <div className="text-sm text-muted-foreground">
                    {override.planDefault === -1
                      ? 'Unlimited'
                      : `${String(override.planDefault)} ${override.unit}`}
                  </div>

                  {/* Override input */}
                  <div>
                    <input
                      type="number"
                      value={currentValue}
                      onChange={(e) => {
                        handleValueChange(override.metricKey, e.target.value);
                      }}
                      className="tenant-usage-override-editor__input w-24 rounded border px-2 py-1 text-sm"
                      min={-1}
                      aria-label={`Override limit for ${override.name}`}
                    />
                    {parseInt(currentValue, 10) === -1 && (
                      <span className="ml-2 text-xs text-green-600">Unlimited</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        handleResetMetric(override.metricKey);
                      }}
                      className="tenant-usage-override-editor__reset-btn text-sm text-blue-600 hover:text-blue-800"
                      disabled={!isModified}
                    >
                      Reset to Default
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save button */}
          <div className="tenant-usage-override-editor__actions mt-4 flex gap-2">
            <Button
              type="submit"
              disabled={saving}
              className="tenant-usage-override-editor__save-btn rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Overrides'}
            </Button>
          </div>
        </form>
      </div>
    );
  },
);

TenantUsageOverrideEditor.displayName = 'TenantUsageOverrideEditor';
