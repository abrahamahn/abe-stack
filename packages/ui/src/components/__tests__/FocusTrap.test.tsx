// packages/ui/src/components/__tests__/FocusTrap.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FocusTrap } from '../FocusTrap';

describe('FocusTrap', () => {
  it('moves focus to the first focusable child', () => {
    render(
      <FocusTrap>
        <button type="button">First</button>
        <button type="button">Second</button>
      </FocusTrap>,
    );

    expect(screen.getByText('First')).toHaveFocus();
  });

  it('cycles focus when tabbing past the last element', () => {
    const { container } = render(
      <FocusTrap>
        <button type="button">First</button>
        <button type="button">Second</button>
      </FocusTrap>,
    );

    const root = container.firstElementChild;
    const first = screen.getByText('First');
    const second = screen.getByText('Second');

    second.focus();
    fireEvent.keyDown(root ?? second, { key: 'Tab' });
    expect(first).toHaveFocus();

    first.focus();
    fireEvent.keyDown(root ?? first, { key: 'Tab', shiftKey: true });
    expect(second).toHaveFocus();
  });

  it('restores focus to the previously focused element on unmount', () => {
    render(<button type="button">Outside</button>);
    const outside = screen.getByText('Outside');
    outside.focus();

    const { unmount } = render(
      <FocusTrap>
        <button type="button">Inside</button>
      </FocusTrap>,
    );
    expect(screen.getByText('Inside')).toHaveFocus();

    unmount();
    expect(outside).toHaveFocus();
  });
});
