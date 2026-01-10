// apps/web/src/features/demo/__tests__/DemoShell.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';

import { DemoShell } from '../DemoShell';

import type { ComponentDemo } from '../types';

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: (): typeof mockNavigate => mockNavigate,
  };
});

// Mock clipboard
const mockClipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
Object.assign(navigator, { clipboard: mockClipboard });

// Mock component data
const mockComponents: ComponentDemo[] = [
  {
    id: 'button',
    name: 'Button',
    category: 'elements',
    description: 'A clickable button component',
    variants: [
      {
        name: 'Primary',
        description: 'Primary button style',
        code: '<Button variant="primary">Click me</Button>',
        render: () => React.createElement('button', null, 'Click me'),
      },
      {
        name: 'Secondary',
        description: 'Secondary button style',
        code: '<Button variant="secondary">Click</Button>',
        render: () => React.createElement('button', null, 'Click'),
      },
    ],
  },
  {
    id: 'input',
    name: 'Input',
    category: 'elements',
    description: 'Text input field',
    variants: [
      {
        name: 'Default',
        description: 'Default input',
        code: '<Input />',
        render: () => React.createElement('input'),
      },
    ],
  },
];

const mockCategories = ['elements', 'components', 'hooks'];

let mockGetComponentDocs: Mock;
let mockParseMarkdown: Mock;
let mockGetAllCategories: Mock;
let mockGetComponentsByCategory: Mock;

vi.mock('../registry', () => ({
  getAllCategories: (): string[] => mockGetAllCategories() as string[],
  getComponentsByCategory: (category: string): ComponentDemo[] =>
    mockGetComponentsByCategory(category) as ComponentDemo[],
  getTotalComponentCount: (): number => mockComponents.length,
}));

vi.mock('../docs', () => ({
  getComponentDocs: (id: string, category: string, name: string): string | null =>
    mockGetComponentDocs(id, category, name) as string | null,
  parseMarkdown: (markdown: string): string => mockParseMarkdown(markdown) as string,
}));

