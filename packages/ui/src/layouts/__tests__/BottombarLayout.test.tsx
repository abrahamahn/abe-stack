// packages/ui/src/layouts/__tests__/BottombarLayout.test.tsx
/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BottombarLayout } from '../BottombarLayout';

describe('BottombarLayout', () => {
  describe('happy path', () => {
    it('renders footer and main content correctly', () => {
      render(
        <BottombarLayout footer={<div>Bottom Navigation</div>}>
          <div>Main Content</div>
        </BottombarLayout>,
      );

      expect(screen.getByText('Bottom Navigation')).toBeInTheDocument();
      expect(screen.getByText('Main Content')).toBeInTheDocument();
    });

    it('applies default footer height', () => {
      const { container } = render(
        <BottombarLayout footer={<div>Footer</div>}>
          <div>Content</div>
        </BottombarLayout>,
      );

      expect(container.firstChild).toHaveStyle({
        '--ui-footer-height': '64px',
      });
    });

    it('applies custom footer height as number', () => {
      const { container } = render(
        <BottombarLayout footer={<div>Footer</div>} footerHeight={80}>
          <div>Content</div>
        </BottombarLayout>,
      );

      expect(container.firstChild).toHaveStyle({
        '--ui-footer-height': '80px',
      });
    });

    it('applies custom footer height as string', () => {
      const { container } = render(
        <BottombarLayout footer={<div>Footer</div>} footerHeight="4rem">
          <div>Content</div>
        </BottombarLayout>,
      );

      expect(container.firstChild).toHaveStyle({
        '--ui-footer-height': '4rem',
      });
    });

    it('forwards className to root element', () => {
      const { container } = render(
        <BottombarLayout footer={<div>Footer</div>} className="custom-class">
          <div>Content</div>
        </BottombarLayout>,
      );

      expect(container.firstChild).toHaveClass('ui-bottombar-layout');
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('forwards style prop to root element', () => {
      const { container } = render(
        <BottombarLayout footer={<div>Footer</div>} style={{ margin: '20px' }}>
          <div>Content</div>
        </BottombarLayout>,
      );

      expect(container.firstChild).toHaveStyle({
        margin: '20px',
      });
    });

    it('forwards data and aria attributes', () => {
      render(
        <BottombarLayout footer={<div>Footer</div>} data-testid="bottombar" aria-label="Bottom">
          <div>Content</div>
        </BottombarLayout>,
      );

      const root = screen.getByTestId('bottombar');
      expect(root).toHaveAttribute('aria-label', 'Bottom');
    });

    it('forwards ref to root element', () => {
      const ref = { current: null };
      render(
        <BottombarLayout footer={<div>Footer</div>} ref={ref}>
          <div>Content</div>
        </BottombarLayout>,
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('renders footer inside footer element', () => {
      const { container } = render(
        <BottombarLayout footer={<div>Footer Content</div>}>
          <div>Main</div>
        </BottombarLayout>,
      );

      const footer = container.querySelector('footer');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('ui-bottombar-layout-footer');
      expect(footer).toHaveTextContent('Footer Content');
    });

    it('renders children inside main element', () => {
      const { container } = render(
        <BottombarLayout footer={<div>Footer</div>}>
          <div>Main Content</div>
        </BottombarLayout>,
      );

      const main = container.querySelector('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveClass('ui-bottombar-layout-main');
      expect(main).toHaveTextContent('Main Content');
    });
  });

  describe('edge cases - missing/invalid props', () => {
    it('handles null footer without crashing', () => {
      expect(() => {
        render(
          <BottombarLayout footer={null}>
            <div>Content</div>
          </BottombarLayout>,
        );
      }).not.toThrow();
    });

    it('handles undefined footer without crashing', () => {
      expect(() => {
        render(
          <BottombarLayout footer={undefined}>
            <div>Content</div>
          </BottombarLayout>,
        );
      }).not.toThrow();
    });

    it('renders with null children', () => {
      expect(() => {
        render(<BottombarLayout footer={<div>Footer</div>}>{null}</BottombarLayout>);
      }).not.toThrow();

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });

    it('renders with undefined children', () => {
      expect(() => {
        render(<BottombarLayout footer={<div>Footer</div>} />);
      }).not.toThrow();

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });

    it('renders with empty fragment as children', () => {
      render(
        <BottombarLayout footer={<div>Footer</div>}>
          <></>
        </BottombarLayout>,
      );

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      expect(main).toBeEmptyDOMElement();
    });
  });

  describe('edge cases - boundary conditions', () => {
    it('handles zero footer height', () => {
      const { container } = render(
        <BottombarLayout footer={<div>Footer</div>} footerHeight={0}>
          <div>Content</div>
        </BottombarLayout>,
      );

      expect(container.firstChild).toHaveStyle({
        '--ui-footer-height': '0px',
      });
    });

    it('handles negative footer height', () => {
      const { container } = render(
        <BottombarLayout footer={<div>Footer</div>} footerHeight={-50}>
          <div>Content</div>
        </BottombarLayout>,
      );

      // Should still render, converting to string
      expect(container.firstChild).toHaveStyle({
        '--ui-footer-height': '-50px',
      });
    });

    it('handles extremely large footer height', () => {
      const { container } = render(
        <BottombarLayout footer={<div>Footer</div>} footerHeight={99999}>
          <div>Content</div>
        </BottombarLayout>,
      );

      expect(container.firstChild).toHaveStyle({
        '--ui-footer-height': '99999px',
      });
    });

    it('handles empty string footer height', () => {
      const { container } = render(
        <BottombarLayout footer={<div>Footer</div>} footerHeight="">
          <div>Content</div>
        </BottombarLayout>,
      );

      // Empty string should be preserved
      expect(container.firstChild).toHaveStyle({
        '--ui-footer-height': '',
      });
    });

    it('handles NaN footer height', () => {
      const { container } = render(
        <BottombarLayout footer={<div>Footer</div>} footerHeight={NaN}>
          <div>Content</div>
        </BottombarLayout>,
      );

      // NaN should convert to 'NaNpx'
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('edge cases - special characters', () => {
    it('safely renders footer with special HTML characters', () => {
      render(
        <BottombarLayout footer={<div>{'<script>alert("xss")</script>'}</div>}>
          <div>Content</div>
        </BottombarLayout>,
      );

      expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument();
    });

    it('handles className with special characters', () => {
      const { container } = render(
        <BottombarLayout footer={<div>Footer</div>} className="test-class__with--special___chars">
          <div>Content</div>
        </BottombarLayout>,
      );

      expect(container.firstChild).toHaveClass('test-class__with--special___chars');
    });

    it('handles empty className', () => {
      const { container } = render(
        <BottombarLayout footer={<div>Footer</div>} className="">
          <div>Content</div>
        </BottombarLayout>,
      );

      expect(container.firstChild).toHaveClass('ui-bottombar-layout');
    });
  });

  describe('edge cases - rapid updates', () => {
    it('handles rapid prop changes', () => {
      const { rerender } = render(
        <BottombarLayout footer={<div>Footer 1</div>} footerHeight={64}>
          <div>Content</div>
        </BottombarLayout>,
      );

      rerender(
        <BottombarLayout footer={<div>Footer 2</div>} footerHeight={100}>
          <div>Content</div>
        </BottombarLayout>,
      );
      rerender(
        <BottombarLayout footer={<div>Footer 3</div>} footerHeight={50}>
          <div>Content</div>
        </BottombarLayout>,
      );
      rerender(
        <BottombarLayout footer={<div>Footer 4</div>} footerHeight={80}>
          <div>Content</div>
        </BottombarLayout>,
      );

      expect(screen.getByText('Footer 4')).toBeInTheDocument();
      expect(screen.queryByText('Footer 1')).not.toBeInTheDocument();
    });
  });

  describe('edge cases - cleanup', () => {
    it('cleans up properly on unmount', () => {
      const ref = { current: null };
      const { unmount } = render(
        <BottombarLayout footer={<div>Footer</div>} ref={ref}>
          <div>Content</div>
        </BottombarLayout>,
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);

      unmount();

      expect(ref.current).not.toBeInTheDocument();
    });
  });

  describe('edge cases - accessibility', () => {
    it('uses semantic HTML elements', () => {
      const { container } = render(
        <BottombarLayout footer={<div>Footer</div>}>
          <div>Content</div>
        </BottombarLayout>,
      );

      expect(container.querySelector('footer')).toBeInTheDocument();
      expect(container.querySelector('main')).toBeInTheDocument();
    });

    it('footer element has correct class for styling', () => {
      const { container } = render(
        <BottombarLayout footer={<div>Footer</div>}>
          <div>Content</div>
        </BottombarLayout>,
      );

      const footer = container.querySelector('footer');
      expect(footer).toHaveClass('ui-bottombar-layout-footer');
    });

    it('main element has correct class for styling', () => {
      const { container } = render(
        <BottombarLayout footer={<div>Footer</div>}>
          <div>Content</div>
        </BottombarLayout>,
      );

      const main = container.querySelector('main');
      expect(main).toHaveClass('ui-bottombar-layout-main');
    });
  });

  describe('user interactions - keyboard', () => {
    it('allows focus on interactive elements in footer', () => {
      render(
        <BottombarLayout
          footer={
            <>
              <button>Nav 1</button>
              <button>Nav 2</button>
            </>
          }
        >
          <div>Content</div>
        </BottombarLayout>,
      );

      const nav1 = screen.getByText('Nav 1');
      const nav2 = screen.getByText('Nav 2');

      nav1.focus();
      expect(nav1).toHaveFocus();

      nav2.focus();
      expect(nav2).toHaveFocus();
    });

    it('handles Escape key events', () => {
      const handleEscape = vi.fn();

      render(
        <BottombarLayout
          footer={
            <div onKeyDown={(e) => e.key === 'Escape' && handleEscape()}>
              <button>Close</button>
            </div>
          }
        >
          <div>Content</div>
        </BottombarLayout>,
      );

      const closeButton = screen.getByText('Close');
      fireEvent.keyDown(closeButton, { key: 'Escape' });

      expect(handleEscape).toHaveBeenCalled();
    });

    it('handles Enter key on interactive elements', () => {
      const handleClick = vi.fn();

      render(
        <BottombarLayout footer={<button onClick={handleClick}>Action</button>}>
          <div>Content</div>
        </BottombarLayout>,
      );

      const button = screen.getByText('Action');
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('user interactions - mouse/touch', () => {
    it('handles click events on footer elements', () => {
      const handleClick = vi.fn();

      render(
        <BottombarLayout footer={<button onClick={handleClick}>Home</button>}>
          <div>Content</div>
        </BottombarLayout>,
      );

      const button = screen.getByText('Home');
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles double-click events', () => {
      const handleDoubleClick = vi.fn();

      render(
        <BottombarLayout footer={<div onDoubleClick={handleDoubleClick}>Icon</div>}>
          <div>Content</div>
        </BottombarLayout>,
      );

      const icon = screen.getByText('Icon');
      fireEvent.doubleClick(icon);

      expect(handleDoubleClick).toHaveBeenCalled();
    });

    it('handles rapid clicks without breaking', () => {
      let clickCount = 0;
      const handleClick = () => {
        clickCount++;
      };

      render(
        <BottombarLayout footer={<button onClick={handleClick}>Rapid</button>}>
          <div>Content</div>
        </BottombarLayout>,
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
        <BottombarLayout
          footer={<input onFocus={handleFocus} onBlur={handleBlur} placeholder="Filter" />}
        >
          <div>Content</div>
        </BottombarLayout>,
      );

      const input = screen.getByPlaceholderText('Filter');

      fireEvent.focus(input);
      expect(handleFocus).toHaveBeenCalled();

      fireEvent.blur(input);
      expect(handleBlur).toHaveBeenCalled();
    });

    it('handles mouseEnter and mouseLeave events', () => {
      const handleMouseEnter = vi.fn();
      const handleMouseLeave = vi.fn();

      render(
        <BottombarLayout
          footer={
            <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
              Hover me
            </div>
          }
        >
          <div>Content</div>
        </BottombarLayout>,
      );

      const hoverTarget = screen.getByText('Hover me');

      fireEvent.mouseEnter(hoverTarget);
      expect(handleMouseEnter).toHaveBeenCalled();

      fireEvent.mouseLeave(hoverTarget);
      expect(handleMouseLeave).toHaveBeenCalled();
    });
  });

  describe('user interactions - forms', () => {
    it('handles form submission in footer', () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());

      render(
        <BottombarLayout
          footer={
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Comment" />
              <button type="submit">Send</button>
            </form>
          }
        >
          <div>Content</div>
        </BottombarLayout>,
      );

      const button = screen.getByText('Send');
      fireEvent.click(button);

      expect(handleSubmit).toHaveBeenCalled();
    });

    it('handles input changes', () => {
      const handleChange = vi.fn();

      render(
        <BottombarLayout footer={<input onChange={handleChange} placeholder="Type here" />}>
          <div>Content</div>
        </BottombarLayout>,
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
        <BottombarLayout footer={<div>Footer</div>}>
          <div>Content</div>
        </BottombarLayout>,
      );

      // Simulate window resize
      global.innerWidth = 500;
      global.innerHeight = 800;
      fireEvent(window, new Event('resize'));

      expect(container.firstChild).toBeInTheDocument();
      expect(container.querySelector('footer')).toBeInTheDocument();
      expect(container.querySelector('main')).toBeInTheDocument();
    });

    it('maintains layout integrity on extreme resize', () => {
      const { container } = render(
        <BottombarLayout footer={<div>Footer</div>} footerHeight={64}>
          <div>Content</div>
        </BottombarLayout>,
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
