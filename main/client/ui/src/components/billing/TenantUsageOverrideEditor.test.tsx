// main/client/ui/src/components/billing/TenantUsageOverrideEditor.test.tsx
/**
 * Tests for TenantUsageOverrideEditor component.
 *
 * Tests admin override editor rendering, interaction, and submission.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TenantUsageOverrideEditor } from './TenantUsageOverrideEditor';

import type { MetricOverride } from './TenantUsageOverrideEditor';

// ============================================================================
// Test Helpers
// ============================================================================

const createOverride = (overrides?: Partial<MetricOverride>): MetricOverride => ({
  metricKey: 'api_calls',
  name: 'API Calls',
  limitOverride: 5000,
  unit: 'calls/mo',
  planDefault: 1000,
  ...overrides,
});

const DEFAULT_PROPS = {
  tenantId: 'tenant-123',
  tenantName: 'Acme Corp',
  overrides: [
    createOverride(),
    createOverride({
      metricKey: 'storage_gb',
      name: 'Storage',
      limitOverride: 50,
      unit: 'GB',
      planDefault: 10,
    }),
  ],
};

// ============================================================================
// Tests
// ============================================================================

describe('TenantUsageOverrideEditor', () => {
  describe('rendering', () => {
    it('should render the tenant name in the title', () => {
      render(<TenantUsageOverrideEditor {...DEFAULT_PROPS} />);

      expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
    });

    it('should render all metric overrides', () => {
      render(<TenantUsageOverrideEditor {...DEFAULT_PROPS} />);

      expect(screen.getByText('API Calls')).toBeInTheDocument();
      expect(screen.getByText('Storage')).toBeInTheDocument();
    });

    it('should display plan default values', () => {
      render(<TenantUsageOverrideEditor {...DEFAULT_PROPS} />);

      expect(screen.getByText('1000 calls/mo')).toBeInTheDocument();
      expect(screen.getByText('10 GB')).toBeInTheDocument();
    });

    it('should render input fields for overrides', () => {
      render(<TenantUsageOverrideEditor {...DEFAULT_PROPS} />);

      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs).toHaveLength(2);
    });

    it('should render the save button', () => {
      render(<TenantUsageOverrideEditor {...DEFAULT_PROPS} />);

      expect(screen.getByText('Save Overrides')).toBeInTheDocument();
    });

    it('should forward ref to root element', () => {
      const ref = createRef<HTMLDivElement>();
      render(<TenantUsageOverrideEditor {...DEFAULT_PROPS} ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should apply custom className', () => {
      const ref = createRef<HTMLDivElement>();
      render(<TenantUsageOverrideEditor {...DEFAULT_PROPS} ref={ref} className="custom-class" />);

      expect(ref.current?.classList.contains('custom-class')).toBe(true);
    });
  });

  describe('error state', () => {
    it('should render error message when provided', () => {
      render(<TenantUsageOverrideEditor {...DEFAULT_PROPS} error="Failed to save overrides" />);

      expect(screen.getByText('Failed to save overrides')).toBeInTheDocument();
    });

    it('should not render error when null', () => {
      render(<TenantUsageOverrideEditor {...DEFAULT_PROPS} error={null} />);

      expect(screen.queryByText('Failed to save overrides')).not.toBeInTheDocument();
    });
  });

  describe('saving state', () => {
    it('should show saving text when saving', () => {
      render(<TenantUsageOverrideEditor {...DEFAULT_PROPS} saving />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('should disable save button when saving', () => {
      render(<TenantUsageOverrideEditor {...DEFAULT_PROPS} saving />);

      const button = screen.getByText('Saving...');
      expect(button).toBeDisabled();
    });
  });

  describe('interactions', () => {
    it('should call onSave with updated overrides on form submit', async () => {
      const onSave = vi.fn();
      render(<TenantUsageOverrideEditor {...DEFAULT_PROPS} onSave={onSave} />);

      await userEvent.click(screen.getByText('Save Overrides'));

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith('tenant-123', expect.any(Array));
    });

    it('should call onReset when reset button is clicked', async () => {
      const onReset = vi.fn();
      render(<TenantUsageOverrideEditor {...DEFAULT_PROPS} onReset={onReset} />);

      const resetButtons = screen.getAllByText('Reset to Default');
      // Should have reset buttons for modified metrics
      expect(resetButtons.length).toBeGreaterThan(0);

      // Click the first enabled reset button
      const enabledButton = resetButtons.find((btn) => !(btn as HTMLButtonElement).disabled);
      if (enabledButton !== undefined) {
        await userEvent.click(enabledButton);
        expect(onReset).toHaveBeenCalledWith('tenant-123', expect.any(String));
      }
    });

    it('should update input value when user types', async () => {
      render(<TenantUsageOverrideEditor {...DEFAULT_PROPS} />);

      const inputs = screen.getAllByRole('spinbutton');
      const firstInput = inputs[0] as HTMLInputElement;

      await userEvent.clear(firstInput);
      await userEvent.type(firstInput, '9999');

      expect(firstInput.value).toBe('9999');
    });

    it('should show Unlimited label when value is -1', async () => {
      render(
        <TenantUsageOverrideEditor
          {...DEFAULT_PROPS}
          overrides={[createOverride({ limitOverride: -1 })]}
        />,
      );

      expect(screen.getByText('Unlimited')).toBeInTheDocument();
    });
  });
});
