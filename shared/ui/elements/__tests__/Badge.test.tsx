// packages/ui/src/elements/__tests__/Badge.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders with default element and tone', () => {
    render(<Badge>New</Badge>);

    const badge = screen.getByText('New');
    expect(badge.tagName).toBe('SPAN');
    expect(badge).toHaveAttribute('data-tone', 'info');
    expect(badge).toHaveClass('ui-badge');
  });

  it('supports custom element with tone', () => {
    render(
      <Badge as="div" tone="success" data-testid="badge">
        Docs
      </Badge>,
    );

    const badge = screen.getByTestId('badge');
    expect(badge.tagName).toBe('DIV');
    expect(badge).toHaveAttribute('data-tone', 'success');
  });

  it('forwards className and ref', () => {
    const ref = { current: null };
    render(
      <Badge ref={ref} className="custom-badge">
        Tag
      </Badge>,
    );

    const badge = screen.getByText('Tag');
    expect(badge).toHaveClass('custom-badge');
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });
});
