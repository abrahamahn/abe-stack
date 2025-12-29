// packages/ui/src/primitives/__tests__/Switch.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Switch } from '../Switch';

describe('Switch', () => {
  it('toggles and updates aria-checked', () => {
    const onChange = vi.fn();
    render(<Switch defaultChecked={false} onChange={onChange} />);

    const button = screen.getByRole('switch');
    expect(button).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(button);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(button).toHaveAttribute('aria-checked', 'true');
  });
});
