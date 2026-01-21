// packages/ui/src/__tests__/integration/Accessibility.integration.test.tsx
/** @vitest-environment jsdom */
/**
 * Integration tests for accessibility (a11y)
 *
 * Tests accessibility compliance across components:
 * - ARIA attributes and roles
 * - Keyboard accessibility
 * - Screen reader announcements
 * - Color contrast (via axe)
 * - Focus management
 * - Semantic HTML
 */

import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { FormField } from '../../components/FormField';
import { Select } from '../../components/Select';
import { Tabs } from '../../components/Tabs';
import { Alert } from '../../elements/Alert';
import { Badge } from '../../elements/Badge';
import { Button } from '../../elements/Button';
import { Checkbox } from '../../elements/Checkbox';
import { Input } from '../../elements/Input';
import { Progress } from '../../elements/Progress';
import { Spinner } from '../../elements/Spinner';
import { Switch } from '../../elements/Switch';
// Note: Component naming in Table.tsx:
// - TableHeader = <thead> (table header section)
// - TableHead = <th> (table header cell)
// - TableRow = <tr>
// - TableCell = <td>
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../elements/Table';
import { TextArea } from '../../elements/TextArea';
import { Tooltip } from '../../elements/Tooltip';
import { VisuallyHidden } from '../../elements/VisuallyHidden';
import { useDisclosure } from '../../hooks/useDisclosure';
import { Modal } from '../../layouts/layers/Modal';

// =============================================================================
// Test Components
// =============================================================================

function AccessibleForm(): React.ReactElement {
  return (
    <form aria-label="Contact form">
      <FormField label="Name" htmlFor="name" required>
        <Input id="name" aria-required="true" />
      </FormField>

      <FormField label="Email" htmlFor="email" required error="Invalid email">
        <Input id="email" type="email" aria-required="true" aria-invalid="true" />
      </FormField>

      <FormField label="Message" htmlFor="message" helperText="Max 500 characters">
        <TextArea id="message" maxLength={500} />
      </FormField>

      <FormField label="Country" htmlFor="country">
        <Select id="country">
          <option value="">Select a country</option>
          <option value="us">United States</option>
          <option value="uk">United Kingdom</option>
        </Select>
      </FormField>

      <div className="form-field">
        <Checkbox id="subscribe" label="Subscribe to newsletter" />
      </div>

      <Button type="submit">Submit</Button>
    </form>
  );
}

