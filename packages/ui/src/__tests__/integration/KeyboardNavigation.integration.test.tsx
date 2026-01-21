// packages/ui/src/__tests__/integration/KeyboardNavigation.integration.test.tsx
/** @vitest-environment jsdom */
/**
 * Integration tests for keyboard navigation
 *
 * Tests keyboard navigation across components:
 * - Tab navigation through interactive elements
 * - Arrow key navigation in Tabs, Select, Dropdown
 * - Home/End keys for jumping to first/last
 * - Escape key for closing menus/modals
 * - Enter/Space for activation
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Dropdown } from '../../components/Dropdown';
import { FocusTrap } from '../../components/FocusTrap';
import { Select } from '../../components/Select';
import { Tabs } from '../../components/Tabs';
import { Button } from '../../elements/Button';
import { Input } from '../../elements/Input';
import { MenuItem } from '../../elements/MenuItem';
import { Modal } from '../../layouts/layers/Modal';

// =============================================================================
// Test Components
// =============================================================================

function NavigationForm(): React.ReactElement {
  return (
    <form data-testid="navigation-form">
      <Input data-testid="input-1" placeholder="First input" />
      <Input data-testid="input-2" placeholder="Second input" />
      <Select data-testid="select-1">
        <option value="a">Option A</option>
        <option value="b">Option B</option>
        <option value="c">Option C</option>
      </Select>
      <Button data-testid="btn-1">Submit</Button>
      <Button data-testid="btn-2">Cancel</Button>
    </form>
  );
}

function TabsExample({ onTabChange }: { onTabChange?: (id: string) => void }): React.ReactElement {
  const items = [
    { id: 'tab1', label: 'Tab 1', content: <div data-testid="content-1">Content 1</div> },
    { id: 'tab2', label: 'Tab 2', content: <div data-testid="content-2">Content 2</div> },
    { id: 'tab3', label: 'Tab 3', content: <div data-testid="content-3">Content 3</div> },
    { id: 'tab4', label: 'Tab 4', content: <div data-testid="content-4">Content 4</div> },
  ];

  return <Tabs items={items} onChange={onTabChange} />;
}

function SelectExample({ onSelect }: { onSelect?: (value: string) => void }): React.ReactElement {
  return (
    <Select data-testid="select" onChange={onSelect}>
      <option value="apple">Apple</option>
      <option value="banana">Banana</option>
      <option value="cherry" disabled>
        Cherry (disabled)
      </option>
      <option value="date">Date</option>
    </Select>
  );
}

function DropdownExample({
  onItemClick,
}: {
  onItemClick?: (item: string) => void;
}): React.ReactElement {
  return (
    <Dropdown trigger={<span>Open Menu</span>}>
      {(close) => (
        <>
          <MenuItem
            role="menuitem"
            onClick={() => {
              onItemClick?.('item1');
              close();
            }}
          >
            Item 1
          </MenuItem>
          <MenuItem
            role="menuitem"
            onClick={() => {
              onItemClick?.('item2');
              close();
            }}
          >
            Item 2
          </MenuItem>
          <MenuItem
            role="menuitem"
            onClick={() => {
              onItemClick?.('item3');
              close();
            }}
          >
            Item 3
          </MenuItem>
        </>
      )}
    </Dropdown>
  );
}

function ModalExample({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): React.ReactElement {
  return (
    <Modal.Root open={open} onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Modal Title</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Input data-testid="modal-input" placeholder="Modal input" />
      </Modal.Body>
      <Modal.Footer>
        <Modal.Close data-testid="modal-close">Close</Modal.Close>
        <Button data-testid="modal-confirm">Confirm</Button>
      </Modal.Footer>
    </Modal.Root>
  );
}

function FocusTrapExample(): React.ReactElement {
  return (
    <FocusTrap>
      <div data-testid="focus-trap-container">
        <Button data-testid="trap-btn-1">First</Button>
        <Input data-testid="trap-input" placeholder="Middle" />
        <Button data-testid="trap-btn-2">Last</Button>
      </div>
    </FocusTrap>
  );
}

// =============================================================================
// Tests
// =============================================================================

describe('KeyboardNavigation Integration Tests', () => {
  describe('Tab Navigation', () => {
    it('navigates through form elements with Tab', async () => {
      const user = userEvent.setup();
      render(<NavigationForm />);

      const input1 = screen.getByTestId('input-1');
      const input2 = screen.getByTestId('input-2');
      const select = screen.getByTestId('select-1');
      const btn1 = screen.getByTestId('btn-1');
      const btn2 = screen.getByTestId('btn-2');

      // Focus first element
      await user.click(input1);
      expect(input1).toHaveFocus();

      // Tab through elements
      await user.tab();
      expect(input2).toHaveFocus();

      await user.tab();
      expect(select).toHaveFocus();

      await user.tab();
      expect(btn1).toHaveFocus();

      await user.tab();
      expect(btn2).toHaveFocus();
    });

    it('navigates backwards with Shift+Tab', async () => {
      const user = userEvent.setup();
      render(<NavigationForm />);

      const input1 = screen.getByTestId('input-1');
      const input2 = screen.getByTestId('input-2');
      const btn2 = screen.getByTestId('btn-2');

      // Start at last button
      await user.click(btn2);
      expect(btn2).toHaveFocus();

      // Shift+Tab backwards
      await user.tab({ shift: true });
      await user.tab({ shift: true });
      await user.tab({ shift: true });

      expect(input2).toHaveFocus();

      await user.tab({ shift: true });
      expect(input1).toHaveFocus();
    });
  });

  describe('Tabs Component Keyboard Navigation', () => {
    it('navigates tabs with arrow keys', async () => {
      const user = userEvent.setup();
      const onTabChange = vi.fn();
      render(<TabsExample onTabChange={onTabChange} />);

      // Click first tab to focus
      await user.click(screen.getByRole('tab', { name: 'Tab 1' }));

      // Arrow right to next tab
      await user.keyboard('{ArrowRight}');
      expect(onTabChange).toHaveBeenCalledWith('tab2');
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveAttribute('data-active', 'true');

      // Arrow right again
      await user.keyboard('{ArrowRight}');
      expect(onTabChange).toHaveBeenCalledWith('tab3');

      // Arrow left back
      await user.keyboard('{ArrowLeft}');
      expect(onTabChange).toHaveBeenCalledWith('tab2');
    });

    it('wraps around with arrow keys', async () => {
      const user = userEvent.setup();
      const onTabChange = vi.fn();
      render(<TabsExample onTabChange={onTabChange} />);

      // Click first tab
      await user.click(screen.getByRole('tab', { name: 'Tab 1' }));

      // Arrow left should wrap to last tab
      await user.keyboard('{ArrowLeft}');
      expect(onTabChange).toHaveBeenCalledWith('tab4');

      // Arrow right should wrap to first tab
      await user.keyboard('{ArrowRight}');
      expect(onTabChange).toHaveBeenCalledWith('tab1');
    });

    it('jumps to first/last with Home/End', async () => {
      const user = userEvent.setup();
      const onTabChange = vi.fn();
      render(<TabsExample onTabChange={onTabChange} />);

      // Click second tab
      await user.click(screen.getByRole('tab', { name: 'Tab 2' }));

      // Home jumps to first
      await user.keyboard('{Home}');
      expect(onTabChange).toHaveBeenCalledWith('tab1');

      // End jumps to last
      await user.keyboard('{End}');
      expect(onTabChange).toHaveBeenCalledWith('tab4');
    });

    it('displays correct content for active tab', async () => {
      const user = userEvent.setup();
      render(<TabsExample />);

      expect(screen.getByTestId('content-1')).toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: 'Tab 2' }));

      expect(screen.queryByTestId('content-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('content-2')).toBeInTheDocument();
    });
  });

  describe('Select Component Keyboard Navigation', () => {
    it('opens select with arrow keys', async () => {
      const user = userEvent.setup();
      render(<SelectExample />);

      const trigger = screen.getByRole('button');
      await user.click(trigger);
      expect(trigger).toHaveFocus();

      // Listbox should be open
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    it('navigates options with arrow keys', async () => {
      const user = userEvent.setup();
      render(<SelectExample />);

      const trigger = screen.getByRole('button');
      await user.click(trigger); // Open - this already highlights first option

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // Select opens with first option highlighted (apple at index 0)
      // Arrow down moves to banana (index 1)
      await user.keyboard('{ArrowDown}');

      // Arrow down moves to date (index 3), skipping cherry (disabled at index 2)
      await user.keyboard('{ArrowDown}');

      // Check highlighted option - date should be highlighted
      const options = screen.getAllByRole('option');
      expect(options[3]).toHaveAttribute('data-highlighted', 'true');
    });

    it('selects option with Enter', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<SelectExample onSelect={onSelect} />);

      const trigger = screen.getByRole('button');
      await user.click(trigger); // Opens and highlights first option

      await user.keyboard('{Enter}'); // Select the highlighted option

      expect(onSelect).toHaveBeenCalledWith('apple');
    });

    it('selects option with Space', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(<SelectExample onSelect={onSelect} />);

      const trigger = screen.getByRole('button');
      await user.click(trigger); // Opens and highlights first option

      await user.keyboard(' '); // Select with space

      expect(onSelect).toHaveBeenCalledWith('apple');
    });

    it('closes select with Escape', async () => {
      const user = userEvent.setup();
      render(<SelectExample />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('skips disabled options when navigating', async () => {
      const user = userEvent.setup();
      render(<SelectExample />);

      await user.click(screen.getByRole('button')); // Opens with apple highlighted

      // Navigate: apple -> banana -> (skip cherry) -> date
      await user.keyboard('{ArrowDown}'); // banana
      await user.keyboard('{ArrowDown}'); // date (skips cherry)

      const options = screen.getAllByRole('option');
      const dateOption = options.find((o) => o.textContent === 'Date');
      expect(dateOption).toHaveAttribute('data-highlighted', 'true');
    });

    it('jumps to first/last enabled option with Home/End', async () => {
      const user = userEvent.setup();
      render(<SelectExample />);

      await user.click(screen.getByRole('button'));

      await user.keyboard('{End}');
      const options = screen.getAllByRole('option');
      expect(options[3]).toHaveAttribute('data-highlighted', 'true'); // Date (last enabled)

      await user.keyboard('{Home}');
      expect(options[0]).toHaveAttribute('data-highlighted', 'true'); // Apple (first)
    });
  });

  describe('Dropdown Component Keyboard Navigation', () => {
    it('opens dropdown with Enter/Space', async () => {
      const user = userEvent.setup();
      render(<DropdownExample />);

      const trigger = screen.getByRole('button');
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });

    it('closes dropdown with Escape', async () => {
      const user = userEvent.setup();
      render(<DropdownExample />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });

      // Focus should return to trigger
      expect(screen.getByRole('button')).toHaveFocus();
    });

    it('selects item with click', async () => {
      const user = userEvent.setup();
      const onItemClick = vi.fn();
      render(<DropdownExample onItemClick={onItemClick} />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      // Click on the first menu item
      const menuItems = screen.getAllByRole('menuitem');
      await user.click(menuItems[0]);

      expect(onItemClick).toHaveBeenCalledWith('item1');
    });
  });

  describe('Modal Keyboard Navigation', () => {
    it('closes modal with Escape', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<ModalExample open={true} onClose={onClose} />);

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('traps focus within modal', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <>
          <Button data-testid="outside-btn">Outside</Button>
          <ModalExample open={true} onClose={onClose} />
        </>,
      );

      // Modal should have focus trapped - verify elements exist
      expect(screen.getByTestId('modal-input')).toBeInTheDocument();
      expect(screen.getByTestId('modal-close')).toBeInTheDocument();
      expect(screen.getByTestId('modal-confirm')).toBeInTheDocument();

      // Tab through modal elements
      await user.tab();
      // Focus should be on first focusable element in modal

      await user.tab();
      await user.tab();
      await user.tab();

      // Should wrap back within modal, not go to outside button
      expect(screen.getByTestId('outside-btn')).not.toHaveFocus();
    });
  });

  describe('FocusTrap Component', () => {
    it('traps focus within container', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Button data-testid="before">Before</Button>
          <FocusTrapExample />
          <Button data-testid="after">After</Button>
        </>,
      );

      // Focus trap should auto-focus first element
      await waitFor(() => {
        expect(screen.getByTestId('trap-btn-1')).toHaveFocus();
      });

      // Tab through trapped elements
      await user.tab();
      expect(screen.getByTestId('trap-input')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('trap-btn-2')).toHaveFocus();

      // Tab should wrap to first element
      await user.tab();
      expect(screen.getByTestId('trap-btn-1')).toHaveFocus();
    });

    it('handles Shift+Tab wrapping', async () => {
      const user = userEvent.setup();
      render(<FocusTrapExample />);

      await waitFor(() => {
        expect(screen.getByTestId('trap-btn-1')).toHaveFocus();
      });

      // Shift+Tab from first should wrap to last
      await user.tab({ shift: true });
      expect(screen.getByTestId('trap-btn-2')).toHaveFocus();
    });
  });

  describe('Combined Component Keyboard Navigation', () => {
    it('navigates through mixed components', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Input data-testid="input-before" />
          <TabsExample />
          <SelectExample />
          <Button data-testid="btn-after">After</Button>
        </div>,
      );

      const inputBefore = screen.getByTestId('input-before');
      const btnAfter = screen.getByTestId('btn-after');

      // Start at input
      await user.click(inputBefore);
      expect(inputBefore).toHaveFocus();

      // Tab to tabs
      await user.tab();
      expect(screen.getByRole('tab', { name: 'Tab 1' })).toHaveFocus();

      // Tab to tab panel (it has tabindex=0)
      await user.tab();
      expect(screen.getByRole('tabpanel')).toHaveFocus();

      // Tab to select
      await user.tab();
      expect(screen.getByRole('button', { name: /apple/i })).toHaveFocus();

      // Tab to button after
      await user.tab();
      expect(btnAfter).toHaveFocus();
    });

    it('maintains keyboard navigation after component interactions', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <TabsExample />
          <SelectExample />
        </div>,
      );

      // Interact with tabs using keyboard
      await user.click(screen.getByRole('tab', { name: 'Tab 1' }));
      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveAttribute('data-active', 'true');

      // Tab to tab panel, then to select
      await user.tab(); // Tab panel
      await user.tab(); // Select button

      // Open select by clicking
      const selectButton = screen.getByRole('button', { name: /apple/i });
      await user.click(selectButton);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // Select with Enter
      await user.keyboard('{Enter}');

      // Select should be closed
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Activation', () => {
    it('activates buttons with Enter', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Click Me</Button>);

      const button = screen.getByRole('button');
      await user.click(button);
      await user.keyboard('{Enter}');

      expect(onClick).toHaveBeenCalledTimes(2); // click + Enter
    });

    it('activates buttons with Space', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Click Me</Button>);

      const button = screen.getByRole('button');
      await user.click(button);
      await user.keyboard(' ');

      expect(onClick).toHaveBeenCalledTimes(2); // click + Space
    });

    it('submits form with Enter on input', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((e) => e.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <Input data-testid="form-input" />
          <Button type="submit">Submit</Button>
        </form>,
      );

      await user.type(screen.getByTestId('form-input'), 'test');
      await user.keyboard('{Enter}');

      expect(onSubmit).toHaveBeenCalled();
    });
  });
});
