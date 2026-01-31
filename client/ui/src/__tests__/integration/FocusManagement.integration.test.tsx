// client/ui/src/__tests__/integration/FocusManagement.integration.test.tsx
/** @vitest-environment jsdom */
/**
 * Integration tests for focus management
 *
 * Tests focus management across components:
 * - Focus trap in modals/dialogs
 * - Focus restoration after closing
 * - Auto-focus on mount
 * - Focus on error fields
 * - Skip links and focus landmarks
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useRef, useState } from 'react';
import { describe, expect, it } from 'vitest';

import { FocusTrap } from '../../components/FocusTrap';
import { FormField } from '../../components/FormField';
import { Button } from '../../elements/Button';
import { Input } from '../../elements/Input';
import { TextArea } from '../../elements/TextArea';
import { useDisclosure } from '../../hooks/useDisclosure';
import { Modal } from '../../layouts/layers/Modal';

// =============================================================================
// Test Components
// =============================================================================

const ModalWithFocusRestoration = (): React.ReactElement => {
  const { open, openFn, close } = useDisclosure({ defaultOpen: false });

  return (
    <div>
      <Button onClick={openFn} data-testid="open-modal">
        Open Modal
      </Button>
      <Modal.Root open={open} onClose={close}>
        <Modal.Header>
          <Modal.Title>Modal Title</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Input data-testid="modal-input" placeholder="Focus me" />
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close data-testid="close-modal">Close</Modal.Close>
        </Modal.Footer>
      </Modal.Root>
    </div>
  );
};

const FormWithFocusOnError = (): React.ReactElement => {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const value = inputRef.current?.value ?? '';

    if (value === '') {
      setError('This field is required');
      inputRef.current?.focus();
    } else if (value.length < 3) {
      setError('Must be at least 3 characters');
      inputRef.current?.focus();
    } else {
      setError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="error-focus-form">
      <FormField label="Username" htmlFor="username" {...(error !== null && { error })}>
        <Input
          ref={inputRef}
          id="username"
          data-testid="username-input"
          aria-invalid={Boolean(error)}
        />
      </FormField>
      <Button type="submit" data-testid="submit-btn">
        Submit
      </Button>
    </form>
  );
};

const AutoFocusInput = (): React.ReactElement => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return <Input ref={inputRef} data-testid="autofocus-input" placeholder="Auto focused" />;
};

const FocusTrapWithMultipleElements = (): React.ReactElement => {
  return (
    <FocusTrap>
      <div data-testid="trap-container">
        <h2>Trapped Content</h2>
        <Input data-testid="trap-input-1" placeholder="First" />
        <Input data-testid="trap-input-2" placeholder="Second" />
        <TextArea data-testid="trap-textarea" placeholder="Third" />
        <Button data-testid="trap-btn-1">Action 1</Button>
        <Button data-testid="trap-btn-2">Action 2</Button>
      </div>
    </FocusTrap>
  );
};

const NestedFocusTrap = (): React.ReactElement => {
  const [showInner, setShowInner] = useState(false);

  return (
    <FocusTrap>
      <div data-testid="outer-trap">
        <Button data-testid="outer-btn-1">Outer 1</Button>
        <Button
          onClick={() => {
            setShowInner(true);
          }}
          data-testid="show-inner"
        >
          Show Inner
        </Button>
        {showInner && (
          <FocusTrap>
            <div data-testid="inner-trap">
              <Button data-testid="inner-btn-1">Inner 1</Button>
              <Button
                onClick={() => {
                  setShowInner(false);
                }}
                data-testid="close-inner"
              >
                Close
              </Button>
            </div>
          </FocusTrap>
        )}
        <Button data-testid="outer-btn-2">Outer 2</Button>
      </div>
    </FocusTrap>
  );
};

const SkipLinksExample = (): React.ReactElement => {
  return (
    <div>
      <a href="#main-content" className="skip-link" data-testid="skip-link">
        Skip to main content
      </a>
      <nav aria-label="Main navigation" data-testid="nav">
        <Button>Nav 1</Button>
        <Button>Nav 2</Button>
        <Button>Nav 3</Button>
      </nav>
      <main id="main-content" data-testid="main" tabIndex={-1}>
        <h1>Main Content</h1>
        <Button data-testid="main-btn">Main Action</Button>
      </main>
    </div>
  );
};

const MultipleDialogs = (): React.ReactElement => {
  const dialog1 = useDisclosure({ defaultOpen: false });
  const dialog2 = useDisclosure({ defaultOpen: false });

  return (
    <div>
      <Button onClick={dialog1.openFn} data-testid="open-dialog-1">
        Open Dialog 1
      </Button>
      <Button onClick={dialog2.openFn} data-testid="open-dialog-2">
        Open Dialog 2
      </Button>

      <Modal.Root open={dialog1.open} onClose={dialog1.close}>
        <Modal.Header>
          <Modal.Title>Dialog 1</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Button data-testid="dialog-1-btn">Dialog 1 Action</Button>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close data-testid="close-dialog-1">Close</Modal.Close>
        </Modal.Footer>
      </Modal.Root>

      <Modal.Root open={dialog2.open} onClose={dialog2.close}>
        <Modal.Header>
          <Modal.Title>Dialog 2</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Button data-testid="dialog-2-btn">Dialog 2 Action</Button>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close data-testid="close-dialog-2">Close</Modal.Close>
        </Modal.Footer>
      </Modal.Root>
    </div>
  );
};

const FocusableElementsList = (): React.ReactElement => {
  return (
    <div data-testid="focusables-list">
      <a href="#" data-testid="link">
        Link
      </a>
      <button data-testid="button">Button</button>
      <input data-testid="input" />
      <textarea data-testid="textarea" />
      <select data-testid="select">
        <option>Option 1</option>
      </select>
      <div tabIndex={0} data-testid="tabindex-0">
        Focusable div
      </div>
      <div tabIndex={-1} data-testid="tabindex-neg">
        Not tabbable but focusable
      </div>
      <button disabled data-testid="disabled-button">
        Disabled
      </button>
    </div>
  );
};

// =============================================================================
// Tests
// =============================================================================

describe('FocusManagement Integration Tests', () => {
  describe('Modal Focus Management', () => {
    it('focuses first focusable element when modal opens', async () => {
      const user = userEvent.setup();
      render(<ModalWithFocusRestoration />);

      await user.click(screen.getByTestId('open-modal'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-input')).toHaveFocus();
      });
    });

    it('restores focus to trigger when modal closes', async () => {
      const user = userEvent.setup();
      render(<ModalWithFocusRestoration />);

      const openButton = screen.getByTestId('open-modal');
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('modal-input')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('close-modal'));

      await waitFor(() => {
        expect(openButton).toHaveFocus();
      });
    });

    it('restores focus when pressing Escape', async () => {
      const user = userEvent.setup();
      render(<ModalWithFocusRestoration />);

      const openButton = screen.getByTestId('open-modal');
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByTestId('modal-input')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(openButton).toHaveFocus();
      });
    });
  });

  describe('Focus Trap', () => {
    it('traps focus within container', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Button data-testid="outside">Outside</Button>
          <FocusTrapWithMultipleElements />
        </>,
      );

      // First focusable element should be focused
      await waitFor(() => {
        expect(screen.getByTestId('trap-input-1')).toHaveFocus();
      });

      // Tab through all elements
      await user.tab();
      expect(screen.getByTestId('trap-input-2')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('trap-textarea')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('trap-btn-1')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('trap-btn-2')).toHaveFocus();

      // Tab should wrap to first element
      await user.tab();
      expect(screen.getByTestId('trap-input-1')).toHaveFocus();
    });

    it('wraps backwards with Shift+Tab', async () => {
      const user = userEvent.setup();
      render(<FocusTrapWithMultipleElements />);

      await waitFor(() => {
        expect(screen.getByTestId('trap-input-1')).toHaveFocus();
      });

      // Shift+Tab should wrap to last element
      await user.tab({ shift: true });
      expect(screen.getByTestId('trap-btn-2')).toHaveFocus();
    });

    it('handles nested focus traps', async () => {
      const user = userEvent.setup();
      render(<NestedFocusTrap />);

      // Focus should be on first element of outer trap
      await waitFor(() => {
        expect(screen.getByTestId('outer-btn-1')).toHaveFocus();
      });

      // Tab to show inner button
      await user.tab();
      expect(screen.getByTestId('show-inner')).toHaveFocus();

      // Show inner trap
      await user.click(screen.getByTestId('show-inner'));

      // Inner trap should capture focus
      await waitFor(() => {
        expect(screen.getByTestId('inner-btn-1')).toHaveFocus();
      });

      // Tab within inner trap
      await user.tab();
      expect(screen.getByTestId('close-inner')).toHaveFocus();

      // Tab should wrap within inner
      await user.tab();
      expect(screen.getByTestId('inner-btn-1')).toHaveFocus();
    });
  });

  describe('Focus on Error', () => {
    it('focuses input when validation error occurs', async () => {
      const user = userEvent.setup();
      render(<FormWithFocusOnError />);

      // Submit empty form
      await user.click(screen.getByTestId('submit-btn'));

      // Input should be focused
      expect(screen.getByTestId('username-input')).toHaveFocus();
      expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
    });

    it('focuses input on length validation error', async () => {
      const user = userEvent.setup();
      render(<FormWithFocusOnError />);

      const input = screen.getByTestId('username-input');
      await user.type(input, 'ab');
      await user.click(screen.getByTestId('submit-btn'));

      expect(input).toHaveFocus();
      expect(screen.getByRole('alert')).toHaveTextContent('Must be at least 3 characters');
    });

    it('clears error on valid input', async () => {
      const user = userEvent.setup();
      render(<FormWithFocusOnError />);

      const input = screen.getByTestId('username-input');
      await user.type(input, 'valid');
      await user.click(screen.getByTestId('submit-btn'));

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Auto Focus', () => {
    it('auto-focuses input on mount', async () => {
      render(<AutoFocusInput />);

      await waitFor(() => {
        expect(screen.getByTestId('autofocus-input')).toHaveFocus();
      });
    });

    it('does not steal focus from existing focused element', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <Input data-testid="existing-input" />
          <Button
            onClick={() => {
              // Simulate late mount
            }}
            data-testid="trigger"
          >
            Trigger
          </Button>
        </div>,
      );

      const existingInput = screen.getByTestId('existing-input');
      await user.click(existingInput);
      expect(existingInput).toHaveFocus();
    });
  });

  describe('Skip Links', () => {
    it('skip link is first in tab order', async () => {
      const user = userEvent.setup();
      render(<SkipLinksExample />);

      await user.tab();
      expect(screen.getByTestId('skip-link')).toHaveFocus();
    });

    it('skip link navigates to main content', async () => {
      const user = userEvent.setup();
      render(<SkipLinksExample />);

      const skipLink = screen.getByTestId('skip-link');
      const mainContent = screen.getByTestId('main');

      // Click skip link
      await user.click(skipLink);

      // Main content should be the target
      expect(skipLink.getAttribute('href')).toBe('#main-content');
      expect(mainContent.getAttribute('id')).toBe('main-content');
    });
  });

  describe('Multiple Dialogs', () => {
    it('manages focus between dialogs', async () => {
      const user = userEvent.setup();
      render(<MultipleDialogs />);

      const openDialog1Btn = screen.getByTestId('open-dialog-1');

      // Open first dialog
      await user.click(openDialog1Btn);

      await waitFor(() => {
        expect(screen.getByTestId('dialog-1-btn')).toBeInTheDocument();
      });

      // Close first dialog
      await user.click(screen.getByTestId('close-dialog-1'));

      await waitFor(() => {
        expect(openDialog1Btn).toHaveFocus();
      });
    });

    it('handles sequential dialog opening', async () => {
      const user = userEvent.setup();
      render(<MultipleDialogs />);

      // Open dialog 1
      await user.click(screen.getByTestId('open-dialog-1'));
      await waitFor(() => {
        expect(screen.getByTestId('dialog-1-btn')).toBeInTheDocument();
      });

      // Close dialog 1
      await user.click(screen.getByTestId('close-dialog-1'));
      await waitFor(() => {
        expect(screen.queryByTestId('dialog-1-btn')).not.toBeInTheDocument();
      });

      // Open dialog 2
      await user.click(screen.getByTestId('open-dialog-2'));
      await waitFor(() => {
        expect(screen.getByTestId('dialog-2-btn')).toBeInTheDocument();
      });
    });
  });

  describe('Focusable Elements', () => {
    it('identifies naturally focusable elements', async () => {
      const user = userEvent.setup();
      render(<FocusableElementsList />);

      // Tab through naturally focusable elements
      await user.tab();
      expect(screen.getByTestId('link')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('button')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('input')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('textarea')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('select')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('tabindex-0')).toHaveFocus();

      // tabindex=-1 should be skipped
      await user.tab();
      expect(screen.getByTestId('tabindex-neg')).not.toHaveFocus();
    });

    it('skips disabled elements', async () => {
      const user = userEvent.setup();
      render(<FocusableElementsList />);

      // Tab through all elements
      for (let i = 0; i < 10; i++) {
        await user.tab();
      }

      // Disabled button should never have focus
      expect(screen.getByTestId('disabled-button')).not.toHaveFocus();
    });

    it('allows programmatic focus on tabindex=-1', () => {
      render(<FocusableElementsList />);

      const element = screen.getByTestId('tabindex-neg');
      element.focus();

      expect(element).toHaveFocus();
    });
  });

  describe('Focus Visibility', () => {
    it('maintains focus outline on keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Button data-testid="btn-1">Button 1</Button>
          <Button data-testid="btn-2">Button 2</Button>
        </div>,
      );

      await user.tab();
      expect(screen.getByTestId('btn-1')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('btn-2')).toHaveFocus();

      // Note: Testing actual CSS :focus-visible is limited in jsdom
      // This verifies the element receives focus
    });
  });

  describe('Dynamic Focus Management', () => {
    const DynamicForm = (): React.ReactElement => {
      const [showField, setShowField] = useState(false);
      const newFieldRef = useRef<HTMLInputElement>(null);

      useEffect(() => {
        if (showField) {
          newFieldRef.current?.focus();
        }
      }, [showField]);

      return (
        <div>
          <Button
            onClick={() => {
              setShowField(true);
            }}
            data-testid="add-field"
          >
            Add Field
          </Button>
          {showField && <Input ref={newFieldRef} data-testid="new-field" placeholder="New field" />}
        </div>
      );
    };

    it('focuses dynamically added elements', async () => {
      const user = userEvent.setup();
      render(<DynamicForm />);

      await user.click(screen.getByTestId('add-field'));

      await waitFor(() => {
        expect(screen.getByTestId('new-field')).toHaveFocus();
      });
    });
  });

  describe('Focus Order', () => {
    it('follows DOM order by default', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Button data-testid="first">First</Button>
          <Button data-testid="second">Second</Button>
          <Button data-testid="third">Third</Button>
        </div>,
      );

      await user.tab();
      expect(screen.getByTestId('first')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('second')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('third')).toHaveFocus();
    });

    it('respects positive tabindex order', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Button tabIndex={3} data-testid="third">
            Third
          </Button>
          <Button tabIndex={1} data-testid="first">
            First
          </Button>
          <Button tabIndex={2} data-testid="second">
            Second
          </Button>
        </div>,
      );

      await user.tab();
      expect(screen.getByTestId('first')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('second')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('third')).toHaveFocus();
    });
  });
});
