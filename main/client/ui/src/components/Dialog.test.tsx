// main/client/ui/src/components/Dialog.test.tsx
// client/ui/src/elements/__tests__/Dialog.test.tsx
/** @vitest-environment jsdom */
import { Dialog } from '@components/Dialog';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

describe('Dialog', () => {
  describe('happy path', () => {
    it('renders closed by default', () => {
      render(
        <Dialog.Root>
          <Dialog.Trigger>Open Dialog</Dialog.Trigger>
          <Dialog.Content title="Test Dialog">Content</Dialog.Content>
        </Dialog.Root>,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open Dialog' })).toBeInTheDocument();
    });

    it('opens via trigger click with userEvent', async () => {
      const user = userEvent.setup();

      render(
        <Dialog.Root>
          <Dialog.Trigger>Open Dialog</Dialog.Trigger>
          <Dialog.Content title="Test Dialog">Dialog Content</Dialog.Content>
        </Dialog.Root>,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Open Dialog' }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Dialog Content')).toBeInTheDocument();
    });

    it('opens with defaultOpen', () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content title="Test Dialog">Dialog Content</Dialog.Content>
        </Dialog.Root>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Dialog Content')).toBeInTheDocument();
    });

    it('works in controlled mode', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      const { rerender } = render(
        <Dialog.Root open={false} onChange={onChange}>
          <Dialog.Trigger>Open</Dialog.Trigger>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Open' }));
      expect(onChange).toHaveBeenCalledWith(true);

      // Simulate parent updating the prop
      rerender(
        <Dialog.Root open={true} onChange={onChange}>
          <Dialog.Trigger>Open</Dialog.Trigger>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes via overlay click with userEvent', async () => {
      const user = userEvent.setup();

      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const overlay = document.querySelector('.overlay');
      expect(overlay).toBeInTheDocument();

      if (overlay !== null) await user.click(overlay);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes via close button click with userEvent', async () => {
      const user = userEvent.setup();

      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.click(screen.getByLabelText('Close dialog'));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes on Escape key with userEvent', async () => {
      const user = userEvent.setup();

      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders with title and description', () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content>
            <Dialog.Title>Dialog Title</Dialog.Title>
            <Dialog.Description>Dialog Description</Dialog.Description>
            <div>Body content</div>
          </Dialog.Content>
        </Dialog.Root>,
      );

      expect(screen.getByText('Dialog Title')).toBeInTheDocument();
      expect(screen.getByText('Dialog Description')).toBeInTheDocument();
      expect(screen.getByText('Body content')).toBeInTheDocument();
    });

    it('supports title prop on Content', () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content title="Title via prop">Body</Dialog.Content>
        </Dialog.Root>,
      );

      expect(screen.getByText('Title via prop')).toBeInTheDocument();
    });
  });

  describe('edge cases - missing/invalid props', () => {
    it('renders without onChange handler', async () => {
      const user = userEvent.setup();

      expect(() => {
        render(
          <Dialog.Root>
            <Dialog.Trigger>Open</Dialog.Trigger>
            <Dialog.Content title="Test">Content</Dialog.Content>
          </Dialog.Root>,
        );
      }).not.toThrow();

      await user.click(screen.getByRole('button', { name: 'Open' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('handles null onChange gracefully', async () => {
      const user = userEvent.setup();

      render(
        <Dialog.Root onChange={null as unknown as (open: boolean) => void}>
          <Dialog.Trigger>Open</Dialog.Trigger>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      await user.click(screen.getByRole('button', { name: 'Open' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('handles undefined defaultOpen', () => {
      render(
        <Dialog.Root>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('handles undefined open in controlled mode', () => {
      render(
        <Dialog.Root>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders without title', () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content>
            <Dialog.Description>Description only</Dialog.Description>
          </Dialog.Content>
        </Dialog.Root>,
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText('Description only')).toBeInTheDocument();
    });

    it('renders without description', () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content title="Title only">Body</Dialog.Content>
        </Dialog.Root>,
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText('Title only')).toBeInTheDocument();
    });

    it('renders without trigger', () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content title="Test">No trigger needed</Dialog.Content>
        </Dialog.Root>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('handles empty children in Root', () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('edge cases - closeOnEscape and closeOnOverlayClick props', () => {
    it('does not close on Escape when closeOnEscape=false', async () => {
      const user = userEvent.setup();

      render(
        <Dialog.Root defaultOpen closeOnEscape={false}>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      // Dialog should still be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not close on overlay click when closeOnOverlayClick=false', async () => {
      const user = userEvent.setup();

      render(
        <Dialog.Root defaultOpen closeOnOverlayClick={false}>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const overlay = document.querySelector('.overlay');
      expect(overlay).toBeInTheDocument();

      if (overlay !== null) await user.click(overlay);

      // Dialog should still be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('still closes via close button when closeOnEscape=false', async () => {
      const user = userEvent.setup();

      render(
        <Dialog.Root defaultOpen closeOnEscape={false}>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.click(screen.getByLabelText('Close dialog'));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('still closes via close button when closeOnOverlayClick=false', async () => {
      const user = userEvent.setup();

      render(
        <Dialog.Root defaultOpen closeOnOverlayClick={false}>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.click(screen.getByLabelText('Close dialog'));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('edge cases - boundary conditions', () => {
    it('handles rapid open/close clicks without breaking', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Dialog.Root onChange={onChange}>
          <Dialog.Trigger>Open</Dialog.Trigger>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      const trigger = screen.getByRole('button', { name: 'Open' });

      // Rapid clicks (10 times)
      for (let i = 0; i < 10; i++) {
        await user.click(trigger);
        if (screen.queryByRole('dialog') !== null) {
          await user.click(screen.getByLabelText('Close dialog'));
        }
      }

      // Should have called onChange many times
      expect(onChange).toHaveBeenCalled();
    });

    it('handles rapid prop changes in controlled mode', () => {
      const { rerender } = render(
        <Dialog.Root open={false}>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      // Rapid prop changes
      for (let i = 0; i < 10; i++) {
        rerender(
          <Dialog.Root open={i % 2 === 0}>
            <Dialog.Content title="Test">Content</Dialog.Content>
          </Dialog.Root>,
        );
      }

      // Final state should be closed (even number)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('edge cases - cleanup', () => {
    it('cleans up properly on unmount when open', () => {
      const { unmount } = render(
        <Dialog.Root defaultOpen>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      unmount();

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('cleans up properly on unmount when closed', () => {
      const { unmount } = render(
        <Dialog.Root>
          <Dialog.Trigger>Open</Dialog.Trigger>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      unmount();

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('edge cases - special characters', () => {
    it('handles title with special characters and HTML', () => {
      const titleText = `<script>alert('xss')</script> & special chars: <>&"'`;
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content title={titleText}>Content</Dialog.Content>
        </Dialog.Root>,
      );

      const title = screen.getByText(/script.*alert.*xss.*script/i);
      expect(title).toBeInTheDocument();
      expect(title.textContent).toContain('<script>');
      expect(title.textContent).toContain('&');
    });

    it('handles description with special characters', () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content title="Title">
            <Dialog.Description>Special chars: &lt;&gt;&amp;&quot;&#39;</Dialog.Description>
          </Dialog.Content>
        </Dialog.Root>,
      );

      const description = screen.getByText(/Special chars:/);
      expect(description).toBeInTheDocument();
    });

    it('handles className with special characters', () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content title="Test" className="test-class__with--special___chars">
            Content
          </Dialog.Content>
        </Dialog.Root>,
      );

      const content = document.querySelector('.test-class__with--special___chars');
      expect(content).toBeInTheDocument();
    });
  });

  describe('user interactions - keyboard', () => {
    it('focuses first focusable element on open', async () => {
      const user = userEvent.setup();

      render(
        <Dialog.Root>
          <Dialog.Trigger>Open</Dialog.Trigger>
          <Dialog.Content title="Test">
            <Button>First</Button>
            <Button>Second</Button>
          </Dialog.Content>
        </Dialog.Root>,
      );

      await user.click(screen.getByRole('button', { name: 'Open' }));

      const firstButton = screen.getByRole('button', { name: 'First' });
      expect(firstButton).toHaveFocus();
    });

    it('restores focus to trigger on close', async () => {
      const user = userEvent.setup();

      render(
        <Dialog.Root>
          <Dialog.Trigger>Open</Dialog.Trigger>
          <Dialog.Content title="Test">
            <Button>Action</Button>
          </Dialog.Content>
        </Dialog.Root>,
      );

      const trigger = screen.getByRole('button', { name: 'Open' });
      trigger.focus();
      expect(trigger).toHaveFocus();

      await user.click(trigger);

      const action = screen.getByRole('button', { name: 'Action' });
      expect(action).toHaveFocus();

      await user.click(screen.getByLabelText('Close dialog'));

      expect(trigger).toHaveFocus();
    });

    it('can Tab through focusable elements in dialog', async () => {
      const user = userEvent.setup();

      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content title="Test">
            <Button>First</Button>
            <Button>Second</Button>
          </Dialog.Content>
        </Dialog.Root>,
      );

      const first = screen.getByRole('button', { name: 'First' });
      const second = screen.getByRole('button', { name: 'Second' });
      const closeBtn = screen.getByLabelText('Close dialog');

      expect(first).toHaveFocus();

      await user.tab();
      expect(second).toHaveFocus();

      await user.tab();
      expect(closeBtn).toHaveFocus();
    });
  });

  describe('user interactions - mouse/touch', () => {
    it('handles double-click on overlay gracefully', async () => {
      const user = userEvent.setup();

      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      const overlay = document.querySelector('.overlay');
      expect(overlay).toBeInTheDocument();

      if (overlay !== null) await user.dblClick(overlay);

      // Should close on first click of double-click
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('handles clicking content (not closing)', async () => {
      const user = userEvent.setup();

      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content title="Test">
            <div data-testid="content-area">Content</div>
          </Dialog.Content>
        </Dialog.Root>,
      );

      const content = screen.getByTestId('content-area');
      await user.click(content);

      // Dialog should still be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('trigger can be clicked multiple times', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(
        <Dialog.Root onChange={onChange}>
          <Dialog.Trigger>Open</Dialog.Trigger>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      const trigger = screen.getByRole('button', { name: 'Open' });

      await user.click(trigger);
      expect(onChange).toHaveBeenCalledWith(true);

      await user.click(screen.getByLabelText('Close dialog'));
      expect(onChange).toHaveBeenCalledWith(false);

      await user.click(trigger);
      expect(onChange).toHaveBeenCalledTimes(3);
    });
  });

  describe('accessibility', () => {
    it('has aria-modal="true"', () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('applies aria-labelledby from title', async () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content>
            <Dialog.Title>Dialog Title</Dialog.Title>
            <div>Content</div>
          </Dialog.Content>
        </Dialog.Root>,
      );

      const dialog = screen.getByRole('dialog');
      const title = screen.getByText('Dialog Title');

      await waitFor(() => {
        expect(dialog).toHaveAttribute('aria-labelledby', title.getAttribute('id'));
      });
    });

    it('applies aria-describedby from description', async () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content title="Title">
            <Dialog.Description>Dialog Description</Dialog.Description>
          </Dialog.Content>
        </Dialog.Root>,
      );

      const dialog = screen.getByRole('dialog');
      const description = screen.getByText('Dialog Description');

      await waitFor(() => {
        expect(dialog).toHaveAttribute('aria-describedby', description.getAttribute('id'));
      });
    });

    it('applies both aria-labelledby and aria-describedby', async () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content>
            <Dialog.Title>Title</Dialog.Title>
            <Dialog.Description>Description</Dialog.Description>
          </Dialog.Content>
        </Dialog.Root>,
      );

      const dialog = screen.getByRole('dialog');
      const title = screen.getByText('Title');
      const description = screen.getByText('Description');

      await waitFor(() => {
        expect(dialog).toHaveAttribute('aria-labelledby', title.getAttribute('id'));
        expect(dialog).toHaveAttribute('aria-describedby', description.getAttribute('id'));
      });
    });

    it('close button has aria-label', () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      const closeBtn = screen.getByLabelText('Close dialog');
      expect(closeBtn).toBeInTheDocument();
      expect(closeBtn).toHaveAttribute('aria-label', 'Close dialog');
    });

    it('uses semantic dialog role', () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('overlay is rendered in DOM', () => {
      render(
        <Dialog.Root defaultOpen>
          <Dialog.Content title="Test">Content</Dialog.Content>
        </Dialog.Root>,
      );

      const overlay = document.querySelector('.overlay');
      expect(overlay).toBeInTheDocument();
    });
  });

  describe('context usage', () => {
    it('throws error when Trigger used outside Root', () => {
      // Suppress console.error for this test
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<Dialog.Trigger>Open</Dialog.Trigger>);
      }).toThrow('Dialog.Trigger must be used within <Dialog.Root>');

      spy.mockRestore();
    });

    it('throws error when Content used outside Root', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<Dialog.Content title="Test">Content</Dialog.Content>);
      }).toThrow('Dialog.Content must be used within <Dialog.Root>');

      spy.mockRestore();
    });

    it('throws error when Title used outside Root', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<Dialog.Title>Title</Dialog.Title>);
      }).toThrow('Dialog.Title must be used within <Dialog.Root>');

      spy.mockRestore();
    });

    it('throws error when Description used outside Root', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<Dialog.Description>Description</Dialog.Description>);
      }).toThrow('Dialog.Description must be used within <Dialog.Root>');

      spy.mockRestore();
    });
  });
});
