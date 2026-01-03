// packages/ui/src/components/__tests__/Card.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Card } from '../Card';

describe('Card', () => {
  it('renders children with card class', () => {
    render(<Card>Content</Card>);

    const card = screen.getByText('Content');
    expect(card).toHaveClass('ui-card');
  });

  it('forwards className and data attributes', () => {
    render(
      <Card className="custom-card" data-testid="card">
        Body
      </Card>,
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveClass('ui-card');
    expect(card).toHaveClass('custom-card');
  });

  it('handles click events', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Card onClick={onClick} role="button" tabIndex={0}>
        Clickable
      </Card>,
    );

    await user.click(screen.getByRole('button', { name: 'Clickable' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders safely with empty children', () => {
    expect(() => {
      render(<Card>{null}</Card>);
    }).not.toThrow();
  });
});
