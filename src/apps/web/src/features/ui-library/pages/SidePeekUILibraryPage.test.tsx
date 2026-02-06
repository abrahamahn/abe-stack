// apps/web/src/features/ui-library/pages/SidePeekUILibraryPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Hoist mock fn references so they are available when vi.mock factories execute
const { mockHeading, mockPageContainer, mockSidePeekUILibraryContent } = vi.hoisted(() => ({
  mockHeading: vi.fn(),
  mockPageContainer: vi.fn(),
  mockSidePeekUILibraryContent: vi.fn(),
}));

vi.mock('@abe-stack/ui', () => ({
  ['Heading']: (props: { children?: ReactNode }) => {
    mockHeading(props);
    return <h1>{props.children}</h1>;
  },
  ['PageContainer']: (props: { children?: ReactNode }) => {
    mockPageContainer(props);
    return <div>{props.children}</div>;
  },
  useNavigate: () => vi.fn(),
}));

vi.mock('@ui-library/components', () => ({
  ['SidePeekUILibraryContent']: (props: Record<string, unknown>) => {
    mockSidePeekUILibraryContent(props);
    return <div>Side Peek Content</div>;
  },
}));

import { SidePeekUILibraryPage } from './SidePeekUILibraryPage';

import type { ReactNode } from 'react';

describe('SidePeekUILibraryPage', () => {
  it('should render page heading', () => {
    render(<SidePeekUILibraryPage />);
    expect(screen.getByText('Side Peek UI Library')).toBeInTheDocument();
  });

  it('should render side peek content', () => {
    render(<SidePeekUILibraryPage />);
    expect(screen.getByText('Side Peek Content')).toBeInTheDocument();
  });
});
