// src/client/ui/src/layouts/shells/RightSidebarLayout.test.tsx
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, it, expect } from 'vitest';

import { RightSidebarLayout } from './RightSidebarLayout';

describe('RightSidebarLayout', () => {
  describe('Basic Rendering', () => {
    it('renders children when no slots provided', () => {
      render(<RightSidebarLayout>Panel Content</RightSidebarLayout>);
      expect(screen.getByText('Panel Content')).toBeInTheDocument();
    });

    it('renders as aside element', () => {
      render(<RightSidebarLayout data-testid="sidebar">Content</RightSidebarLayout>);
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar.tagName).toBe('ASIDE');
    });

    it('applies right-sidebar class', () => {
      render(<RightSidebarLayout data-testid="sidebar">Content</RightSidebarLayout>);
      expect(screen.getByTestId('sidebar')).toHaveClass('right-sidebar');
    });
  });

  describe('Slot Rendering', () => {
    it('renders header slot', () => {
      render(<RightSidebarLayout header={<span>Header</span>} />);
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Header').parentElement).toHaveClass('right-sidebar-header');
    });

    it('renders content slot', () => {
      render(<RightSidebarLayout content={<span>Content</span>} />);
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Content').parentElement).toHaveClass('right-sidebar-content');
    });

    it('renders both header and content slots', () => {
      render(<RightSidebarLayout header={<span>Header</span>} content={<span>Content</span>} />);
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('prefers slots over children when slots provided', () => {
      render(
        <RightSidebarLayout header={<span>Header</span>}>Children Content</RightSidebarLayout>,
      );
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.queryByText('Children Content')).not.toBeInTheDocument();
    });
  });

  describe('Border Styling', () => {
    it('applies bordered class by default', () => {
      render(<RightSidebarLayout data-testid="sidebar">Content</RightSidebarLayout>);
      expect(screen.getByTestId('sidebar')).toHaveClass('right-sidebar--bordered');
    });

    it('removes bordered class when bordered=false', () => {
      render(
        <RightSidebarLayout data-testid="sidebar" bordered={false}>
          Content
        </RightSidebarLayout>,
      );
      expect(screen.getByTestId('sidebar')).not.toHaveClass('right-sidebar--bordered');
    });

    it('applies bordered class when bordered=true', () => {
      render(
        <RightSidebarLayout data-testid="sidebar" bordered={true}>
          Content
        </RightSidebarLayout>,
      );
      expect(screen.getByTestId('sidebar')).toHaveClass('right-sidebar--bordered');
    });
  });

  describe('Width Prop', () => {
    it('uses default width', () => {
      render(<RightSidebarLayout data-testid="sidebar">Content</RightSidebarLayout>);
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveStyle({ ['--right-sidebar-width']: '20rem' });
    });

    it('accepts string width', () => {
      render(
        <RightSidebarLayout data-testid="sidebar" width="30rem">
          Content
        </RightSidebarLayout>,
      );
      expect(screen.getByTestId('sidebar')).toHaveStyle({ ['--right-sidebar-width']: '30rem' });
    });

    it('converts number width to pixels', () => {
      render(
        <RightSidebarLayout data-testid="sidebar" width={400}>
          Content
        </RightSidebarLayout>,
      );
      expect(screen.getByTestId('sidebar')).toHaveStyle({ ['--right-sidebar-width']: '400px' });
    });
  });

  describe('Prop Forwarding', () => {
    it('forwards ref', () => {
      const ref = createRef<HTMLDivElement>();
      render(<RightSidebarLayout ref={ref}>Content</RightSidebarLayout>);
      expect(ref.current).toBeInstanceOf(HTMLElement);
      expect(ref.current?.tagName).toBe('ASIDE');
    });

    it('forwards className', () => {
      render(
        <RightSidebarLayout data-testid="sidebar" className="custom-class">
          Content
        </RightSidebarLayout>,
      );
      expect(screen.getByTestId('sidebar')).toHaveClass('custom-class');
      expect(screen.getByTestId('sidebar')).toHaveClass('right-sidebar');
    });

    it('forwards style prop', () => {
      render(
        <RightSidebarLayout data-testid="sidebar" style={{ padding: '20px' }}>
          Content
        </RightSidebarLayout>,
      );
      expect(screen.getByTestId('sidebar')).toHaveStyle({ padding: '20px' });
    });

    it('forwards data attributes', () => {
      render(
        <RightSidebarLayout data-testid="sidebar" data-panel="docs">
          Content
        </RightSidebarLayout>,
      );
      expect(screen.getByTestId('sidebar')).toHaveAttribute('data-panel', 'docs');
    });

    it('forwards aria attributes', () => {
      render(
        <RightSidebarLayout data-testid="sidebar" aria-label="Documentation panel">
          Content
        </RightSidebarLayout>,
      );
      expect(screen.getByTestId('sidebar')).toHaveAttribute('aria-label', 'Documentation panel');
    });
  });

  describe('Edge Cases', () => {
    it('treats null/undefined slots as "slots provided" (no children fallback)', () => {
      // When header={null}, hasSlots is true because null !== undefined
      // This means children won't be rendered as fallback
      render(
        <RightSidebarLayout data-testid="sidebar" header={null} content={undefined}>
          Fallback
        </RightSidebarLayout>,
      );
      // Children should NOT be rendered because slots are "provided" (even if null)
      expect(screen.queryByText('Fallback')).not.toBeInTheDocument();
    });

    it('renders children when no slot props are passed', () => {
      render(<RightSidebarLayout data-testid="sidebar">Fallback Content</RightSidebarLayout>);
      expect(screen.getByText('Fallback Content')).toBeInTheDocument();
    });

    it('handles empty string className', () => {
      render(
        <RightSidebarLayout data-testid="sidebar" className="">
          Content
        </RightSidebarLayout>,
      );
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar.className).toBe('right-sidebar right-sidebar--bordered');
    });

    it('preserves width CSS variable alongside other styles', () => {
      render(
        <RightSidebarLayout
          data-testid="sidebar"
          width="25rem"
          style={{ padding: '16px', overflow: 'auto' }}
        >
          Content
        </RightSidebarLayout>,
      );
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveStyle({
        ['--right-sidebar-width']: '25rem',
        padding: '16px',
        overflow: 'auto',
      });
    });

    it('handles complex header with close button pattern', () => {
      render(
        <RightSidebarLayout
          header={
            <div className="panel-header">
              <h2>Title</h2>
              <button aria-label="Close">×</button>
            </div>
          }
          content={<p>Panel content</p>}
        />,
      );
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
      expect(screen.getByText('Panel content')).toBeInTheDocument();
    });
  });

  describe('displayName', () => {
    it('has correct displayName', () => {
      expect(RightSidebarLayout.displayName).toBe('RightSidebarLayout');
    });
  });
});
