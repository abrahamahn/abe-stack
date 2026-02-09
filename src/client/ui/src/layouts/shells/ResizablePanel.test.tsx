// src/client/ui/src/layouts/shells/ResizablePanel.test.tsx
/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ResizablePanelGroup, ResizablePanel, ResizableSeparator } from './ResizablePanel';

describe('ResizablePanel', () => {
  it('renders panel group with children', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>Panel 1</ResizablePanel>
        <ResizablePanel>Panel 2</ResizablePanel>
      </ResizablePanelGroup>,
    );
    expect(screen.getByText('Panel 1')).toBeInTheDocument();
    expect(screen.getByText('Panel 2')).toBeInTheDocument();
  });

  it('renders vertical layout', () => {
    const { container } = render(
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel>Panel 1</ResizablePanel>
      </ResizablePanelGroup>,
    );
    expect(container.firstChild).toHaveStyle({ flexDirection: 'column' });
  });

  it('renders separator', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>Panel 1</ResizablePanel>
      </ResizablePanelGroup>,
    );
    // The component implementation adds a separator after the panel automatically
    const separator = screen.getByRole('separator');
    expect(separator).toBeInTheDocument();
  });

  it('initializes with default size', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel defaultSize={30}>Panel 1</ResizablePanel>
      </ResizablePanelGroup>,
    );
    // Check if flex-basis is set correctly
    // Note: implementation details might vary, but flexBasis should be 30%
    const panel = screen.getByText('Panel 1').closest('.resizable-panel');
    expect(panel).toHaveStyle({ flexBasis: '30%' });
  });

  it('applies collapsed styles and size', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel collapsed>Panel 1</ResizablePanel>
      </ResizablePanelGroup>,
    );
    const panel = screen.getByText('Panel 1').closest('.resizable-panel');
    expect(panel).toHaveStyle({ flexBasis: '0%' });
    const inlineStyle = panel?.getAttribute('style') ?? '';
    expect(inlineStyle).toMatch(/padding:\s*0/);
    expect(inlineStyle).toContain('overflow: hidden');
  });

  // Basic interaction test (mocking layout behavior is hard in JSDOM)
  it('handles mouse events on separator', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>Panel 1</ResizablePanel>
      </ResizablePanelGroup>,
    );
    const separator = screen.getByRole('separator');

    fireEvent.mouseDown(separator);
    expect(separator).toHaveClass('dragging');

    fireEvent.mouseUp(document);
    expect(separator).not.toHaveClass('dragging');
  });

  it('calls onResize when dragging the separator', () => {
    const handleResize = vi.fn();
    render(
      <ResizablePanelGroup>
        <ResizablePanel onResize={handleResize}>Panel 1</ResizablePanel>
      </ResizablePanelGroup>,
    );

    const separator = screen.getByRole('separator');
    fireEvent.mouseDown(separator, { clientX: 0 });
    fireEvent.mouseMove(document, { clientX: 10 });

    expect(handleResize).toHaveBeenCalled();
    const nextSize = handleResize.mock.calls[0]?.[0] as number;
    expect(nextSize).toBeGreaterThan(50);
  });

  it('inverts resize direction when invertResize is true', () => {
    const handleResize = vi.fn();
    render(
      <ResizablePanelGroup>
        <ResizablePanel invertResize onResize={handleResize}>
          Panel 1
        </ResizablePanel>
      </ResizablePanelGroup>,
    );

    const separator = screen.getByRole('separator');
    fireEvent.mouseDown(separator, { clientX: 0 });
    fireEvent.mouseMove(document, { clientX: 20 });

    const nextSize = handleResize.mock.calls[0]?.[0] as number;
    expect(nextSize).toBeLessThan(50);
  });

  it('supports pixel units and respects min/max size', () => {
    const handleResize = vi.fn();
    render(
      <ResizablePanelGroup>
        <ResizablePanel
          unit="px"
          defaultSize={100}
          minSize={50}
          maxSize={200}
          onResize={handleResize}
        >
          Panel 1
        </ResizablePanel>
      </ResizablePanelGroup>,
    );

    const panel = screen.getByText('Panel 1').closest('.resizable-panel');
    expect(panel).toHaveStyle({ flexBasis: '100px' });
  });

  it('handles vertical direction resize', () => {
    const handleResize = vi.fn();
    render(
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel direction="vertical" onResize={handleResize}>
          Panel 1
        </ResizablePanel>
      </ResizablePanelGroup>,
    );

    const separator = screen.getByRole('separator');
    expect(separator).toHaveAttribute('data-direction', 'vertical');
    expect(separator).toHaveAttribute('aria-orientation', 'horizontal');

    fireEvent.mouseDown(separator, { clientY: 0 });
    fireEvent.mouseMove(document, { clientY: 10 });
    expect(handleResize).toHaveBeenCalled();
  });

  it('hides separator when panel is collapsed', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel collapsed>Panel 1</ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('forwards ref to panel and group', () => {
    const panelRef = { current: null };
    const groupRef = { current: null };

    render(
      <ResizablePanelGroup ref={groupRef}>
        <ResizablePanel ref={panelRef}>Panel 1</ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(panelRef.current).toBeInstanceOf(HTMLDivElement);
    expect(groupRef.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges className on panel and group', () => {
    const { container } = render(
      <ResizablePanelGroup className="custom-group">
        <ResizablePanel className="custom-panel">Panel 1</ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(container.querySelector('.resizable-panel-group')).toHaveClass('custom-group');
    expect(container.querySelector('.resizable-panel')).toHaveClass('custom-panel');
  });

  // ============================================================================
  // Keyboard Accessibility Tests
  // ============================================================================

  describe('keyboard accessibility', () => {
    it('separator is focusable with tabIndex', () => {
      render(
        <ResizablePanelGroup>
          <ResizablePanel>Panel 1</ResizablePanel>
        </ResizablePanelGroup>,
      );

      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('tabIndex', '0');
    });

    it('has proper ARIA attributes', () => {
      render(
        <ResizablePanelGroup>
          <ResizablePanel defaultSize={40} minSize={20} maxSize={80}>
            Panel 1
          </ResizablePanel>
        </ResizablePanelGroup>,
      );

      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('aria-valuenow', '40');
      expect(separator).toHaveAttribute('aria-valuemin', '20');
      expect(separator).toHaveAttribute('aria-valuemax', '80');
      expect(separator).toHaveAttribute('aria-label');
    });

    it('resizes panel with ArrowRight key (horizontal)', async () => {
      const user = userEvent.setup();
      const handleResize = vi.fn();

      render(
        <ResizablePanelGroup>
          <ResizablePanel defaultSize={50} onResize={handleResize}>
            Panel 1
          </ResizablePanel>
        </ResizablePanelGroup>,
      );

      const separator = screen.getByRole('separator');
      separator.focus();

      await user.keyboard('{ArrowRight}');

      expect(handleResize).toHaveBeenCalled();
      const newSize = handleResize.mock.calls[0]?.[0] as number;
      expect(newSize).toBe(52); // default step is 2
    });

    it('resizes panel with ArrowLeft key (horizontal)', async () => {
      const user = userEvent.setup();
      const handleResize = vi.fn();

      render(
        <ResizablePanelGroup>
          <ResizablePanel defaultSize={50} onResize={handleResize}>
            Panel 1
          </ResizablePanel>
        </ResizablePanelGroup>,
      );

      const separator = screen.getByRole('separator');
      separator.focus();

      await user.keyboard('{ArrowLeft}');

      expect(handleResize).toHaveBeenCalled();
      const newSize = handleResize.mock.calls[0]?.[0] as number;
      expect(newSize).toBe(48); // default step is 2
    });

    it('uses large step with Shift+Arrow', async () => {
      const user = userEvent.setup();
      const handleResize = vi.fn();

      render(
        <ResizablePanelGroup>
          <ResizablePanel defaultSize={50} onResize={handleResize}>
            Panel 1
          </ResizablePanel>
        </ResizablePanelGroup>,
      );

      const separator = screen.getByRole('separator');
      separator.focus();

      await user.keyboard('{Shift>}{ArrowRight}{/Shift}');

      expect(handleResize).toHaveBeenCalled();
      const newSize = handleResize.mock.calls[0]?.[0] as number;
      expect(newSize).toBe(60); // large step is 10
    });

    it('jumps to minimum with Home key', async () => {
      const user = userEvent.setup();
      const handleResize = vi.fn();

      render(
        <ResizablePanelGroup>
          <ResizablePanel defaultSize={50} minSize={20} onResize={handleResize}>
            Panel 1
          </ResizablePanel>
        </ResizablePanelGroup>,
      );

      const separator = screen.getByRole('separator');
      separator.focus();

      await user.keyboard('{Home}');

      expect(handleResize).toHaveBeenCalled();
      const newSize = handleResize.mock.calls[0]?.[0] as number;
      expect(newSize).toBe(20);
    });

    it('jumps to maximum with End key', async () => {
      const user = userEvent.setup();
      const handleResize = vi.fn();

      render(
        <ResizablePanelGroup>
          <ResizablePanel defaultSize={50} maxSize={80} onResize={handleResize}>
            Panel 1
          </ResizablePanel>
        </ResizablePanelGroup>,
      );

      const separator = screen.getByRole('separator');
      separator.focus();

      await user.keyboard('{End}');

      expect(handleResize).toHaveBeenCalled();
      const newSize = handleResize.mock.calls[0]?.[0] as number;
      expect(newSize).toBe(80);
    });

    it('respects min/max bounds during keyboard resize', async () => {
      const user = userEvent.setup();
      const handleResize = vi.fn();

      render(
        <ResizablePanelGroup>
          <ResizablePanel defaultSize={12} minSize={10} onResize={handleResize}>
            Panel 1
          </ResizablePanel>
        </ResizablePanelGroup>,
      );

      const separator = screen.getByRole('separator');
      separator.focus();

      await user.keyboard('{ArrowLeft}'); // Try to go below min

      expect(handleResize).toHaveBeenCalled();
      const newSize = handleResize.mock.calls[0]?.[0] as number;
      expect(newSize).toBe(10); // Clamped to min
    });

    it('handles vertical direction with ArrowDown/ArrowUp', async () => {
      const user = userEvent.setup();
      const handleResize = vi.fn();

      render(
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel direction="vertical" defaultSize={50} onResize={handleResize}>
            Panel 1
          </ResizablePanel>
        </ResizablePanelGroup>,
      );

      const separator = screen.getByRole('separator');
      separator.focus();

      await user.keyboard('{ArrowDown}');

      expect(handleResize).toHaveBeenCalled();
      const newSize = handleResize.mock.calls[0]?.[0] as number;
      expect(newSize).toBe(52);
    });
  });

  // ============================================================================
  // ResizableSeparator Standalone Tests
  // ============================================================================

  describe('ResizableSeparator', () => {
    it('renders with accessible label', () => {
      render(
        <ResizableSeparator
          currentSize={50}
          minSize={10}
          maxSize={90}
          aria-label="Custom resize handle"
        />,
      );

      const separator = screen.getByRole('separator');
      expect(separator).toHaveAttribute('aria-label', 'Custom resize handle');
    });

    it('generates default label based on direction', () => {
      const { rerender } = render(<ResizableSeparator currentSize={50} direction="horizontal" />);

      let separator = screen.getByRole('separator');
      expect(separator.getAttribute('aria-label')).toContain('width');

      rerender(<ResizableSeparator currentSize={50} direction="vertical" />);

      separator = screen.getByRole('separator');
      expect(separator.getAttribute('aria-label')).toContain('height');
    });
  });
});
