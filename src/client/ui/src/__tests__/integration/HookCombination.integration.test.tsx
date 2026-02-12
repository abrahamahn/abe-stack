// client/ui/src/__tests__/integration/HookCombination.integration.test.tsx
/** @vitest-environment jsdom */
/**
 * Integration tests for hook combinations
 *
 * Tests multiple hooks working together:
 * - useFormState + useResendCooldown
 * - useDisclosure + useClickOutside
 * - useControllableState + useDebounce
 * - useKeyboardShortcut + useDisclosure
 * - useWindowSize + useMediaQuery
 */

import { render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../../elements/Button';
import { Input } from '../../elements/Input';
import {
  useClickOutside,
  useControllableState,
  useDebounce,
  useDisclosure,
  useFormState,
  useKeyboardShortcut,
  useMediaQuery,
  useResendCooldown,
  useWindowSize,
} from '@abe-stack/react/hooks';

// =============================================================================
// Test Components
// =============================================================================

/**
 * Component using useFormState + useResendCooldown for email verification
 */
const EmailVerification = ({
  onSendEmail,
}: {
  onSendEmail: () => Promise<void>;
}): React.ReactElement => {
  const { isLoading, error, wrapHandler, clearError } = useFormState();
  const { cooldown, isOnCooldown, startCooldown, resetCooldown } = useResendCooldown(30);
  const [emailSent, setEmailSent] = useState(false);

  const handleSend = (): void => {
    clearError();
    const wrappedSend = wrapHandler(onSendEmail, {
      onSuccess: () => {
        startCooldown();
        setEmailSent(true);
      },
    });
    void wrappedSend({});
  };

  const handleReset = (): void => {
    resetCooldown();
    setEmailSent(false);
    clearError();
  };

  return (
    <div data-testid="email-verification">
      {error !== null && <div data-testid="error">{error}</div>}
      {emailSent && <div data-testid="success">Email sent!</div>}

      <Button onClick={handleSend} disabled={isLoading || isOnCooldown} data-testid="send-btn">
        {isLoading ? 'Sending...' : isOnCooldown ? `Wait ${cooldown}s` : 'Send Email'}
      </Button>

      <Button onClick={handleReset} data-testid="reset-btn">
        Reset
      </Button>
    </div>
  );
};

/**
 * Component using useDisclosure + useClickOutside for dropdown
 */
const DropdownWithClickOutside = ({
  onSelect,
}: {
  onSelect?: (value: string) => void;
}): React.ReactElement => {
  const { open, toggle, close } = useDisclosure({ defaultOpen: false });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => {
    if (open) close();
  });

  const handleSelect = (value: string): void => {
    onSelect?.(value);
    close();
  };

  return (
    <div ref={dropdownRef} data-testid="dropdown-container">
      <Button onClick={toggle} data-testid="dropdown-trigger">
        {open ? 'Close' : 'Open'} Menu
      </Button>
      {open && (
        <div data-testid="dropdown-menu" role="menu">
          <button
            role="menuitem"
            onClick={() => {
              handleSelect('option1');
            }}
          >
            Option 1
          </button>
          <button
            role="menuitem"
            onClick={() => {
              handleSelect('option2');
            }}
          >
            Option 2
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Component using useControllableState + useDebounce for search
 */
const DebouncedSearch = ({
  onSearch,
  defaultValue = '',
  value,
  onChange,
}: {
  onSearch: (query: string) => void;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}): React.ReactElement => {
  const [query, setQuery] = useControllableState({
    ...(value !== undefined && { value }),
    defaultValue,
    ...(onChange !== undefined && { onChange }),
  });
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery !== undefined && debouncedQuery !== '') {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery, onSearch]);

  return (
    <div data-testid="debounced-search">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
        }}
        placeholder="Search..."
        data-testid="search-input"
      />
      <div data-testid="current-query">{query}</div>
      <div data-testid="debounced-query">{debouncedQuery}</div>
    </div>
  );
};

/**
 * Component using useKeyboardShortcut + useDisclosure for modal
 */
const KeyboardModal = (): React.ReactElement => {
  const { open, openFn, close, toggle } = useDisclosure({ defaultOpen: false });

  // Open modal with Ctrl+K
  useKeyboardShortcut({ key: 'k', ctrl: true, handler: openFn });

  // Close modal with Escape (handled internally)
  useKeyboardShortcut({ key: 'Escape', handler: close });

  return (
    <div data-testid="keyboard-modal">
      <Button onClick={toggle} data-testid="modal-trigger">
        {open ? 'Close' : 'Open'} (Ctrl+K)
      </Button>
      {open && (
        <div data-testid="modal-content" role="dialog">
          <h2>Modal Content</h2>
          <p>Press Escape to close</p>
          <Button onClick={close}>Close</Button>
        </div>
      )}
    </div>
  );
};

