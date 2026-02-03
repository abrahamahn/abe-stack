// apps/web/src/features/demo/components/DemoBottomBar.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DemoBottomBar } from './DemoBottomBar';

import type { DemoBottomBarProps } from './DemoBottomBar';

vi.mock('@abe-stack/ui', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  EnvironmentBadge: ({ environment }: { environment: string }) => <div>{environment}</div>,
  Kbd: ({ children }: { children: React.ReactNode }) => <kbd>{children}</kbd>,
  ResizablePanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  VersionBadge: ({ version }: { version: string }) => <div>{version}</div>,
}));

vi.mock('@config', () => ({
  clientConfig: {
    uiVersion: '1.0.0',
    isDev: true,
  },
}));

vi.mock('@demo/hooks', () => ({
  KEYBOARD_SHORTCUTS: [
    { key: 'K', description: 'Search' },
    { key: 'T', description: 'Theme' },
  ],
}));

describe('DemoBottomBar', () => {
  const defaultProps: DemoBottomBarProps = {
    size: 10,
    visible: true,
    onResize: vi.fn(),
    totalComponents: 42,
    cycleTheme: vi.fn(),
    getThemeIcon: vi.fn(() => '🌙'),
    getThemeLabel: vi.fn(() => 'Dark'),
    cycleDensity: vi.fn(),
    getDensityLabel: vi.fn(() => 'Normal'),
    cycleContrast: vi.fn(),
    getContrastLabel: vi.fn(() => 'Standard'),
  };

  it('should render version and environment', () => {
    render(<DemoBottomBar {...defaultProps} />);
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
    expect(screen.getByText('development')).toBeInTheDocument();
  });

  it('should render component count', () => {
    render(<DemoBottomBar {...defaultProps} />);
    expect(screen.getByText('42 components')).toBeInTheDocument();
  });

  it('should render keyboard shortcuts', () => {
    render(<DemoBottomBar {...defaultProps} />);
    expect(screen.getByText('K')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('should call cycleTheme when theme button clicked', () => {
    render(<DemoBottomBar {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    const lastButton = buttons[buttons.length - 1];
    if (lastButton) {
      fireEvent.click(lastButton);
    }
    expect(defaultProps.cycleTheme).toHaveBeenCalled();
  });

  it('should call cycleDensity when density button clicked', () => {
    render(<DemoBottomBar {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    if (buttons[0]) {
      fireEvent.click(buttons[0]);
    }
    expect(defaultProps.cycleDensity).toHaveBeenCalled();
  });

  it('should call cycleContrast when contrast button clicked', () => {
    render(<DemoBottomBar {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    if (buttons[1]) {
      fireEvent.click(buttons[1]);
    }
    expect(defaultProps.cycleContrast).toHaveBeenCalled();
  });

  it('should display theme label', () => {
    render(<DemoBottomBar {...defaultProps} />);
    expect(screen.getByText('Dark')).toBeInTheDocument();
  });
});
