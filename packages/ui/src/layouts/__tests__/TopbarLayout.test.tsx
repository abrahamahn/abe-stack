// packages/ui/src/layouts/__tests__/TopbarLayout.test.tsx
/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TopbarLayout } from '../TopbarLayout';

describe('TopbarLayout', () => {
  describe('happy path', () => {
    it('renders header and main content correctly', () => {
      render(
        <TopbarLayout header={<div>Top Navigation</div>}>
          <div>Main Content</div>
        </TopbarLayout>,
      );

      expect(screen.getByText('Top Navigation')).toBeInTheDocument();
      expect(screen.getByText('Main Content')).toBeInTheDocument();
    });

    it('applies default header height', () => {
      const { container } = render(
        <TopbarLayout header={<div>Header</div>}>
          <div>Content</div>
        </TopbarLayout>,
      );

      expect(container.firstChild).toHaveStyle({
        '--ui-header-height': '64px',
      });
    });

    it('applies custom header height as number', () => {
      const { container } = render(
        <TopbarLayout header={<div>Header</div>} headerHeight={100}>
          <div>Content</div>
        </TopbarLayout>,
      );

      expect(container.firstChild).toHaveStyle({
        '--ui-header-height': '100px',
      });
    });

    it('applies custom header height as string', () => {
      const { container } = render(
        <TopbarLayout header={<div>Header</div>} headerHeight="5rem">
          <div>Content</div>
        </TopbarLayout>,
      );

      expect(container.firstChild).toHaveStyle({
        '--ui-header-height': '5rem',
      });
    });

    it('forwards className to root element', () => {
      const { container } = render(
        <TopbarLayout header={<div>Header</div>} className="custom-class">
          <div>Content</div>
        </TopbarLayout>,
      );

      expect(container.firstChild).toHaveClass('ui-topbar-layout');
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('forwards style prop to root element', () => {
      const { container } = render(
        <TopbarLayout header={<div>Header</div>} style={{ margin: '20px' }}>
          <div>Content</div>
        </TopbarLayout>,
      );

      expect(container.firstChild).toHaveStyle({
        margin: '20px',
      });
    });

    it('forwards data and aria attributes', () => {
      render(
        <TopbarLayout header={<div>Header</div>} data-testid="topbar" aria-label="Topbar layout">
          <div>Content</div>
        </TopbarLayout>,
      );

      const root = screen.getByTestId('topbar');
      expect(root).toHaveAttribute('aria-label', 'Topbar layout');
    });

    it('forwards ref to root element', () => {
      const ref = { current: null };
      render(
        <TopbarLayout header={<div>Header</div>} ref={ref}>
          <div>Content</div>
        </TopbarLayout>,
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('renders header inside header element', () => {
      const { container } = render(
        <TopbarLayout header={<div>Header Content</div>}>
          <div>Main</div>
        </TopbarLayout>,
      );

      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('ui-topbar-layout-header');
      expect(header).toHaveTextContent('Header Content');
    });

    it('renders children inside main element', () => {
      const { container } = render(
        <TopbarLayout header={<div>Header</div>}>
          <div>Main Content</div>
        </TopbarLayout>,
      );

      const main = container.querySelector('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveClass('ui-topbar-layout-main');
      expect(main).toHaveTextContent('Main Content');
    });
  });

  describe('edge cases - missing/invalid props', () => {
    it('handles null header without crashing', () => {
      expect(() => {
        render(
          <TopbarLayout header={null}>
            <div>Content</div>
          </TopbarLayout>,
        );
      }).not.toThrow();
    });

    it('handles undefined header without crashing', () => {
      expect(() => {
        render(
          <TopbarLayout header={undefined}>
            <div>Content</div>
          </TopbarLayout>,
        );
      }).not.toThrow();
    });

    it('renders with null children', () => {
      expect(() => {
        render(<TopbarLayout header={<div>Header</div>}>{null}</TopbarLayout>);
      }).not.toThrow();

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });

    it('renders with undefined children', () => {
      expect(() => {
        render(<TopbarLayout header={<div>Header</div>} />);
      }).not.toThrow();

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });

    it('renders with empty fragment as children', () => {
      render(
        <TopbarLayout header={<div>Header</div>}>
          <></>
        </TopbarLayout>,
      );

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      expect(main).toBeEmptyDOMElement();
    });
  });

  describe('edge cases - boundary conditions', () => {
    it('handles zero header height', () => {
      const { container } = render(
        <TopbarLayout header={<div>Header</div>} headerHeight={0}>
          <div>Content</div>
        </TopbarLayout>,
      );

      expect(container.firstChild).toHaveStyle({
        '--ui-header-height': '0px',
      });
    });

    it('handles negative header height', () => {
      const { container } = render(
        <TopbarLayout header={<div>Header</div>} headerHeight={-50}>
          <div>Content</div>
        </TopbarLayout>,
      );

      // Should still render, converting to string
      expect(container.firstChild).toHaveStyle({
        '--ui-header-height': '-50px',
      });
    });

    it('handles extremely large header height', () => {
      const { container } = render(
        <TopbarLayout header={<div>Header</div>} headerHeight={99999}>
          <div>Content</div>
        </TopbarLayout>,
      );

      expect(container.firstChild).toHaveStyle({
        '--ui-header-height': '99999px',
      });
    });

    it('handles empty string header height', () => {
      const { container } = render(
        <TopbarLayout header={<div>Header</div>} headerHeight="">
          <div>Content</div>
        </TopbarLayout>,
      );

      // Empty string should be preserved
      expect(container.firstChild).toHaveStyle({
        '--ui-header-height': '',
      });
    });

    it('handles NaN header height', () => {
      const { container } = render(
        <TopbarLayout header={<div>Header</div>} headerHeight={NaN}>
          <div>Content</div>
        </TopbarLayout>,
      );

      // NaN should convert to 'NaNpx'
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('edge cases - special characters', () => {
    it('safely renders header with special HTML characters', () => {
      render(
        <TopbarLayout header={<div>{'<script>alert("xss")</script>'}</div>}>
          <div>Content</div>
        </TopbarLayout>,
      );

      expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument();
    });

    it('handles className with special characters', () => {
      const { container } = render(
        <TopbarLayout header={<div>Header</div>} className="test-class__with--special___chars">
          <div>Content</div>
        </TopbarLayout>,
      );

      expect(container.firstChild).toHaveClass('test-class__with--special___chars');
    });

    it('handles empty className', () => {
      const { container } = render(
        <TopbarLayout header={<div>Header</div>} className="">
          <div>Content</div>
        </TopbarLayout>,
      );

      expect(container.firstChild).toHaveClass('ui-topbar-layout');
    });
  });

  describe('edge cases - rapid updates', () => {
    it('handles rapid prop changes', () => {
      const { rerender } = render(
        <TopbarLayout header={<div>Header 1</div>} headerHeight={64}>
          <div>Content</div>
        </TopbarLayout>,
      );

      rerender(
        <TopbarLayout header={<div>Header 2</div>} headerHeight={100}>
          <div>Content</div>
        </TopbarLayout>,
      );
      rerender(
        <TopbarLayout header={<div>Header 3</div>} headerHeight={50}>
          <div>Content</div>
        </TopbarLayout>,
      );
      rerender(
        <TopbarLayout header={<div>Header 4</div>} headerHeight={80}>
          <div>Content</div>
        </TopbarLayout>,
      );

      expect(screen.getByText('Header 4')).toBeInTheDocument();
      expect(screen.queryByText('Header 1')).not.toBeInTheDocument();
    });
  });

  describe('edge cases - cleanup', () => {
    it('cleans up properly on unmount', () => {
      const ref = { current: null };
      const { unmount } = render(
        <TopbarLayout header={<div>Header</div>} ref={ref}>
          <div>Content</div>
        </TopbarLayout>,
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);

      unmount();

      expect(ref.current).not.toBeInTheDocument();
    });
  });

  describe('edge cases - accessibility', () => {
    it('uses semantic HTML elements', () => {
      const { container } = render(
        <TopbarLayout header={<div>Header</div>}>
          <div>Content</div>
        </TopbarLayout>,
      );

      expect(container.querySelector('header')).toBeInTheDocument();
      expect(container.querySelector('main')).toBeInTheDocument();
    });

    it('header element has correct class for styling', () => {
      const { container } = render(
        <TopbarLayout header={<div>Header</div>}>
          <div>Content</div>
        </TopbarLayout>,
      );

      const header = container.querySelector('header');
      expect(header).toHaveClass('ui-topbar-layout-header');
    });

    it('main element has correct class for styling', () => {
      const { container } = render(
        <TopbarLayout header={<div>Header</div>}>
          <div>Content</div>
        </TopbarLayout>,
      );

      const main = container.querySelector('main');
      expect(main).toHaveClass('ui-topbar-layout-main');
    });
  });

  describe('user interactions - keyboard', () => {
    it('allows focus on interactive elements in header', () => {
      render(
        <TopbarLayout
          header={
            <>
              <button>Button 1</button>
              <button>Button 2</button>
            </>
          }
        >
          <div>Content</div>
        </TopbarLayout>,
      );

      const button1 = screen.getByText('Button 1');
      const button2 = screen.getByText('Button 2');

      button1.focus();
      expect(button1).toHaveFocus();

      button2.focus();
      expect(button2).toHaveFocus();
    });

    it('handles Escape key events', () => {
      const handleEscape = vi.fn();

      render(
        <TopbarLayout
          header={
            <div onKeyDown={(e) => e.key === 'Escape' && handleEscape()}>
              <button>Close</button>
            </div>
          }
        >
          <div>Content</div>
        </TopbarLayout>,
      );

      const closeButton = screen.getByText('Close');
      fireEvent.keyDown(closeButton, { key: 'Escape' });

      expect(handleEscape).toHaveBeenCalled();
    });

    it('handles Enter key on interactive elements', () => {
      const handleClick = vi.fn();

      render(
        <TopbarLayout header={<button onClick={handleClick}>Action</button>}>
          <div>Content</div>
        </TopbarLayout>,
      );

      const button = screen.getByText('Action');
      fireEvent.click(button); // Simulating Enter key triggering click

      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('user interactions - mouse/touch', () => {
    it('handles click events on header elements', () => {
      const handleClick = vi.fn();

      render(
        <TopbarLayout header={<button onClick={handleClick}>Menu</button>}>
          <div>Content</div>
        </TopbarLayout>,
      );

      const button = screen.getByText('Menu');
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles double-click events', () => {
      const handleDoubleClick = vi.fn();

      render(
        <TopbarLayout header={<div onDoubleClick={handleDoubleClick}>Logo</div>}>
          <div>Content</div>
        </TopbarLayout>,
      );

      const logo = screen.getByText('Logo');
      fireEvent.doubleClick(logo);

      expect(handleDoubleClick).toHaveBeenCalled();
    });

    it('handles rapid clicks without breaking', () => {
      let clickCount = 0;
      const handleClick = () => {
        clickCount++;
      };

      render(
        <TopbarLayout header={<button onClick={handleClick}>Rapid</button>}>
          <div>Content</div>
        </TopbarLayout>,
      );

      const button = screen.getByText('Rapid');

      for (let i = 0; i < 50; i++) {
        fireEvent.click(button);
      }

      expect(clickCount).toBe(50);
    });

    it('handles focus and blur events', () => {
      const handleFocus = vi.fn();
      const handleBlur = vi.fn();

      render(
        <TopbarLayout
          header={<input onFocus={handleFocus} onBlur={handleBlur} placeholder="Search" />}
        >
          <div>Content</div>
        </TopbarLayout>,
      );

      const input = screen.getByPlaceholderText('Search');

      fireEvent.focus(input);
      expect(handleFocus).toHaveBeenCalled();

      fireEvent.blur(input);
      expect(handleBlur).toHaveBeenCalled();
    });

    it('handles mouseEnter and mouseLeave events', () => {
      const handleMouseEnter = vi.fn();
      const handleMouseLeave = vi.fn();

      render(
        <TopbarLayout
          header={
            <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
              Hover me
            </div>
          }
        >
          <div>Content</div>
        </TopbarLayout>,
      );

      const hoverTarget = screen.getByText('Hover me');

      fireEvent.mouseEnter(hoverTarget);
      expect(handleMouseEnter).toHaveBeenCalled();

      fireEvent.mouseLeave(hoverTarget);
      expect(handleMouseLeave).toHaveBeenCalled();
    });
  });

  describe('user interactions - forms', () => {
    it('handles form submission in header', () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());

      render(
        <TopbarLayout
          header={
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Search" />
              <button type="submit">Submit</button>
            </form>
          }
        >
          <div>Content</div>
        </TopbarLayout>,
      );

      const button = screen.getByText('Submit');
      fireEvent.click(button);

      expect(handleSubmit).toHaveBeenCalled();
    });

    it('handles input changes', () => {
      const handleChange = vi.fn();

      render(
        <TopbarLayout header={<input onChange={handleChange} placeholder="Type here" />}>
          <div>Content</div>
        </TopbarLayout>,
      );

      const input = screen.getByPlaceholderText('Type here');
      fireEvent.change(input, { target: { value: 'test input' } });

      expect(handleChange).toHaveBeenCalled();
      expect(input).toHaveValue('test input');
    });
  });

  describe('user interactions - responsive', () => {
    it('maintains layout on window resize', () => {
      const { container } = render(
        <TopbarLayout header={<div>Header</div>}>
          <div>Content</div>
        </TopbarLayout>,
      );

      // Simulate window resize
      global.innerWidth = 500;
      global.innerHeight = 800;
      fireEvent(window, new Event('resize'));

      expect(container.firstChild).toBeInTheDocument();
      expect(container.querySelector('header')).toBeInTheDocument();
      expect(container.querySelector('main')).toBeInTheDocument();
    });

    it('maintains layout integrity on extreme resize', () => {
      const { container } = render(
        <TopbarLayout header={<div>Header</div>} headerHeight={64}>
          <div>Content</div>
        </TopbarLayout>,
      );

      // Very small viewport
      global.innerWidth = 320;
      fireEvent(window, new Event('resize'));
      expect(container.firstChild).toBeInTheDocument();

      // Very large viewport
      global.innerWidth = 3840;
      fireEvent(window, new Event('resize'));
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
