// apps/web/src/features/ui-library/components/UILibraryDocContent.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { UILibraryDocContent } from '@ui-library/components/UILibraryDocContent';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComponentDemo } from '@ui-library/types';

// Mock the lazy docs utilities
vi.mock('@ui-library/utils/lazyDocs', () => ({
  getComponentDocsLazy: vi.fn(),
}));

const mockComponent: ComponentDemo = {
  id: 'button',
  name: 'Button',
  category: 'elements',
  description: 'A clickable button component',
  variants: [
    { name: 'Default', description: 'Default button', code: '', render: () => null },
    { name: 'Primary', description: 'Primary button', code: '', render: () => null },
  ],
};

describe('UILibraryDocContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows loading skeletons initially', async () => {
      const { getComponentDocsLazy } = await import('@ui-library/utils/lazyDocs');
      // Make the promise never resolve to keep loading state
      vi.mocked(getComponentDocsLazy).mockReturnValue(new Promise(() => {}));

      render(<UILibraryDocContent component={mockComponent} />);

      // Should show skeleton loading states
      const skeletons = document.querySelectorAll('[class*="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('with docs available', () => {
    it('renders markdown documentation when docs exist', async () => {
      const { getComponentDocsLazy } = await import('@ui-library/utils/lazyDocs');

      vi.mocked(getComponentDocsLazy).mockResolvedValue('# Button\n\nA button component.');

      render(<UILibraryDocContent component={mockComponent} />);

      // Verify getComponentDocsLazy was called with correct params
      await waitFor(() => {
        expect(getComponentDocsLazy).toHaveBeenCalledWith('button', 'elements', 'Button');
      });

      // Verify the markdown is rendered (custom Markdown component renders the content)
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Button');
      });

      expect(screen.getByText('A button component.')).toBeInTheDocument();
    });
  });

  describe('without docs', () => {
    it('renders fallback content when no docs available', async () => {
      const { getComponentDocsLazy } = await import('@ui-library/utils/lazyDocs');
      vi.mocked(getComponentDocsLazy).mockResolvedValue(null);

      render(<UILibraryDocContent component={mockComponent} />);

      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument();
      });

      expect(screen.getByText('A clickable button component')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('elements')).toBeInTheDocument();
      expect(screen.getByText('Variants')).toBeInTheDocument();
      expect(screen.getByText('2 available')).toBeInTheDocument();
    });

    it('renders correct variant count', async () => {
      const { getComponentDocsLazy } = await import('@ui-library/utils/lazyDocs');
      vi.mocked(getComponentDocsLazy).mockResolvedValue(null);

      const componentWithManyVariants: ComponentDemo = {
        ...mockComponent,
        variants: [
          { name: 'V1', description: '', code: '', render: () => null },
          { name: 'V2', description: '', code: '', render: () => null },
          { name: 'V3', description: '', code: '', render: () => null },
          { name: 'V4', description: '', code: '', render: () => null },
          { name: 'V5', description: '', code: '', render: () => null },
        ],
      };

      render(<UILibraryDocContent component={componentWithManyVariants} />);

      await waitFor(() => {
        expect(screen.getByText('5 available')).toBeInTheDocument();
      });
    });

    it('renders section headings as h3', async () => {
      const { getComponentDocsLazy } = await import('@ui-library/utils/lazyDocs');
      vi.mocked(getComponentDocsLazy).mockResolvedValue(null);

      render(<UILibraryDocContent component={mockComponent} />);

      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 3 });
        expect(headings).toHaveLength(3);
        expect(headings[0]).toHaveTextContent('Description');
        expect(headings[1]).toHaveTextContent('Category');
        expect(headings[2]).toHaveTextContent('Variants');
      });
    });
  });

  describe('markdown rendering', () => {
    it('renders markdown content in a container', async () => {
      const { getComponentDocsLazy } = await import('@ui-library/utils/lazyDocs');

      vi.mocked(getComponentDocsLazy).mockResolvedValue('# Test\n\nTest content');

      render(<UILibraryDocContent component={mockComponent} />);

      await waitFor(() => {
        const container = document.querySelector('.markdown-content');
        expect(container).toBeInTheDocument();
      });
    });
  });
});
