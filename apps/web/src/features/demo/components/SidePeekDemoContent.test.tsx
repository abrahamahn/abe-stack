// apps/web/src/features/demo/components/SidePeekDemoContent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SidePeekDemoContent } from './SidePeekDemoContent';

vi.mock('@abe-stack/ui', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  Markdown: ({ children }: { children: string }) => <div>{children}</div>,
}));

describe('SidePeekDemoContent', () => {
  it('should render markdown content', () => {
    render(<SidePeekDemoContent actionLabel="Test Action" onAction={vi.fn()} />);
    expect(screen.getByText(/Notion-style side peek/)).toBeInTheDocument();
  });

  it('should render action button', () => {
    render(<SidePeekDemoContent actionLabel="Test Action" onAction={vi.fn()} />);
    expect(screen.getByText('Test Action')).toBeInTheDocument();
  });

  it('should call onAction when button clicked', () => {
    const mockAction = vi.fn();
    render(<SidePeekDemoContent actionLabel="Test Action" onAction={mockAction} />);
    fireEvent.click(screen.getByText('Test Action'));
    expect(mockAction).toHaveBeenCalled();
  });
});
