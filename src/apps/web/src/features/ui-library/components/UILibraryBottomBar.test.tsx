// src/apps/web/src/features/ui-library/components/UILibraryBottomBar.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Hoist mock fn references so they are available when vi.mock factories execute
const {
  mockButton,
  mockEnvironmentBadge,
  mockKbd,
  mockResizablePanel,
  mockText,
  mockVersionBadge,
} = vi.hoisted(() => ({
  mockButton: vi.fn(),
  mockEnvironmentBadge: vi.fn(),
  mockKbd: vi.fn(),
  mockResizablePanel: vi.fn(),
  mockText: vi.fn(),
  mockVersionBadge: vi.fn(),
}));

vi.mock('@abe-stack/ui', () => ({
  ['Button']: (props: { children?: ReactNode; onClick?: () => void }) => {
    mockButton(props);
    return <button onClick={props.onClick}>{props.children}</button>;
  },
  ['EnvironmentBadge']: (props: { environment: string }) => {
    mockEnvironmentBadge(props);
    return <div>{props.environment}</div>;
  },
  ['Kbd']: (props: { children?: ReactNode }) => {
    mockKbd(props);
    return <kbd>{props.children}</kbd>;
  },
  ['ResizablePanel']: (props: { children?: ReactNode }) => {
    mockResizablePanel(props);
    return <div>{props.children}</div>;
  },
  ['Text']: (props: { children?: ReactNode }) => {
    mockText(props);
    return <span>{props.children}</span>;
  },
  ['VersionBadge']: (props: { version: string }) => {
    mockVersionBadge(props);
    return <div>{props.version}</div>;
  },
}));

import { UILibraryBottomBar } from './UILibraryBottomBar';

import type { UILibraryBottomBarProps } from './UILibraryBottomBar';
import type { ReactNode } from 'react';

vi.mock('@config', () => ({
  clientConfig: {
    uiVersion: '1.0.0',
    isDev: true,
  },
}));

vi.mock('@ui-library/hooks', () => ({
  KEYBOARD_SHORTCUTS: [
    { key: 'K', description: 'Search' },
    { key: 'T', description: 'Theme' },
  ],
}));

describe('UILibraryBottomBar', () => {
  const defaultProps: UILibraryBottomBarProps = {
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
    render(<UILibraryBottomBar {...defaultProps} />);
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
    expect(screen.getByText('development')).toBeInTheDocument();
  });

  it('should render component count', () => {
    render(<UILibraryBottomBar {...defaultProps} />);
    expect(screen.getByText('42 components')).toBeInTheDocument();
  });

  it('should render keyboard shortcuts', () => {
    render(<UILibraryBottomBar {...defaultProps} />);
    expect(screen.getByText('K')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('should call cycleTheme when theme button clicked', () => {
    render(<UILibraryBottomBar {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    const lastButton = buttons[buttons.length - 1];
    if (lastButton != null) {
      fireEvent.click(lastButton);
    }
    expect(defaultProps.cycleTheme).toHaveBeenCalled();
  });

  it('should call cycleDensity when density button clicked', () => {
    render(<UILibraryBottomBar {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    if (buttons[0] != null) {
      fireEvent.click(buttons[0]);
    }
    expect(defaultProps.cycleDensity).toHaveBeenCalled();
  });

  it('should call cycleContrast when contrast button clicked', () => {
    render(<UILibraryBottomBar {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    if (buttons[1] != null) {
      fireEvent.click(buttons[1]);
    }
    expect(defaultProps.cycleContrast).toHaveBeenCalled();
  });

  it('should display theme label', () => {
    render(<UILibraryBottomBar {...defaultProps} />);
    expect(screen.getByText('Dark')).toBeInTheDocument();
  });
});
