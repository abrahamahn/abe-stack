// packages/ui/src/hooks/__tests__/useClickOutside.test.tsx
/** @vitest-environment jsdom */
import { fireEvent, render } from '@testing-library/react';
import { useRef, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useClickOutside } from '../useClickOutside';

function ClickOutsideHarness(props: {
  onOutside: (event: MouseEvent | TouchEvent) => void;
  showTarget?: boolean;
}): ReactElement {
  const ref = useRef<HTMLDivElement | null>(null);
  useClickOutside(ref, props.onOutside);

  return (
    <div>
      {props.showTarget === false ? null : (
        <div ref={ref} data-testid="target">
          Inside
        </div>
      )}
      <div data-testid="outside">Outside</div>
    </div>
  );
}

describe('useClickOutside', () => {
  it('calls handler when clicking outside the ref element', () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(<ClickOutsideHarness onOutside={onOutside} />);

    fireEvent.mouseDown(getByTestId('outside'));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('does not call handler when clicking inside the ref element', () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(<ClickOutsideHarness onOutside={onOutside} />);

    fireEvent.mouseDown(getByTestId('target'));
    expect(onOutside).not.toHaveBeenCalled();
  });

  it('handles touchstart outside events', () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(<ClickOutsideHarness onOutside={onOutside} />);

    fireEvent.touchStart(getByTestId('outside'));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('ignores events when ref is null', () => {
    const onOutside = vi.fn();
    const { getByTestId } = render(
      <ClickOutsideHarness onOutside={onOutside} showTarget={false} />,
    );

    fireEvent.mouseDown(getByTestId('outside'));
    fireEvent.touchStart(getByTestId('outside'));
    expect(onOutside).not.toHaveBeenCalled();
  });

  it('removes listeners on unmount', () => {
    const onOutside = vi.fn();
    const { unmount } = render(<ClickOutsideHarness onOutside={onOutside} />);

    unmount();
    fireEvent.mouseDown(document.body);
    expect(onOutside).not.toHaveBeenCalled();
  });
});
