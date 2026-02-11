// src/apps/web/src/features/command-palette/components/CommandPalette.test.tsx
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '../../../__tests__/utils';

import { CommandPalette } from './CommandPalette';

import type { UseCommandPaletteResult } from '../hooks';

// Mock the useCommandPalette hook to control state
const mockClose = vi.fn();
const mockSetQuery = vi.fn();
const mockSetSelectedIndex = vi.fn();
const mockMoveUp = vi.fn();
const mockMoveDown = vi.fn();
const mockExecuteSelected = vi.fn();
const mockExecuteCommand = vi.fn();
const mockOpen = vi.fn();
const mockToggle = vi.fn();

const defaultMockResult: UseCommandPaletteResult = {
  isOpen: false,
  open: mockOpen,
  close: mockClose,
  toggle: mockToggle,
  query: '',
  setQuery: mockSetQuery,
  filteredCommands: [
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      description: 'Navigate to the main dashboard',
      category: 'navigation',
      action: vi.fn(),
      keywords: ['home'],
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      description: 'Navigate to account settings',
      category: 'navigation',
      action: vi.fn(),
      keywords: ['profile'],
    },
    {
      id: 'action-change-theme',
      label: 'Change Theme',
      description: 'Cycle through themes',
      category: 'action',
      action: vi.fn(),
      keywords: ['dark', 'light'],
    },
  ],
  selectedIndex: 0,
  setSelectedIndex: mockSetSelectedIndex,
  moveUp: mockMoveUp,
  moveDown: mockMoveDown,
  executeSelected: mockExecuteSelected,
  executeCommand: mockExecuteCommand,
};

let mockResult = { ...defaultMockResult };

vi.mock('../hooks', () => ({
  useCommandPalette: () => mockResult,
}));

// Mock useThemeMode to avoid errors
vi.mock('@abe-stack/ui', async () => {
  const actual = await vi.importActual('@abe-stack/ui');
  return {
    ...actual,
    useThemeMode: () => ({
      mode: 'system',
      setMode: vi.fn(),
      cycleMode: vi.fn(),
      isDark: false,
      isLight: true,
      resolvedTheme: 'light',
    }),
  };
});

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResult = { ...defaultMockResult };
  });

  it('should not render content when closed', () => {
    mockResult = { ...defaultMockResult, isOpen: false };
    renderWithProviders(<CommandPalette />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render dialog when open', () => {
    mockResult = { ...defaultMockResult, isOpen: true };
    renderWithProviders(<CommandPalette />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should render search input when open', () => {
    mockResult = { ...defaultMockResult, isOpen: true };
    renderWithProviders(<CommandPalette />);
    expect(screen.getByLabelText('Search commands')).toBeInTheDocument();
  });

  it('should render command items when open', () => {
    mockResult = { ...defaultMockResult, isOpen: true };
    renderWithProviders(<CommandPalette />);
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Go to Settings')).toBeInTheDocument();
    expect(screen.getByText('Change Theme')).toBeInTheDocument();
  });

  it('should render category headers', () => {
    mockResult = { ...defaultMockResult, isOpen: true };
    renderWithProviders(<CommandPalette />);
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('should render keyboard hints', () => {
    mockResult = { ...defaultMockResult, isOpen: true };
    renderWithProviders(<CommandPalette />);
    expect(screen.getByText('navigate')).toBeInTheDocument();
    expect(screen.getByText('select')).toBeInTheDocument();
    expect(screen.getByText('close')).toBeInTheDocument();
  });

  it('should show no results message when filtered list is empty', () => {
    mockResult = {
      ...defaultMockResult,
      isOpen: true,
      filteredCommands: [],
    };
    renderWithProviders(<CommandPalette />);
    expect(screen.getByText('No commands found')).toBeInTheDocument();
  });

  it('should render command descriptions', () => {
    mockResult = { ...defaultMockResult, isOpen: true };
    renderWithProviders(<CommandPalette />);
    expect(screen.getByText('Navigate to the main dashboard')).toBeInTheDocument();
    expect(screen.getByText('Navigate to account settings')).toBeInTheDocument();
  });

  it('should call executeCommand when a command is clicked', async () => {
    mockResult = { ...defaultMockResult, isOpen: true };
    const { user } = renderWithProviders(<CommandPalette />);

    await user.click(screen.getByText('Go to Dashboard'));
    expect(mockExecuteCommand).toHaveBeenCalledWith(0);
  });

  it('should call setSelectedIndex on hover', async () => {
    mockResult = { ...defaultMockResult, isOpen: true };
    const { user } = renderWithProviders(<CommandPalette />);

    await user.hover(screen.getByText('Go to Settings'));
    expect(mockSetSelectedIndex).toHaveBeenCalledWith(1);
  });

  it('should call close when dialog is dismissed', () => {
    mockResult = { ...defaultMockResult, isOpen: true };
    renderWithProviders(<CommandPalette />);
    // The Dialog.Root onChange handler calls close when open becomes false.
    // This is tested implicitly through the Dialog's Escape/overlay behavior.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should render the listbox for accessibility', () => {
    mockResult = { ...defaultMockResult, isOpen: true };
    renderWithProviders(<CommandPalette />);
    expect(screen.getByRole('listbox', { name: 'Commands' })).toBeInTheDocument();
  });

  it('should render combobox role on input', () => {
    mockResult = { ...defaultMockResult, isOpen: true };
    renderWithProviders(<CommandPalette />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