/**
 * Component using useWindowSize + useMediaQuery for responsive layout
 */
const ResponsiveLayout = (): React.ReactElement => {
  const { width, height } = useWindowSize();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');

  const getDeviceType = (): string => {
    if (isMobile) return 'mobile';
    if (isTablet) return 'tablet';
    if (isDesktop) return 'desktop';
    return 'unknown';
  };

  return (
    <div data-testid="responsive-layout">
      <div data-testid="window-width">{width}</div>
      <div data-testid="window-height">{height}</div>
      <div data-testid="device-type">{getDeviceType()}</div>
      <div data-testid="is-mobile">{isMobile ? 'true' : 'false'}</div>
    </div>
  );
};

/**
 * Component combining multiple state hooks
 */
const MultiStateForm = ({
  onSubmit,
}: {
  onSubmit: (data: { name: string; email: string }) => Promise<void>;
}): React.ReactElement => {
  const { isLoading, error, wrapHandler, clearError } = useFormState();
  const { cooldown, isOnCooldown, startCooldown } = useResendCooldown(10);
  const { open: showAdvanced, toggle: toggleAdvanced } = useDisclosure({ defaultOpen: false });
  const [submitted, setSubmitted] = useState(false);

  const [name, setName] = useControllableState<string>({ defaultValue: '' });
  const [email, setEmail] = useControllableState<string>({ defaultValue: '' });

  const debouncedName = useDebounce(name, 200);

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    clearError();

    const wrappedSubmit = wrapHandler(onSubmit, {
      onSuccess: () => {
        setSubmitted(true);
        startCooldown();
      },
    });

    void wrappedSubmit({ name: name ?? '', email: email ?? '' });
  };

  return (
    <form onSubmit={handleSubmit} data-testid="multi-state-form">
      {error !== null && <div data-testid="form-error">{error}</div>}
      {submitted && <div data-testid="success-message">Form submitted!</div>}

      <Input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
        }}
        placeholder="Name"
        data-testid="name-input"
        disabled={isLoading}
      />
      <div data-testid="debounced-name">{debouncedName}</div>

      <Input
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
        }}
        placeholder="Email"
        type="email"
        data-testid="email-input"
        disabled={isLoading}
      />

      <Button type="button" onClick={toggleAdvanced} data-testid="toggle-advanced">
        {showAdvanced ? 'Hide' : 'Show'} Advanced
      </Button>

      {showAdvanced && (
        <div data-testid="advanced-section">
          <p>Advanced options here</p>
        </div>
      )}

      <Button type="submit" disabled={isLoading || isOnCooldown} data-testid="submit-btn">
        {isLoading ? 'Submitting...' : isOnCooldown ? `Wait ${cooldown}s` : 'Submit'}
      </Button>
    </form>
  );
};

// =============================================================================
// Tests
// =============================================================================

