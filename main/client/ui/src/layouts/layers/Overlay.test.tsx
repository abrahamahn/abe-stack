// main/client/ui/src/layouts/layers/Overlay.test.tsx
// client/ui/src/elements/__tests__/Overlay.test.tsx
/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Overlay } from './Overlay';

describe('Overlay', () => {
  it('renders nothing when open is false', () => {
    render(<Overlay open={false} data-testid="overlay" />);

    expect(screen.queryByTestId('overlay')).not.toBeInTheDocument();
  });

  it('renders overlay in portal when open is true', async () => {
    render(<Overlay open={true} data-testid="overlay" />);

    await waitFor(() => {
      const overlay = screen.getByTestId('overlay');
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveClass('overlay');
      expect(overlay.parentElement).toBe(document.body);
    });
  });

  it('handles click events', async () => {
    const onClick = vi.fn();
    render(<Overlay open={true} onClick={onClick} data-testid="overlay" />);

    await waitFor(() => {
      expect(screen.getByTestId('overlay')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('overlay'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('forwards ref and merges className', async () => {
    const ref = { current: null };
    render(<Overlay ref={ref} open={true} className="custom" data-testid="overlay" />);

    await waitFor(() => {
      const overlay = screen.getByTestId('overlay');
      expect(overlay).toHaveClass('overlay');
      expect(overlay).toHaveClass('custom');
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });
});
