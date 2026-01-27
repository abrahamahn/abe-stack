// packages/ui/src/layouts/shells/__tests__/LeftSidebarLayout.test.tsx
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, it, expect } from 'vitest';

import { LeftSidebarLayout } from './LeftSidebarLayout';

describe('LeftSidebarLayout', () => {
  describe('Basic Rendering', () => {
    it('renders children when no slots provided', () => {
      render(<LeftSidebarLayout>Sidebar Content</LeftSidebarLayout>);
      expect(screen.getByText('Sidebar Content')).toBeInTheDocument();
    });

    it('renders as aside element', () => {
      render(<LeftSidebarLayout data-testid="sidebar">Content</LeftSidebarLayout>);
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar.tagName).toBe('ASIDE');
    });

    it('applies left-sidebar class', () => {
      render(<LeftSidebarLayout data-testid="sidebar">Content</LeftSidebarLayout>);
      expect(screen.getByTestId('sidebar')).toHaveClass('left-sidebar');
    });
  });

  describe('Slot Rendering', () => {
    it('renders header slot', () => {
      render(<LeftSidebarLayout header={<span>Header</span>} />);
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Header').parentElement).toHaveClass('left-sidebar-header');
    });

    it('renders content slot', () => {
      render(<LeftSidebarLayout content={<span>Content</span>} />);
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Content').parentElement).toHaveClass('left-sidebar-content');
    });

    it('renders footer slot', () => {
      render(<LeftSidebarLayout footer={<span>Footer</span>} />);
      expect(screen.getByText('Footer')).toBeInTheDocument();
      expect(screen.getByText('Footer').parentElement).toHaveClass('left-sidebar-footer');
    });

    it('renders all slots together', () => {
      render(
        <LeftSidebarLayout
          header={<span>Header</span>}
          content={<span>Content</span>}
          footer={<span>Footer</span>}
        />,
      );
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });

    it('prefers slots over children when slots provided', () => {
      render(<LeftSidebarLayout header={<span>Header</span>}>Children Content</LeftSidebarLayout>);
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.queryByText('Children Content')).not.toBeInTheDocument();
    });
  });

  describe('Border Styling', () => {
    it('applies bordered class by default', () => {
      render(<LeftSidebarLayout data-testid="sidebar">Content</LeftSidebarLayout>);
      expect(screen.getByTestId('sidebar')).toHaveClass('left-sidebar--bordered');
    });

    it('removes bordered class when bordered=false', () => {
      render(
        <LeftSidebarLayout data-testid="sidebar" bordered={false}>
          Content
        </LeftSidebarLayout>,
      );
      expect(screen.getByTestId('sidebar')).not.toHaveClass('left-sidebar--bordered');
    });

    it('applies bordered class when bordered=true', () => {
      render(
        <LeftSidebarLayout data-testid="sidebar" bordered={true}>
          Content
        </LeftSidebarLayout>,
      );
      expect(screen.getByTestId('sidebar')).toHaveClass('left-sidebar--bordered');
    });
  });

  describe('Width Prop', () => {
    it('uses default width', () => {
      render(<LeftSidebarLayout data-testid="sidebar">Content</LeftSidebarLayout>);
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveStyle({ ['--left-sidebar-width']: '3.125rem' });
    });

    it('accepts string width', () => {
      render(
        <LeftSidebarLayout data-testid="sidebar" width="5rem">
          Content
        </LeftSidebarLayout>,
      );
      expect(screen.getByTestId('sidebar')).toHaveStyle({ ['--left-sidebar-width']: '5rem' });
    });

    it('converts number width to pixels', () => {
      render(
        <LeftSidebarLayout data-testid="sidebar" width={100}>
          Content
        </LeftSidebarLayout>,
      );
      expect(screen.getByTestId('sidebar')).toHaveStyle({ ['--left-sidebar-width']: '100px' });
    });
  });

  describe('Prop Forwarding', () => {
    it('forwards ref', () => {
      const ref = createRef<HTMLDivElement>();
      render(<LeftSidebarLayout ref={ref}>Content</LeftSidebarLayout>);
      expect(ref.current).toBeInstanceOf(HTMLElement);
      expect(ref.current?.tagName).toBe('ASIDE');
    });

    it('forwards className', () => {
      render(
        <LeftSidebarLayout data-testid="sidebar" className="custom-class">
          Content
        </LeftSidebarLayout>,
      );
      expect(screen.getByTestId('sidebar')).toHaveClass('custom-class');
      expect(screen.getByTestId('sidebar')).toHaveClass('left-sidebar');
    });

    it('forwards style prop', () => {
      render(
        <LeftSidebarLayout data-testid="sidebar" style={{ padding: '20px' }}>
          Content
        </LeftSidebarLayout>,
      );
      expect(screen.getByTestId('sidebar')).toHaveStyle({ padding: '20px' });
    });

    it('forwards data attributes', () => {
      render(
        <LeftSidebarLayout data-testid="sidebar" data-custom="value">
          Content
        </LeftSidebarLayout>,
      );
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-custom', 'value');
    });

    it('forwards aria attributes', () => {
      render(
        <LeftSidebarLayout data-testid="sidebar" aria-label="Navigation sidebar">
          Content
        </LeftSidebarLayout>,
      );
      expect(screen.getByTestId('sidebar')).toHaveAttribute('aria-label', 'Navigation sidebar');
    });
  });

  describe('Edge Cases', () => {
    it('treats null/undefined slots as "slots provided" (no children fallback)', () => {
      // When header={null}, hasSlots is true because null !== undefined
      // This means children won't be rendered as fallback
      render(
        <LeftSidebarLayout data-testid="sidebar" header={null} content={undefined}>
          Fallback
        </LeftSidebarLayout>,
      );
      // Children should NOT be rendered because slots are "provided" (even if null)
      expect(screen.queryByText('Fallback')).not.toBeInTheDocument();
    });

    it('renders children when no slot props are passed', () => {
      render(<LeftSidebarLayout data-testid="sidebar">Fallback Content</LeftSidebarLayout>);
      expect(screen.getByText('Fallback Content')).toBeInTheDocument();
    });

    it('handles empty string className', () => {
      render(
        <LeftSidebarLayout data-testid="sidebar" className="">
          Content
        </LeftSidebarLayout>,
      );
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar.className).toBe('left-sidebar left-sidebar--bordered');
    });

    it('preserves width CSS variable alongside other styles', () => {
      render(
        <LeftSidebarLayout
          data-testid="sidebar"
          width="4rem"
          style={{ padding: '10px', margin: '5px' }}
        >
          Content
        </LeftSidebarLayout>,
      );
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveStyle({
        ['--left-sidebar-width']: '4rem',
        padding: '10px',
        margin: '5px',
      });
    });
  });

  describe('displayName', () => {
    it('has correct displayName', () => {
      expect(LeftSidebarLayout.displayName).toBe('LeftSidebarLayout');
    });
  });
});
