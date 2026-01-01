// packages/ui/src/primitives/__tests__/Alert.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Alert } from '../Alert';

describe('Alert', () => {
  it('renders with default tone and role', () => {
    render(<Alert>Notice</Alert>);

    const alert = screen.getByRole('status');
    expect(alert).toHaveAttribute('data-tone', 'info');
    expect(alert).toHaveTextContent('Notice');
  });

  it('renders icon and title when provided', () => {
    render(<Alert icon={<span>!</span>} title="Heads up" tone="warning" />);

    const alert = screen.getByRole('status');
    expect(alert).toHaveAttribute('data-tone', 'warning');
    expect(screen.getByText('!')).toBeInTheDocument();
    expect(screen.getByText('Heads up')).toBeInTheDocument();
  });

  it('forwards className and ref', () => {
    const ref = { current: null };
    render(
      <Alert ref={ref} className="custom-alert">
        Content
      </Alert>,
    );

    const alert = screen.getByRole('status');
    expect(alert).toHaveClass('ui-alert');
    expect(alert).toHaveClass('custom-alert');
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('handles missing children gracefully', () => {
    expect(() => render(<Alert title="Empty" />)).not.toThrow();
    expect(screen.getByText('Empty')).toBeInTheDocument();
  });
});
