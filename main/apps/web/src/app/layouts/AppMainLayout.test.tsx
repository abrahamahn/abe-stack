// main/apps/web/src/app/layouts/AppMainLayout.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { AppMainLayout } from './AppMainLayout';

describe('AppMainLayout', () => {
  const paneConfig = {
    left: { visible: true, size: 18 },
    right: { visible: true, size: 24 },
    top: { visible: true, size: 6 },
    bottom: { visible: true, size: 8 },
  };

  it('renders center, left, and right content', () => {
    render(
      <AppMainLayout
        paneConfig={paneConfig}
        togglePane={vi.fn()}
        handlePaneResize={vi.fn()}
        resetLayout={vi.fn()}
        leftSidebar={<div>Left area</div>}
        rightSidebar={<div>Right area</div>}
      >
        <div>Main content</div>
      </AppMainLayout>,
    );

    expect(screen.getByText('Main content')).toBeInTheDocument();
    expect(screen.getByText('Left area')).toBeInTheDocument();
    expect(screen.getByText('Right area')).toBeInTheDocument();
  });

  it('invokes pane toggles and reset actions', () => {
    const togglePane = vi.fn();
    const resetLayout = vi.fn();

    render(
      <AppMainLayout
        paneConfig={paneConfig}
        togglePane={togglePane}
        handlePaneResize={vi.fn()}
        resetLayout={resetLayout}
        leftSidebar={<div>Left area</div>}
        rightSidebar={<div>Right area</div>}
      >
        <div>Main content</div>
      </AppMainLayout>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Top bar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Left panel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Right panel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Bottom bar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset layout' }));

    expect(togglePane).toHaveBeenCalledWith('top');
    expect(togglePane).toHaveBeenCalledWith('left');
    expect(togglePane).toHaveBeenCalledWith('right');
    expect(togglePane).toHaveBeenCalledWith('bottom');
    expect(resetLayout).toHaveBeenCalledTimes(1);
  });

  it('invokes left and right close actions', () => {
    const togglePane = vi.fn();

    render(
      <AppMainLayout
        paneConfig={paneConfig}
        togglePane={togglePane}
        handlePaneResize={vi.fn()}
        resetLayout={vi.fn()}
        leftSidebar={<div>Left area</div>}
        rightSidebar={<div>Right area</div>}
      >
        <div>Main content</div>
      </AppMainLayout>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Left panel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Right panel' }));

    expect(togglePane).toHaveBeenCalledWith('left');
    expect(togglePane).toHaveBeenCalledWith('right');
  });
});