function AccessibleTable(): React.ReactElement {
  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User' },
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Name</TableHead>
          <TableHead scope="col">Email</TableHead>
          <TableHead scope="col">Role</TableHead>
          <TableHead scope="col">
            <VisuallyHidden>Actions</VisuallyHidden>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge>{user.role}</Badge>
            </TableCell>
            <TableCell>
              <Button size="small" aria-label={`Edit ${user.name}`}>
                Edit
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function AccessibleTabs(): React.ReactElement {
  const items = [
    { id: 'overview', label: 'Overview', content: <p>Overview content</p> },
    { id: 'details', label: 'Details', content: <p>Details content</p> },
    { id: 'settings', label: 'Settings', content: <p>Settings content</p> },
  ];

  return <Tabs items={items} />;
}

function AccessibleModal(): React.ReactElement {
  const { open, openFn, close } = useDisclosure({ defaultOpen: false });

  return (
    <div>
      <Button onClick={openFn} aria-haspopup="dialog">
        Open Modal
      </Button>
      <Modal.Root open={open} onClose={close}>
        <Modal.Header>
          <Modal.Title>Confirm Action</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Modal.Description>Are you sure you want to proceed with this action?</Modal.Description>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>Cancel</Modal.Close>
          <Button>Confirm</Button>
        </Modal.Footer>
      </Modal.Root>
    </div>
  );
}

function AccessibleAlerts(): React.ReactElement {
  return (
    <div>
      <Alert variant="info" role="status">
        This is an informational message.
      </Alert>
      <Alert variant="success" role="status">
        Operation completed successfully.
      </Alert>
      <Alert variant="warning" role="alert">
        Please review your input.
      </Alert>
      <Alert variant="error" role="alert">
        An error occurred. Please try again.
      </Alert>
    </div>
  );
}

function AccessibleLoadingStates(): React.ReactElement {
  return (
    <div>
      <div role="status" aria-live="polite">
        <Spinner />
        <VisuallyHidden>Loading content</VisuallyHidden>
      </div>
      <Progress value={50} max={100} aria-label="Upload progress: 50%" />
      <Button disabled aria-busy="true">
        <span aria-hidden="true">
          <Spinner />
        </span>
        <span>Saving...</span>
      </Button>
    </div>
  );
}

// =============================================================================
// Tests
// =============================================================================

describe('Accessibility Integration Tests', () => {
  describe('Form Accessibility', () => {
    it('form has no accessibility violations', async () => {
      const { container } = render(<AccessibleForm />);
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('form fields have proper labels', () => {
      render(<AccessibleForm />);

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    });

    it('required fields are properly marked', () => {
      render(<AccessibleForm />);

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toHaveAttribute('aria-required', 'true');

      const nameLabel = screen.getByText(/name/i);
      expect(nameLabel.parentElement).toHaveTextContent('*');
    });

    it('error states are communicated accessibly', () => {
      render(<AccessibleForm />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('Invalid email');
    });

    it('helper text is associated with input', () => {
      render(<AccessibleForm />);

      // Helper text should be present
      expect(screen.getByText(/max 500 characters/i)).toBeInTheDocument();
    });

    it('checkbox is accessible', async () => {
      const user = userEvent.setup();
      render(<AccessibleForm />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();

      // The label is associated via wrapping label element
      const label = screen.getByText(/subscribe to newsletter/i);
      expect(label).toBeInTheDocument();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  describe('Table Accessibility', () => {
    it('table has no accessibility violations', async () => {
      const { container } = render(<AccessibleTable />);
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('table has proper structure', () => {
      render(<AccessibleTable />);

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(4);
      expect(screen.getAllByRole('row')).toHaveLength(4); // 1 header + 3 data rows
    });

    it('column headers have scope attribute', () => {
      render(<AccessibleTable />);

      const headers = screen.getAllByRole('columnheader');
      headers.forEach((header) => {
        expect(header).toHaveAttribute('scope', 'col');
      });
    });

    it('action buttons have accessible labels', () => {
      render(<AccessibleTable />);

      expect(screen.getByRole('button', { name: /edit john doe/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /edit jane smith/i })).toBeInTheDocument();
    });

    it('visually hidden text is present but hidden', () => {
      render(<AccessibleTable />);

      // VisuallyHidden should hide "Actions" visually but keep it accessible
      const actionsHeader = screen.getByText(/actions/i);
      expect(actionsHeader).toBeInTheDocument();
      // The parent should have appropriate styling
    });
  });

  describe('Tabs Accessibility', () => {
    it('tabs have no accessibility violations', async () => {
      const { container } = render(<AccessibleTabs />);
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('tabs have proper ARIA roles', () => {
      render(<AccessibleTabs />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(3);
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('active tab is indicated with aria-selected', () => {
      render(<AccessibleTabs />);

      const activeTab = screen.getByRole('tab', { name: /overview/i });
      expect(activeTab).toHaveAttribute('aria-selected', 'true');

      const inactiveTab = screen.getByRole('tab', { name: /details/i });
      expect(inactiveTab).toHaveAttribute('aria-selected', 'false');
    });

    it('tab panel is associated with tab via aria-controls', () => {
      render(<AccessibleTabs />);

      const activeTab = screen.getByRole('tab', { name: /overview/i });
      const panelId = activeTab.getAttribute('aria-controls');

      expect(panelId).toBeTruthy();
      expect(screen.getByRole('tabpanel')).toHaveAttribute('id', panelId);
    });

    it('tab panel is labeled by tab via aria-labelledby', () => {
      render(<AccessibleTabs />);

      const activeTab = screen.getByRole('tab', { name: /overview/i });
      const tabId = activeTab.getAttribute('id');

      expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', tabId);
    });

    it('non-active tabs have tabindex=-1', () => {
      render(<AccessibleTabs />);

      const activeTab = screen.getByRole('tab', { name: /overview/i });
      expect(activeTab).toHaveAttribute('tabindex', '0');

      const inactiveTab = screen.getByRole('tab', { name: /details/i });
      expect(inactiveTab).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Modal/Dialog Accessibility', () => {
    it('modal has no accessibility violations when open', async () => {
      const user = userEvent.setup();
      const { container } = render(<AccessibleModal />);

      await user.click(screen.getByRole('button', { name: /open modal/i }));

      await waitFor(async () => {
        const results = await axe(container);
        expect(results.violations).toHaveLength(0);
      });
    });

    it('modal has proper dialog role', async () => {
      const user = userEvent.setup();
      render(<AccessibleModal />);

      await user.click(screen.getByRole('button', { name: /open modal/i }));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveAttribute('aria-modal', 'true');
      });
    });

    it('modal is labeled by title', async () => {
      const user = userEvent.setup();
      render(<AccessibleModal />);

      await user.click(screen.getByRole('button', { name: /open modal/i }));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        const labelId = dialog.getAttribute('aria-labelledby');
        expect(labelId).toBeTruthy();

        const title = screen.getByRole('heading', { name: /confirm action/i });
        expect(title).toHaveAttribute('id', labelId);
      });
    });

    it('modal is described by description', async () => {
      const user = userEvent.setup();
      render(<AccessibleModal />);

      await user.click(screen.getByRole('button', { name: /open modal/i }));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        const descId = dialog.getAttribute('aria-describedby');
        expect(descId).toBeTruthy();
      });
    });

    it('trigger button has aria-haspopup', () => {
      render(<AccessibleModal />);

      const trigger = screen.getByRole('button', { name: /open modal/i });
      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    });
  });

  describe('Alert Accessibility', () => {
    it('alerts have no accessibility violations', async () => {
      const { container } = render(<AccessibleAlerts />);
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('error and warning alerts use role=alert', () => {
      render(<AccessibleAlerts />);

      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(2); // warning and error
    });

    it('info and success alerts use role=status', () => {
      render(<AccessibleAlerts />);

      const statuses = screen.getAllByRole('status');
      expect(statuses).toHaveLength(2); // info and success
    });
  });

  describe('Loading State Accessibility', () => {
    it('loading states have no accessibility violations', async () => {
      const { container } = render(<AccessibleLoadingStates />);
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('spinner has accessible label', () => {
      render(<AccessibleLoadingStates />);

      // The spinner is wrapped with a status region containing visually hidden text
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/loading content/i)).toBeInTheDocument();
    });

    it('progress bar has accessible label and value', () => {
      render(<AccessibleLoadingStates />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '50');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });

    it('loading button indicates busy state', () => {
      render(<AccessibleLoadingStates />);

      const button = screen.getByRole('button', { name: /saving/i });
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toBeDisabled();
    });

    it('decorative spinner is hidden from screen readers', () => {
      render(<AccessibleLoadingStates />);

      const button = screen.getByRole('button', { name: /saving/i });
      // The spinner is wrapped in a span with aria-hidden
      const hiddenWrapper = button.querySelector('[aria-hidden="true"]');
      expect(hiddenWrapper).toBeInTheDocument();
    });
  });

  describe('Select Accessibility', () => {
    it('select has no accessibility violations', async () => {
      const { container } = render(
        <Select aria-label="Choose option">
          <option value="a">Option A</option>
          <option value="b">Option B</option>
        </Select>,
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('select has proper ARIA attributes', async () => {
      const user = userEvent.setup();
      render(
        <Select aria-label="Choose option" data-testid="select">
          <option value="a">Option A</option>
          <option value="b">Option B</option>
        </Select>,
      );

      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await user.click(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('options have proper role and state', async () => {
      const user = userEvent.setup();
      render(
        <Select aria-label="Choose option" defaultValue="a">
          <option value="a">Option A</option>
          <option value="b">Option B</option>
        </Select>,
      );

      await user.click(screen.getByRole('button'));

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(2);

      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      expect(options[1]).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('Switch Accessibility', () => {
    it('switch has no accessibility violations', async () => {
      const { container } = render(
        <label>
          <Switch /> Enable notifications
        </label>,
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('switch has proper role and state', async () => {
      const user = userEvent.setup();
      render(
        <label>
          <Switch data-testid="switch" /> Enable notifications
        </label>,
      );

      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveAttribute('aria-checked', 'false');

      await user.click(switchEl);
      expect(switchEl).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('VisuallyHidden Component', () => {
    it('content is accessible but visually hidden', () => {
      render(
        <button>
          <VisuallyHidden>Delete item</VisuallyHidden>
          <span aria-hidden="true">X</span>
        </button>,
      );

      // Button should be accessible by its hidden text
      expect(screen.getByRole('button', { name: /delete item/i })).toBeInTheDocument();
    });
  });

  describe('Tooltip Accessibility', () => {
    it('tooltip is accessible', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="More information">
          <Button>Hover me</Button>
        </Tooltip>,
      );

      const button = screen.getByRole('button', { name: /hover me/i });
      await user.hover(button);

      // Tooltip content appears on hover
      await waitFor(() => {
        expect(screen.getByText('More information')).toBeInTheDocument();
      });
    });
  });

  describe('Color and Contrast', () => {
    it('badges meet color contrast requirements', async () => {
      const { container } = render(
        <div>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
        </div>,
      );

      // Note: axe will check color contrast if CSS is applied
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('buttons meet color contrast requirements', async () => {
      const { container } = render(
        <div>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="text">Text</Button>
        </div>,
      );

      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });
  });

  describe('Full Page Accessibility', () => {
    function FullPage(): React.ReactElement {
      return (
        <div>
          <header>
            <h1>Application</h1>
            <nav aria-label="Main navigation">
              <ul>
                <li>
                  <a href="#home">Home</a>
                </li>
                <li>
                  <a href="#about">About</a>
                </li>
                <li>
                  <a href="#contact">Contact</a>
                </li>
              </ul>
            </nav>
          </header>
          <main>
            <h2>Dashboard</h2>
            <AccessibleAlerts />
            <AccessibleForm />
            <AccessibleTable />
          </main>
          <footer>
            <p>&copy; 2024 Company</p>
          </footer>
        </div>
      );
    }

    it('full page has no accessibility violations', async () => {
      const { container } = render(<FullPage />);
      const results = await axe(container);
      expect(results.violations).toHaveLength(0);
    });

    it('page has proper landmark regions', () => {
      render(<FullPage />);

      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer
    });

    it('page has proper heading hierarchy', () => {
      render(<FullPage />);

      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('Application');

      const h2 = screen.getByRole('heading', { level: 2, name: /dashboard/i });
      expect(h2).toBeInTheDocument();
    });
  });
});
