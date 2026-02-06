// apps/web/src/features/ui-library/components/SidePeekUILibraryContent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Hoist mock fn references so they are available when vi.mock factories execute
const { mockButton, mockMarkdown } = vi.hoisted(() => ({
  mockButton: vi.fn(),
  mockMarkdown: vi.fn(),
}));

vi.mock('@abe-stack/ui', () => ({
  ['Button']: (props: { children?: ReactNode; onClick?: () => void }) => {
    mockButton(props);
    return <button onClick={props.onClick}>{props.children}</button>;
  },
  ['Markdown']: (props: { children: string }) => {
    mockMarkdown(props);
    return <div>{props.children}</div>;
  },
}));

import { SidePeekUILibraryContent } from './SidePeekUILibraryContent';

import type { ReactNode } from 'react';

describe('SidePeekUILibraryContent', () => {
  it('should render markdown content', () => {
    render(<SidePeekUILibraryContent actionLabel="Test Action" onAction={vi.fn()} />);
    expect(screen.getByText(/Notion-style side peek/)).toBeInTheDocument();
  });

  it('should render action button', () => {
    render(<SidePeekUILibraryContent actionLabel="Test Action" onAction={vi.fn()} />);
    expect(screen.getByText('Test Action')).toBeInTheDocument();
  });

  it('should call onAction when button clicked', () => {
    const mockAction = vi.fn();
    render(<SidePeekUILibraryContent actionLabel="Test Action" onAction={mockAction} />);
    fireEvent.click(screen.getByText('Test Action'));
    expect(mockAction).toHaveBeenCalled();
  });
});
