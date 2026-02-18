// main/apps/web/src/features/ui-library/components/SidePeekUILibraryContent.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { mockMarkdown } = vi.hoisted(() => ({
  mockMarkdown: vi.fn(),
}));

vi.mock('@bslt/ui', () => ({
  ['Markdown']: (props: { children: string }) => {
    mockMarkdown(props);
    return <div>{props.children}</div>;
  },
}));

import { SidePeekUILibraryContent } from './SidePeekUILibraryContent';

describe('SidePeekUILibraryContent', () => {
  it('should render markdown content', () => {
    render(<SidePeekUILibraryContent />);
    expect(screen.getByText(/Notion-style side peek/)).toBeInTheDocument();
  });

  it('should render feature list', () => {
    render(<SidePeekUILibraryContent />);
    expect(screen.getByText(/Fullscreen toggle button/)).toBeInTheDocument();
  });
});
