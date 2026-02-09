// src/client/ui/src/components/FocusTrap.test.tsx
// client/ui/src/elements/__tests__/FocusTrap.test.tsx
/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FocusTrap } from './FocusTrap';

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

  it('does nothing when no focusable children exist', () => {
    render(<button type="button">Outside</button>);
    const outside = screen.getByText('Outside');
    outside.focus();

    const { container } = render(
      <FocusTrap>
        <div>No focusables</div>
      </FocusTrap>,
    );

    expect(container.firstElementChild).toBeInTheDocument();
    expect(outside).toHaveFocus();
  });

  it('keeps focus on the only focusable element when tabbing', () => {
    const { container } = render(
      <FocusTrap>
        <button type="button">Only</button>
      </FocusTrap>,
    );

    const root = container.firstElementChild;
    const only = screen.getByText('Only');
    only.focus();

    fireEvent.keyDown(root ?? only, { key: 'Tab' });
    expect(only).toHaveFocus();

    fireEvent.keyDown(root ?? only, { key: 'Tab', shiftKey: true });
    expect(only).toHaveFocus();
  });
});
