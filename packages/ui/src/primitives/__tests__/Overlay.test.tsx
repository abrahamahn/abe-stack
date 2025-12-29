// packages/ui/src/primitives/__tests__/Overlay.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Overlay } from '../Overlay';

describe('Overlay', () => {
  it('renders only when open and handles clicks', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Overlay open={false} onClick={onClick} />);

    expect(document.body.querySelector('.ui-overlay')).toBeNull();

    rerender(<Overlay open onClick={onClick} />);

    await waitFor(() => {
      expect(document.body.querySelector('.ui-overlay')).toBeInTheDocument();
    });

    const overlay = document.body.querySelector('.ui-overlay');
    if (overlay) {
      fireEvent.click(overlay);
    }

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
