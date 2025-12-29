import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { ResizablePanelGroup, ResizablePanel } from '../ResizablePanel';


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
    const panel = screen.getByText('Panel 1').closest('.ui-resizable-panel');
    expect(panel).toHaveStyle({ flexBasis: '30%' });
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
});