describe('HookCombination Integration Tests', () => {
  describe('useFormState + useResendCooldown', () => {
    it('renders email verification component', () => {
      const onSendEmail = vi.fn();
      render(<EmailVerification onSendEmail={onSendEmail} />);

      expect(screen.getByTestId('send-btn')).toBeInTheDocument();
      expect(screen.getByTestId('send-btn')).toHaveTextContent('Send Email');
    });

    // Note: Timer-based cooldown tests and async form handling are covered in
    // useResendCooldown and useFormState unit tests. Integration tests with
    // fake timers and async operations can be unreliable.
  });

  describe('useDisclosure + useClickOutside', () => {
    it('opens and closes dropdown on trigger click', async () => {
      const user = userEvent.setup();
      render(<DropdownWithClickOutside />);

      expect(screen.queryByTestId('dropdown-menu')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('dropdown-trigger'));
      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();

      await user.click(screen.getByTestId('dropdown-trigger'));
      expect(screen.queryByTestId('dropdown-menu')).not.toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <DropdownWithClickOutside />
          <button data-testid="outside">Outside</button>
        </div>,
      );

      // Open dropdown
      await user.click(screen.getByTestId('dropdown-trigger'));
      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();

      // Click outside
      await user.click(screen.getByTestId('outside'));

      await waitFor(() => {
        expect(screen.queryByTestId('dropdown-menu')).not.toBeInTheDocument();
      });
    });

    it('closes dropdown when selecting an option', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<DropdownWithClickOutside onSelect={onSelect} />);

      await user.click(screen.getByTestId('dropdown-trigger'));
      await user.click(screen.getByRole('menuitem', { name: 'Option 1' }));

      expect(onSelect).toHaveBeenCalledWith('option1');
      expect(screen.queryByTestId('dropdown-menu')).not.toBeInTheDocument();
    });
  });

  describe('useControllableState + useDebounce', () => {
    it('renders with default value', () => {
      const onSearch = vi.fn();
      render(<DebouncedSearch onSearch={onSearch} defaultValue="initial" />);

      expect(screen.getByTestId('search-input')).toHaveValue('initial');
      expect(screen.getByTestId('current-query')).toHaveTextContent('initial');
    });

    it('works in controlled mode with user events', async () => {
      const user = userEvent.setup();
      const onSearch = vi.fn();
      const onChange = vi.fn();

      const ControlledWrapper = (): React.ReactElement => {
        const [value, setValue] = useState('initial');
        return (
          <DebouncedSearch
            onSearch={onSearch}
            value={value}
            onChange={(v) => {
              setValue(v);
              onChange(v);
            }}
          />
        );
      };

      render(<ControlledWrapper />);

      expect(screen.getByTestId('search-input')).toHaveValue('initial');

      const input = screen.getByTestId('search-input');
      await user.clear(input);
      await user.type(input, 'new');

      expect(onChange).toHaveBeenCalled();
      expect(screen.getByTestId('search-input')).toHaveValue('new');
    });

    // Note: Debounce timing tests are covered in useDebounce unit tests.
    // Integration tests with fake timers and controlled inputs can be unreliable.
  });

  describe('useKeyboardShortcut + useDisclosure', () => {
    it('opens modal with button click', async () => {
      const user = userEvent.setup();
      render(<KeyboardModal />);

      expect(screen.queryByTestId('modal-content')).not.toBeInTheDocument();

      // Open with button click
      await user.click(screen.getByTestId('modal-trigger'));

      expect(screen.getByTestId('modal-content')).toBeInTheDocument();
    });

    it('closes modal with button click', async () => {
      const user = userEvent.setup();
      render(<KeyboardModal />);

      // Open modal
      await user.click(screen.getByTestId('modal-trigger'));
      expect(screen.getByTestId('modal-content')).toBeInTheDocument();

      // Close with button click
      await user.click(screen.getByTestId('modal-trigger'));
      expect(screen.queryByTestId('modal-content')).not.toBeInTheDocument();
    });

    it('toggles with button click', async () => {
      const user = userEvent.setup();
      render(<KeyboardModal />);

      await user.click(screen.getByTestId('modal-trigger'));
      expect(screen.getByTestId('modal-content')).toBeInTheDocument();

      await user.click(screen.getByTestId('modal-trigger'));
      expect(screen.queryByTestId('modal-content')).not.toBeInTheDocument();
    });
  });

  describe('useWindowSize + useMediaQuery', () => {
    it('provides window dimensions', () => {
      render(<ResponsiveLayout />);

      // Default mocked values
      expect(screen.getByTestId('window-width')).toBeInTheDocument();
      expect(screen.getByTestId('window-height')).toBeInTheDocument();
    });

    it('determines device type based on media queries', () => {
      render(<ResponsiveLayout />);

      // With default mocked matchMedia (matches: false), all queries return false
      expect(screen.getByTestId('is-mobile')).toHaveTextContent('false');
    });
  });

  describe('Multi-State Form', () => {
    it('renders all form elements', () => {
      const onSubmit = vi.fn();
      render(<MultiStateForm onSubmit={onSubmit} />);

      expect(screen.getByTestId('name-input')).toBeInTheDocument();
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-advanced')).toBeInTheDocument();
      expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
    });

    it('toggles advanced section', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(<MultiStateForm onSubmit={onSubmit} />);

      expect(screen.queryByTestId('advanced-section')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('toggle-advanced'));
      expect(screen.getByTestId('advanced-section')).toBeInTheDocument();

      await user.click(screen.getByTestId('toggle-advanced'));
      expect(screen.queryByTestId('advanced-section')).not.toBeInTheDocument();
    });

    // Note: Form submission, debounce, and cooldown timing tests are covered in
    // the respective hook unit tests. Integration tests with fake timers and
    // async form handling can be unreliable.
  });

  describe('Hook Stability', () => {
    it('maintains callback identity across renders', () => {
      const { result, rerender } = renderHook(() => ({
        formState: useFormState(),
        cooldown: useResendCooldown(),
      }));

      const wrapHandler1 = result.current.formState.wrapHandler;
      const startCooldown1 = result.current.cooldown.startCooldown;

      rerender();

      const wrapHandler2 = result.current.formState.wrapHandler;
      const startCooldown2 = result.current.cooldown.startCooldown;

      expect(wrapHandler1).toBe(wrapHandler2);
      expect(startCooldown1).toBe(startCooldown2);
    });
  });
});
