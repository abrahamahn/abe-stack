// main/apps/web/src/app/layouts/AppSidePeekLayout.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { AppSidePeekLayout } from './AppSidePeekLayout';

import type { ReactNode } from 'react';

vi.mock('@ui-library/components', () => {
  const sidePeekUILibraryContent = () => <div>SidePeek content</div>;

  return {
    SidePeekUILibraryContent: sidePeekUILibraryContent,
  };
});

vi.mock('@abe-stack/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/ui')>();

  const root = ({
    children,
    open,
    size,
  }: {
    children: ReactNode;
    open: boolean;
    onClose: () => void;
    size: string;
  }) => (
    <div data-testid="side-peek-root" data-size={size}>
      {String(open)}:{children}
    </div>
  );

  const header = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  const title = ({ children }: { children: ReactNode }) => <h2>{children}</h2>;
  const content = ({ children }: { children: ReactNode }) => <div>{children}</div>;
  const close = () => <button type="button">Close</button>;

  return {
    ...actual,
    SidePeek: {
      Root: root,
      Header: header,
      Title: title,
      Content: content,
      Close: close,
    },
  };
});

describe('AppSidePeekLayout', () => {
  it('renders side peek structure', () => {
    const onClose = vi.fn();
    render(<AppSidePeekLayout open onClose={onClose} />);

    expect(screen.getByText('Side Peek UI Library')).toBeInTheDocument();
    expect(screen.getByTestId('side-peek-root')).toHaveAttribute('data-size', 'md');
  });

  it('toggles fullscreen on expand click', () => {
    const onClose = vi.fn();
    render(<AppSidePeekLayout open onClose={onClose} />);

    expect(screen.getByTestId('side-peek-root')).toHaveAttribute('data-size', 'md');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle fullscreen' }));
    expect(screen.getByTestId('side-peek-root')).toHaveAttribute('data-size', 'full');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle fullscreen' }));
    expect(screen.getByTestId('side-peek-root')).toHaveAttribute('data-size', 'md');
  });

  it('calls onClose when content action is clicked', () => {
    const onClose = vi.fn();
    render(<AppSidePeekLayout open onClose={onClose} />);

    expect(screen.getByText('SidePeek content')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
