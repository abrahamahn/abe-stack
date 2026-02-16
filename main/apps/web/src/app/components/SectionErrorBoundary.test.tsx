// main/apps/web/src/app/components/SectionErrorBoundary.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SectionErrorBoundary } from './SectionErrorBoundary';

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }): React.ReactElement {
  if (shouldThrow) {
    throw new Error('Test section error');
  }
  return <div>Section content</div>;
}

describe('SectionErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <SectionErrorBoundary>
        <div>Normal content</div>
      </SectionErrorBoundary>,
    );

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('shows error fallback when child throws', () => {
    // Suppress React error boundary console errors in test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <SectionErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </SectionErrorBoundary>,
    );

    expect(screen.getByText('This section encountered an error')).toBeInTheDocument();
    expect(screen.getByText('Test section error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('recovers when Try Again is clicked', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();

    let shouldThrow = true;

    function ConditionalThrow(): React.ReactElement {
      if (shouldThrow) {
        throw new Error('Temporary error');
      }
      return <div>Recovered content</div>;
    }

    render(
      <SectionErrorBoundary>
        <ConditionalThrow />
      </SectionErrorBoundary>,
    );

    expect(screen.getByText('This section encountered an error')).toBeInTheDocument();

    // Fix the error condition before retrying
    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: 'Try Again' }));

    expect(screen.getByText('Recovered content')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
