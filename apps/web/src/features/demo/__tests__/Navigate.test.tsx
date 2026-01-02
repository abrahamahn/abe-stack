// apps/web/src/features/demo/__tests__/Navigate.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Navigate } from '../Navigate';

// Mock the UIPage component
vi.mock('../UI', () => ({
  UIPage: (): React.ReactElement => <div data-testid="ui-page">UI Page Content</div>,
}));

// Mock history context
const mockGoBack = vi.fn();
vi.mock('../../../contexts/HistoryContext', () => ({
  useHistoryNav: (): {
    goBack: typeof mockGoBack;
    canGoBack: boolean;
    history: string[];
    index: number;
    canGoForward: boolean;
    goForward: ReturnType<typeof vi.fn>;
  } => ({
    goBack: mockGoBack,
    canGoBack: true,
    history: ['/'],
    index: 1,
    canGoForward: false,
    goForward: vi.fn(),
  }),
}));

describe('Navigate', () => {
  const renderNavigate = (initialPath = '/features/demo'): ReturnType<typeof render> => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Navigate />
      </MemoryRouter>,
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the Back button', () => {
      renderNavigate();

      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });

    it('should render the UI button', () => {
      renderNavigate();

      expect(screen.getByRole('button', { name: /^ui$/i })).toBeInTheDocument();
    });

    it('should render the UIPage component by default', () => {
      renderNavigate();

      expect(screen.getByTestId('ui-page')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should call goBack when Back button is clicked', () => {
      renderNavigate();

      const backButton = screen.getByRole('button', { name: /back/i });
      fireEvent.click(backButton);

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('should render UI view when UI button is clicked', () => {
      renderNavigate();

      const uiButton = screen.getByRole('button', { name: /^ui$/i });
      fireEvent.click(uiButton);

      expect(screen.getByTestId('ui-page')).toBeInTheDocument();
    });
  });

  describe('Button States', () => {
    it('should have Back button that can be disabled', () => {
      // Note: This test verifies the button exists and has the disabled prop mechanism
      // The actual disabled state depends on the mocked canGoBack value
      renderNavigate();

      const backButton = screen.getByRole('button', { name: /back/i });
      // When canGoBack is true (as in the mock), button should not be disabled
      expect(backButton).not.toBeDisabled();
    });
  });

  describe('Layout', () => {
    it('should have proper section structure for navigation buttons', () => {
      const { container } = renderNavigate();

      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
      expect(section).toHaveStyle({ display: 'flex' });
    });

    it('should have gap between buttons', () => {
      const { container } = renderNavigate();

      const section = container.querySelector('section');
      expect(section).toHaveStyle({ gap: '8px' });
    });
  });
});
