// client/ui/src/hooks/useClickOutside.test.ts
/** @vitest-environment jsdom */
import { fireEvent, render } from '@testing-library/react';
import { createElement, useRef, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useClickOutside } from './useClickOutside';

const ClickOutsideHarness = (props: {
  onOutside: (event: MouseEvent | TouchEvent) => void;
  showTarget?: boolean;
}): ReactElement => {
  const ref = useRef<HTMLDivElement | null>(null);
  useClickOutside(ref, props.onOutside);
  return createElement(
    'div',
    null,
    props.showTarget === false
      ? null
      : createElement('div', { ref: ref, 'data-testid': 'target' }, 'Inside'),
    React.createElement('div', { 'data-testid': 'outside' }, 'Outside'),
  );
};
describe('useClickOutside', () => {
  it('calls handler when clicking outside the ref element', () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(
      React.createElement(ClickOutsideHarness, { onOutside: onOutside }),
    );
    fireEvent.mouseDown(getByTestId('outside'));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });
  it('does not call handler when clicking inside the ref element', () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(
      React.createElement(ClickOutsideHarness, { onOutside: onOutside }),
    );
    fireEvent.mouseDown(getByTestId('target'));
    expect(onOutside).not.toHaveBeenCalled();
  });
  it('handles touchstart outside events', () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(
      React.createElement(ClickOutsideHarness, { onOutside: onOutside }),
    );
    fireEvent.touchStart(getByTestId('outside'));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });
  it('ignores events when ref is null', () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(
      React.createElement(ClickOutsideHarness, { onOutside: onOutside, showTarget: false }),
    );
    fireEvent.mouseDown(getByTestId('outside'));
    fireEvent.touchStart(getByTestId('outside'));
    expect(onOutside).not.toHaveBeenCalled();
  });
  it('removes listeners on unmount', () => {
    const onOutside = vi.fn();
    const { unmount } = render(React.createElement(ClickOutsideHarness, { onOutside: onOutside }));
    unmount();
    fireEvent.mouseDown(document.body);
    expect(onOutside).not.toHaveBeenCalled();
  });
});
