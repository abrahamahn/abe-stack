// packages/ui/src/components/__tests__/Badge.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders children without a tone by default', () => {
    render(<Badge>Default</Badge>);

    const badge = screen.getByText('Default');
    expect(badge).toBeInTheDocument();
    expect(badge).not.toHaveAttribute('data-tone');
  });

  it('applies tone and className', () => {
    render(
      <Badge tone="success" className="custom-badge">
        Success
      </Badge>,
    );

    const badge = screen.getByText('Success');
    expect(badge).toHaveAttribute('data-tone', 'success');
    expect(badge).toHaveClass('ui-badge');
    expect(badge).toHaveClass('custom-badge');
  });

  it('forwards style and tabIndex', () => {
    render(
      <Badge style={{ marginTop: '12px' }} tabIndex={0}>
        Styled
      </Badge>,
    );

    const badge = screen.getByText('Styled');
    expect(badge).toHaveStyle({ marginTop: '12px' });
    expect(badge).toHaveAttribute('tabindex', '0');
  });

  it('handles click and keydown handlers', () => {
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    render(
      <Badge onClick={onClick} onKeyDown={onKeyDown} tabIndex={0}>
        Interactive
      </Badge>,
    );

    const badge = screen.getByText('Interactive');
    fireEvent.click(badge);
    fireEvent.keyDown(badge, { key: 'Enter' });

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('renders safely with empty content', () => {
    expect(() => {
      render(<Badge>{null}</Badge>);
    }).not.toThrow();
  });
});
