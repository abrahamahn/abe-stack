// apps/web/src/features/demo/pages/SidePeekDemoPage.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SidePeekDemoPage } from './SidePeekDemoPage';

vi.mock('@abe-stack/ui', () => ({
  Heading: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  PageContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useNavigate: () => vi.fn(),
}));

vi.mock('@demo/components', () => ({
  SidePeekDemoContent: () => <div>Side Peek Content</div>,
}));

describe('SidePeekDemoPage', () => {
  it('should render page heading', () => {
    render(<SidePeekDemoPage />);
    expect(screen.getByText('Side Peek Demo')).toBeInTheDocument();
  });

  it('should render side peek content', () => {
    render(<SidePeekDemoPage />);
    expect(screen.getByText('Side Peek Content')).toBeInTheDocument();
  });
});
