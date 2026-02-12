// src/apps/web/src/features/ui-library/UILibraryPage.test.tsx
import { MemoryRouter } from '@abe-stack/ui';
import { AppLayoutContext } from '@app/layouts';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { createElement, useCallback, useMemo, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UILibraryPage } from './UILibraryPage';

import type { ComponentCategory, ComponentDemo } from '@ui-library/types';
import type { ReactElement, ReactNode } from 'react';

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
        render: () => createElement('button', null, 'Click me'),
      },
      {
        name: 'Secondary',
        description: 'Secondary button style',
        code: '<Button variant="secondary">Click</Button>',
        render: () => createElement('button', null, 'Click'),
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
        render: () => createElement('input'),
      },
    ],
  },
];

const mockCategories: ComponentCategory[] = ['elements', 'components', 'layouts'];

// Mock the catalog index used by UILibraryPage
vi.mock('@catalog/index', () => ({
  componentCatalog: {},
  getComponentsByCategory: (category: string): ComponentDemo[] =>
    mockComponents.filter((c) => c.category === category),
  getAllCategories: (): ComponentCategory[] => mockCategories,
  getTotalComponentCount: (): number => mockComponents.length,
}));

/**
 * Test wrapper that provides AppLayoutContext and renders sidebar content
 * alongside the page, simulating how AppLayout would display it.
 */
const TestLayoutWrapper = ({ children }: { children: ReactNode }): ReactElement => {
  const [sidebarContent, setSidebarContent] = useState<ReactNode | null>(null);

  const setRightSidebar = useCallback((content: ReactNode | null): void => {
    setSidebarContent(content);
  }, []);

  const contextValue = useMemo(() => ({ setRightSidebar }), [setRightSidebar]);

  return (
    <AppLayoutContext.Provider value={contextValue}>
      {children}
      <div data-testid="right-sidebar">{sidebarContent}</div>
    </AppLayoutContext.Provider>
  );
};

describe('UILibraryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPage = (): ReturnType<typeof render> => {
    return render(
      <MemoryRouter>
        <TestLayoutWrapper>
          <UILibraryPage />
        </TestLayoutWrapper>
      </MemoryRouter>,
    );
  };

  describe('Category Selection', () => {
    it('renders category buttons in the right sidebar', () => {
      renderPage();

      mockCategories.forEach((cat) => {
        expect(
          screen.getByRole('button', { name: cat.charAt(0).toUpperCase() + cat.slice(1) }),
        ).toBeInTheDocument();
      });
    });

    it('shows elements category as active by default', () => {
      renderPage();

      const elementsButton = screen.getByRole('button', { name: 'Elements' });
      expect(elementsButton).toBeInTheDocument();
      // Components from elements category should be visible in sidebar
      expect(screen.getByText('Button')).toBeInTheDocument();
    });

    it('loads components for the selected category', () => {
      renderPage();

      expect(screen.getByText('Button')).toBeInTheDocument();
      expect(screen.getByText('Input')).toBeInTheDocument();
    });

    it('shows component count for the active category', () => {
      renderPage();

      expect(screen.getByText(/2 component/)).toBeInTheDocument();
    });

    it('switches category when button is clicked', () => {
      renderPage();

      const componentsButton = screen.getByRole('button', { name: 'Components' });
      fireEvent.click(componentsButton);

      // Components category has no mock data, so the count shows 0
      expect(screen.getByText(/0 component/)).toBeInTheDocument();
    });

    it('clears selected component when switching categories', () => {
      renderPage();

      // Select a component
      act(() => {
        fireEvent.click(screen.getByText('Button'));
      });
      expect(screen.getByRole('heading', { name: 'Primary' })).toBeInTheDocument();

      // Switch category
      fireEvent.click(screen.getByRole('button', { name: 'Components' }));

      // Selection should be cleared
      expect(screen.queryByRole('heading', { name: 'Primary' })).not.toBeInTheDocument();
    });
  });

  describe('Component Selection', () => {
    it('shows placeholder text when no component is selected', () => {
      renderPage();

      expect(
        screen.getByText(/select a component from the left sidebar to view demos/i),
      ).toBeInTheDocument();
    });

    it('shows component details when selected', () => {
      renderPage();

      act(() => {
        fireEvent.click(screen.getByText('Button'));
      });

      const headings = screen.getAllByRole('heading');
      const buttonHeading = headings.find((h) => h.textContent === 'Button');
      expect(buttonHeading).toBeInTheDocument();
      const descriptions = screen.getAllByText('A clickable button component');
      expect(descriptions.length).toBeGreaterThan(0);
    });

    it('displays variant count for each component in the list', () => {
      renderPage();

      expect(screen.getByText('2 variants')).toBeInTheDocument();
      expect(screen.getAllByText('1 variant')).toHaveLength(1);
    });

    it('renders variants when a component is selected', () => {
      renderPage();

      act(() => {
        fireEvent.click(screen.getByText('Button'));
      });

      expect(screen.getByRole('heading', { name: 'Primary' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Secondary' })).toBeInTheDocument();
      expect(screen.getByText('Primary button style')).toBeInTheDocument();
    });

    it('renders the variant component', () => {
      renderPage();

      act(() => {
        fireEvent.click(screen.getByText('Button'));
      });

      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('shows code in details element', () => {
      renderPage();

      act(() => {
        fireEvent.click(screen.getByText('Button'));
      });

      const details = screen.getAllByText('View Code');
      expect(details.length).toBeGreaterThan(0);

      const codeElement = screen.getByText('<Button variant="primary">Click me</Button>');
      expect(codeElement).toBeInTheDocument();
    });
  });

  describe('Copy to Clipboard', () => {
    it('copies code to clipboard when copy button is clicked', () => {
      renderPage();

      act(() => {
        fireEvent.click(screen.getByText('Button'));
      });

      const copyButtons = screen.getAllByTitle(/copy code/i);
      const firstButton = copyButtons[0];
      if (firstButton != null) {
        act(() => {
          fireEvent.click(firstButton);
        });
      }

      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        '<Button variant="primary">Click me</Button>',
      );
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('deselects component with Escape key', () => {
      renderPage();

      // Select a component first
      fireEvent.click(screen.getByText('Button'));
      expect(screen.getByRole('heading', { name: 'Primary' })).toBeInTheDocument();

      // Press Escape to deselect
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('heading', { name: 'Primary' })).not.toBeInTheDocument();
    });

    it('does not deselect when Escape is pressed in an input', () => {
      renderPage();

      // Select a component
      act(() => {
        fireEvent.click(screen.getByText('Button'));
      });

      // Create and focus an input, then press Escape
      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();
      fireEvent.keyDown(input, { key: 'Escape' });

      // Component should still be selected
      expect(screen.getByRole('heading', { name: 'Primary' })).toBeInTheDocument();
      document.body.removeChild(input);
    });
  });
});