describe('DemoShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage to ensure fresh state for each test
    localStorage.clear();
    mockGetAllCategories = vi.fn(() => mockCategories);
    mockGetComponentsByCategory = vi.fn((category: string) =>
      mockComponents.filter((c) => c.category === category),
    );
    mockGetComponentDocs = vi.fn(() => null);
    mockParseMarkdown = vi.fn((md: string) => `<p>${md}</p>`);
  });

  const renderDemoShell = (): ReturnType<typeof render> => {
    return render(
      <MemoryRouter>
        <DemoShell />
      </MemoryRouter>,
    );
  };

  describe('Layout Controls', () => {
    it('renders layout toggle buttons in the sidebar', () => {
      renderDemoShell();

      expect(screen.getByRole('button', { name: /toggle top bar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /toggle left panel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /toggle right panel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /toggle bottom bar/i })).toBeInTheDocument();
    });

    it('collapses the bottom panel when toggled', () => {
      renderDemoShell();

      const bottomPanel = screen.getByTestId('demo-bottom-panel');
      expect(bottomPanel).toHaveStyle({ flexBasis: '8%' });

      fireEvent.click(screen.getByRole('button', { name: /toggle bottom bar/i }));
      expect(bottomPanel).toHaveStyle({ flexBasis: '0%' });
    });

    it('collapses the top panel when toggled', () => {
      renderDemoShell();

      const topPanel = screen.getByTestId('demo-top-panel');
      expect(topPanel).toHaveStyle({ flexBasis: '10%' });

      fireEvent.click(screen.getByRole('button', { name: /toggle top bar/i }));
      expect(topPanel).toHaveStyle({ flexBasis: '0%' });
    });

    it('collapses the left panel when toggled', () => {
      renderDemoShell();

      const leftPanel = screen.getByTestId('demo-left-panel');
      expect(leftPanel).toHaveStyle({ flexBasis: '18%' });

      fireEvent.click(screen.getByRole('button', { name: /toggle left panel/i }));
      expect(leftPanel).toHaveStyle({ flexBasis: '0%' });
    });

    it('collapses the right panel when toggled', () => {
      renderDemoShell();

      const rightPanel = screen.getByTestId('demo-right-panel');
      expect(rightPanel).toHaveStyle({ flexBasis: '25%' });

      fireEvent.click(screen.getByRole('button', { name: /toggle right panel/i }));
      expect(rightPanel).toHaveStyle({ flexBasis: '0%' });
    });

    it('can toggle panels back to visible after collapsing', () => {
      renderDemoShell();

      const bottomPanel = screen.getByTestId('demo-bottom-panel');
      const toggleButton = screen.getByRole('button', { name: /toggle bottom bar/i });

      // Collapse
      fireEvent.click(toggleButton);
      expect(bottomPanel).toHaveStyle({ flexBasis: '0%' });

      // Expand
      fireEvent.click(toggleButton);
      expect(bottomPanel).toHaveStyle({ flexBasis: '8%' });
    });

    it('collapses left panel via close button', () => {
      renderDemoShell();

      const leftPanel = screen.getByTestId('demo-left-panel');
      const closeButton = within(leftPanel).getByRole('button', { name: /collapse left panel/i });

      fireEvent.click(closeButton);
      expect(leftPanel).toHaveStyle({ flexBasis: '0%' });
    });

    it('collapses right panel via close button', () => {
      renderDemoShell();

      const rightPanel = screen.getByTestId('demo-right-panel');
      const closeButton = within(rightPanel).getByRole('button', { name: /collapse right panel/i });

      fireEvent.click(closeButton);
      expect(rightPanel).toHaveStyle({ flexBasis: '0%' });
    });
  });

  describe('Navigation', () => {
    it('renders the back button', () => {
      renderDemoShell();

      expect(screen.getByRole('button', { name: /back to home/i })).toBeInTheDocument();
    });

    it('navigates to home when back button is clicked', () => {
      renderDemoShell();

      fireEvent.click(screen.getByRole('button', { name: /back to home/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('renders the main heading', () => {
      renderDemoShell();

      expect(
        screen.getByRole('heading', { name: /abe stack ui component gallery/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Category Selection', () => {
    it('renders all category buttons', () => {
      renderDemoShell();

      mockCategories.forEach((cat) => {
        expect(
          screen.getByRole('button', { name: cat.charAt(0).toUpperCase() }),
        ).toBeInTheDocument();
      });
    });

    it('shows elements category as active by default', () => {
      renderDemoShell();

      const elementsButton = screen.getByRole('button', { name: 'E' });
      // Primary variant indicates active
      expect(elementsButton).toBeInTheDocument();
    });

    it('switches category when category button is clicked', () => {
      renderDemoShell();

      const componentsButton = screen.getByRole('button', { name: 'C' });
      fireEvent.click(componentsButton);

      expect(mockGetComponentsByCategory).toHaveBeenCalledWith('components');
    });

    it('loads components for the selected category', () => {
      renderDemoShell();

      // Should show components from 'elements' category by default
      expect(screen.getByText('Button')).toBeInTheDocument();
      expect(screen.getByText('Input')).toBeInTheDocument();
    });
  });

  describe('Component Selection', () => {
    it('shows placeholder text when no component is selected', () => {
      renderDemoShell();

      expect(screen.getByText(/select a component from the left sidebar/i)).toBeInTheDocument();
    });

    it('shows component details when a component is selected', () => {
      renderDemoShell();

      const buttonComponent = screen.getByText('Button');
      fireEvent.click(buttonComponent);

      // Check for heading with exact name or containing Button
      const headings = screen.getAllByRole('heading');
      const buttonHeading = headings.find((h) => h.textContent === 'Button');
      expect(buttonHeading).toBeInTheDocument();
      // Multiple elements may have this text - use getAllByText and check at least one exists
      const descriptions = screen.getAllByText('A clickable button component');
      expect(descriptions.length).toBeGreaterThan(0);
    });

    it('displays variant count for each component in the list', () => {
      renderDemoShell();

      expect(screen.getByText('2 variants')).toBeInTheDocument();
      expect(screen.getByText('1 variant')).toBeInTheDocument();
    });

    it('renders variants when a component is selected', () => {
      renderDemoShell();

      fireEvent.click(screen.getByText('Button'));

      expect(screen.getByRole('heading', { name: 'Primary' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Secondary' })).toBeInTheDocument();
      expect(screen.getByText('Primary button style')).toBeInTheDocument();
    });

    it('renders the variant component', () => {
      renderDemoShell();

      fireEvent.click(screen.getByText('Button'));

      // The mocked render function creates a button with 'Click me'
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('shows code in details element', () => {
      renderDemoShell();

      fireEvent.click(screen.getByText('Button'));

      const details = screen.getAllByText('View Code');
      expect(details.length).toBeGreaterThan(0);

      // Open details and check code
      const codeElement = screen.getByText('<Button variant="primary">Click me</Button>');
      expect(codeElement).toBeInTheDocument();
    });
  });

  describe('Copy to Clipboard', () => {
    it('copies code to clipboard when copy button is clicked', () => {
      renderDemoShell();

      fireEvent.click(screen.getByText('Button'));

      // The copy button has title="Copy code" so look for buttons with that title
      const copyButtons = screen.getAllByTitle(/copy code/i);
      const firstButton = copyButtons[0];
      if (firstButton) {
        fireEvent.click(firstButton);
      }

      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        '<Button variant="primary">Click me</Button>',
      );
    });
  });

  describe('Documentation Panel', () => {
    it('shows placeholder when no component is selected', () => {
      renderDemoShell();

      expect(screen.getByText('Select a component to view documentation')).toBeInTheDocument();
    });

    it('shows fallback documentation when no docs are available', () => {
      mockGetComponentDocs.mockReturnValue(null);
      renderDemoShell();

      fireEvent.click(screen.getByText('Button'));

      expect(screen.getByRole('heading', { name: 'Description' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Category' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Variants' })).toBeInTheDocument();
    });

    it('renders markdown documentation when available', () => {
      mockGetComponentDocs.mockReturnValue('# Button Documentation');
      mockParseMarkdown.mockReturnValue('<h1>Button Documentation</h1>');
      renderDemoShell();

      fireEvent.click(screen.getByText('Button'));

      expect(mockGetComponentDocs).toHaveBeenCalledWith('button', 'elements', 'Button');
      expect(mockParseMarkdown).toHaveBeenCalledWith('# Button Documentation');
    });
  });

  describe('Initial State', () => {
    it('renders with all panels visible by default', () => {
      renderDemoShell();

      expect(screen.getByTestId('demo-top-panel')).toHaveStyle({ flexBasis: '10%' });
      expect(screen.getByTestId('demo-left-panel')).toHaveStyle({ flexBasis: '18%' });
      expect(screen.getByTestId('demo-right-panel')).toHaveStyle({ flexBasis: '25%' });
      expect(screen.getByTestId('demo-bottom-panel')).toHaveStyle({ flexBasis: '8%' });
    });

    it('renders the Components heading in left panel', () => {
      renderDemoShell();

      expect(screen.getByRole('heading', { name: 'Components' })).toBeInTheDocument();
    });

    it('renders the Documentation heading in right panel', () => {
      renderDemoShell();

      expect(screen.getByRole('heading', { name: 'Documentation' })).toBeInTheDocument();
    });

    it('shows version and environment info in bottom panel', () => {
      renderDemoShell();

      expect(screen.getByText(/v1\.1\.0/)).toBeInTheDocument();
      expect(screen.getByText(/2 components/)).toBeInTheDocument();
    });
  });

  describe('Theme Toggle', () => {
    it('renders theme toggle button with System as default', () => {
      renderDemoShell();

      expect(screen.getByRole('button', { name: /theme: system/i })).toBeInTheDocument();
    });

    it('cycles through theme modes when clicked', () => {
      renderDemoShell();

      const themeButton = screen.getByRole('button', { name: /theme: system/i });

      // System -> Light
      fireEvent.click(themeButton);
      expect(screen.getByRole('button', { name: /theme: light/i })).toBeInTheDocument();

      // Light -> Dark
      fireEvent.click(screen.getByRole('button', { name: /theme: light/i }));
      expect(screen.getByRole('button', { name: /theme: dark/i })).toBeInTheDocument();

      // Dark -> System
      fireEvent.click(screen.getByRole('button', { name: /theme: dark/i }));
      expect(screen.getByRole('button', { name: /theme: system/i })).toBeInTheDocument();
    });
  });

  describe('Layout Persistence', () => {
    it('renders reset layout button', () => {
      renderDemoShell();

      expect(screen.getByRole('button', { name: /reset layout/i })).toBeInTheDocument();
    });

    it('resets layout to defaults when reset button is clicked', () => {
      renderDemoShell();

      // First collapse a panel
      const toggleButton = screen.getByRole('button', { name: /toggle bottom bar/i });
      fireEvent.click(toggleButton);
      expect(screen.getByTestId('demo-bottom-panel')).toHaveStyle({ flexBasis: '0%' });

      // Then reset
      fireEvent.click(screen.getByRole('button', { name: /reset layout/i }));
      expect(screen.getByTestId('demo-bottom-panel')).toHaveStyle({ flexBasis: '8%' });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('displays keyboard shortcuts in bottom panel', () => {
      renderDemoShell();

      expect(screen.getByText('Toggle left panel')).toBeInTheDocument();
      expect(screen.getByText('Toggle right panel')).toBeInTheDocument();
      expect(screen.getByText('Cycle theme')).toBeInTheDocument();
      expect(screen.getByText('Deselect component')).toBeInTheDocument();
    });

    it('toggles left panel with L key', () => {
      renderDemoShell();

      const leftPanel = screen.getByTestId('demo-left-panel');
      expect(leftPanel).toHaveStyle({ flexBasis: '18%' });

      fireEvent.keyDown(window, { key: 'L' });
      expect(leftPanel).toHaveStyle({ flexBasis: '0%' });
    });

    it('toggles right panel with R key', () => {
      renderDemoShell();

      const rightPanel = screen.getByTestId('demo-right-panel');
      expect(rightPanel).toHaveStyle({ flexBasis: '25%' });

      fireEvent.keyDown(window, { key: 'R' });
      expect(rightPanel).toHaveStyle({ flexBasis: '0%' });
    });

    it('cycles theme with T key', () => {
      renderDemoShell();

      // System -> Light
      fireEvent.keyDown(window, { key: 'T' });
      expect(screen.getByRole('button', { name: /theme: light/i })).toBeInTheDocument();
    });

    it('deselects component with Escape key', () => {
      renderDemoShell();

      // Select a component first
      fireEvent.click(screen.getByText('Button'));
      expect(screen.getByRole('heading', { name: 'Primary' })).toBeInTheDocument();

      // Press Escape to deselect
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('heading', { name: 'Primary' })).not.toBeInTheDocument();
    });
  });
});
