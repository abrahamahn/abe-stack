// main/client/react/src/hooks/useHistoryNav.test.tsx
import { MemoryRouter, useLocation } from '@router';
import { render, screen, act } from '@testing-library/react';
import react from 'react';
import { describe, expect, it } from 'vitest';

import { HistoryProvider, useHistoryNav } from './useHistoryNav';

// Helper component to display history state
const HistoryDisplay = (): React.ReactElement => {
  const { history, index, canGoBack, canGoForward } = useHistoryNav();
  return (
    <div>
      <span data-testid="history-length">{history.length}</span>
      <span data-testid="history-index">{index}</span>
      <span data-testid="can-go-back">{canGoBack.toString()}</span>
      <span data-testid="can-go-forward">{canGoForward.toString()}</span>
    </div>
  );
};

// Helper component that shows current location
const LocationDisplay = (): React.ReactElement => {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
};

describe('useHistoryNav', () => {
  describe('HistoryProvider', () => {
    it('should render children', () => {
      render(
        <MemoryRouter>
          <HistoryProvider>
            <div>Child Content</div>
          </HistoryProvider>
        </MemoryRouter>,
      );

      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('should track initial location', () => {
      render(
        <MemoryRouter initialEntries={['/test']}>
          <HistoryProvider>
            <HistoryDisplay />
            <LocationDisplay />
          </HistoryProvider>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('history-length').textContent).toBe('1');
      expect(screen.getByTestId('location').textContent).toBe('/test');
    });
  });

  describe('useHistoryNav hook', () => {
    it('should throw error when used outside HistoryProvider', () => {
      const TestComponent = (): React.ReactElement => {
        useHistoryNav();
        return <div />;
      };

      expect(() => {
        render(
          <MemoryRouter>
            <TestComponent />
          </MemoryRouter>,
        );
      }).toThrow('useHistoryNav must be used within HistoryProvider');
    });

    it('should start with canGoBack as false', () => {
      render(
        <MemoryRouter>
          <HistoryProvider>
            <HistoryDisplay />
          </HistoryProvider>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('can-go-back').textContent).toBe('false');
    });

    it('should start with canGoForward as false', () => {
      render(
        <MemoryRouter>
          <HistoryProvider>
            <HistoryDisplay />
          </HistoryProvider>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('can-go-forward').textContent).toBe('false');
    });
  });

  describe('navigation', () => {
    it('should provide goBack and goForward functions', () => {
      const TestComponent = (): React.ReactElement => {
        const { goBack, goForward } = useHistoryNav();
        return (
          <div>
            {react.createElement('button', { onClick: goBack }, 'Back')}
            {react.createElement('button', { onClick: goForward }, 'Forward')}
          </div>
        );
      };

      render(
        <MemoryRouter>
          <HistoryProvider>
            <TestComponent />
          </HistoryProvider>
        </MemoryRouter>,
      );

      expect(screen.getByText('Back')).toBeInTheDocument();
      expect(screen.getByText('Forward')).toBeInTheDocument();
    });

    it('should not crash when goBack is called with no history', () => {
      const TestComponent = (): React.ReactElement => {
        const { goBack } = useHistoryNav();
        return react.createElement('button', { onClick: goBack }, 'Back');
      };

      render(
        <MemoryRouter>
          <HistoryProvider>
            <TestComponent />
          </HistoryProvider>
        </MemoryRouter>,
      );

      expect(() => {
        act(() => {
          screen.getByText('Back').click();
        });
      }).not.toThrow();
    });

    it('should not crash when goForward is called with no forward history', () => {
      const TestComponent = (): React.ReactElement => {
        const { goForward } = useHistoryNav();
        return react.createElement('button', { onClick: goForward }, 'Forward');
      };

      render(
        <MemoryRouter>
          <HistoryProvider>
            <TestComponent />
          </HistoryProvider>
        </MemoryRouter>,
      );

      expect(() => {
        act(() => {
          screen.getByText('Forward').click();
        });
      }).not.toThrow();
    });
  });

  describe('history index tracking', () => {
    it('should start with index 0 after initial location', () => {
      render(
        <MemoryRouter initialEntries={['/home']}>
          <HistoryProvider>
            <HistoryDisplay />
          </HistoryProvider>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('history-index').textContent).toBe('0');
    });

    it('should correctly report history entries', () => {
      render(
        <MemoryRouter initialEntries={['/page1']}>
          <HistoryProvider>
            <HistoryDisplay />
            <LocationDisplay />
          </HistoryProvider>
        </MemoryRouter>,
      );

      expect(screen.getByTestId('history-length').textContent).toBe('1');
      expect(screen.getByTestId('location').textContent).toBe('/page1');
    });
  });
});
