// src/apps/web/src/app/layouts/AppSidePeekLayout.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppSidePeekLayout } from './AppSidePeekLayout';

import type { ReactNode } from 'react';

const mockOnAction = vi.hoisted(() => vi.fn());
const mockExpandTo = vi.hoisted(() => vi.fn());
const mockCloseClick = vi.hoisted(() => vi.fn());

vi.mock('@ui-library/components', () => {
  const sidePeekUILibraryContent = ({
    actionLabel,
    onAction,
  }: {
    actionLabel: string;
    onAction: () => void;
  }) => (
    <button
      type="button"
      onClick={() => {
        mockOnAction();
        onAction();
      }}
    >
      {actionLabel}
    </button>
  );

  return {
    SidePeekUILibraryContent: sidePeekUILibraryContent,
  };
});

vi.mock('@abe-stack/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/ui')>();

  const root = ({
    children,
    open,
  }: {
    children: ReactNode;
    open: boolean;
    onClose: () => void;
    size: string;
  }) => (
    <div data-testid="side-peek-root">
      {String(open)}:{children}
    </div>
  );

  const header = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  const title = ({ children }: { children: ReactNode }) => <h2>{children}</h2>;
  const expand = ({ to }: { to: string }) => (
    <button
      type="button"
      onClick={() => {
        mockExpandTo(to);
      }}
    >
      Expand
    </button>
  );
  const close = () => (
    <button
      type="button"
      onClick={() => {
        mockCloseClick();
      }}
    >
      Close
    </button>
  );
  const content = ({ children }: { children: ReactNode }) => <div>{children}</div>;

  return {
    ...actual,
    SidePeek: {
      Root: root,
      Header: header,
      Title: title,
      Expand: expand,
      Close: close,
      Content: content,
    },
  };
});

describe('AppSidePeekLayout', () => {
  it('renders side peek structure and forwards actions', () => {
    const onClose = vi.fn();
    render(<AppSidePeekLayout open onClose={onClose} />);

    expect(screen.getByText('Side Peek UI Library')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close this panel' }));

    expect(mockExpandTo).toHaveBeenCalledWith('/side-peek-ui-library');
    expect(mockCloseClick).toHaveBeenCalledTimes(1);
    expect(mockOnAction).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
