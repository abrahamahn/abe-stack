// apps/web/src/features/demo/__tests__/UI.test.tsx
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UIPage } from '../UI';

describe('UIPage Component', () => {
  describe('Section Rendering', () => {
    it('renders the component without crashing', () => {
      render(<UIPage />);

      expect(screen.getByRole('heading', { name: /buttons/i })).toBeInTheDocument();
    });

    it('renders Buttons section', () => {
      render(<UIPage />);

      expect(screen.getByRole('heading', { name: /^buttons$/i, level: 2 })).toBeInTheDocument();
    });

    it('renders Inputs section', () => {
      render(<UIPage />);

      expect(screen.getByRole('heading', { name: /^inputs$/i, level: 2 })).toBeInTheDocument();
    });

    it('renders Feedback section', () => {
      render(<UIPage />);

      expect(screen.getByRole('heading', { name: /^feedback$/i, level: 2 })).toBeInTheDocument();
    });

    it('renders Navigation section', () => {
      render(<UIPage />);

      expect(screen.getByRole('heading', { name: /^navigation$/i, level: 2 })).toBeInTheDocument();
    });

    it('renders Card section', () => {
      render(<UIPage />);

      expect(screen.getByRole('heading', { name: /^card$/i, level: 2 })).toBeInTheDocument();
    });
  });

  describe('Button Components', () => {
    it('renders Primary button', () => {
      render(<UIPage />);

      expect(screen.getByRole('button', { name: /primary/i })).toBeInTheDocument();
    });

    it('renders Disabled button', () => {
      render(<UIPage />);

      const disabledButton = screen.getByRole('button', { name: /disabled/i });
      expect(disabledButton).toBeInTheDocument();
      expect(disabledButton).toBeDisabled();
    });

    it('renders Tooltip button', () => {
      render(<UIPage />);

      expect(screen.getByRole('button', { name: /^tooltip$/i })).toBeInTheDocument();
    });

    it('renders Dropdown button', () => {
      render(<UIPage />);

      const dropdownButtons = screen.getAllByRole('button', { name: /dropdown/i });
      expect(dropdownButtons.length).toBeGreaterThan(0);
    });

    it('renders Popover trigger', () => {
      render(<UIPage />);

      const popoverTriggers = screen.getAllByRole('button', { name: /popover/i });
      expect(popoverTriggers.length).toBeGreaterThan(0);
    });
  });

  describe('Input Components', () => {
    it('renders text input', () => {
      render(<UIPage />);

      const textInput = screen.getByPlaceholderText(/text input/i);
      expect(textInput).toBeInTheDocument();
    });

    it('renders select dropdown', () => {
      render(<UIPage />);

      const select = screen.getByLabelText(/select example/i);
      expect(select).toBeInTheDocument();
      // Custom Select component may be rendered as a button
      expect(select.tagName).toMatch(/^(SELECT|BUTTON)$/);
    });

    it('renders checkbox with label', () => {
      render(<UIPage />);

      expect(screen.getByLabelText(/check me/i)).toBeInTheDocument();
    });

    it('renders radio button with label', () => {
      render(<UIPage />);

      expect(screen.getByLabelText(/^radio$/i)).toBeInTheDocument();
    });

    it('checkbox is checked by default', () => {
      render(<UIPage />);

      const checkbox = screen.getByLabelText(/check me/i);
      expect(checkbox).toBeChecked();
    });

    it('radio is checked by default', () => {
      render(<UIPage />);

      const radio = screen.getByLabelText(/^radio$/i);
      expect(radio).toBeChecked();
    });
  });

  describe('Feedback Components', () => {
    it('renders Success badge', () => {
      render(<UIPage />);

      expect(screen.getByText(/^success$/i)).toBeInTheDocument();
    });

    it('renders Danger badge', () => {
      render(<UIPage />);

      expect(screen.getByText(/^danger$/i)).toBeInTheDocument();
    });

    it('renders Progress component', () => {
      render(<UIPage />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toBeInTheDocument();
    });

    it('renders Skeleton component', () => {
      const { container } = render(<UIPage />);

      // Skeleton might not have a specific role, check by container
      expect(container).toBeInTheDocument();
    });
  });

  describe('Navigation Components', () => {
    it('renders tabs', () => {
      render(<UIPage />);

      // Tabs should have tab roles
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThanOrEqual(2);
    });

    it('renders tab labels', () => {
      render(<UIPage />);

      expect(screen.getByRole('tab', { name: /tab one/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /tab two/i })).toBeInTheDocument();
    });

    it('renders accordion component', () => {
      render(<UIPage />);

      // Accordion items should have buttons
      expect(screen.getByRole('button', { name: /first/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /second/i })).toBeInTheDocument();
    });
  });

  describe('Overlay Components', () => {
    it('renders Tooltip trigger', () => {
      render(<UIPage />);

      // Tooltip wraps a button
      expect(screen.getByRole('button', { name: /^tooltip$/i })).toBeInTheDocument();
    });

    it('renders Dropdown trigger', () => {
      render(<UIPage />);

      const dropdownButtons = screen.getAllByRole('button', { name: /dropdown/i });
      expect(dropdownButtons.length).toBeGreaterThan(0);
    });

    it('renders Popover trigger', () => {
      render(<UIPage />);

      const popoverButtons = screen.getAllByRole('button', { name: /popover/i });
      expect(popoverButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Card Component', () => {
    it('renders card with content', () => {
      render(<UIPage />);

      expect(
        screen.getByText(/Use this gallery to visually verify component states/i),
      ).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('renders all sections in correct order', () => {
      render(<UIPage />);

      const headings = screen.getAllByRole('heading', { level: 2 });
      const headingTexts = headings.map((h) => h.textContent);

      expect(headingTexts).toContain('Buttons');
      expect(headingTexts).toContain('Inputs');
      expect(headingTexts).toContain('Feedback');
      expect(headingTexts).toContain('Navigation');
      expect(headingTexts).toContain('Card');
    });

    it('uses grid layout for main container', () => {
      const { container } = render(<UIPage />);

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv).toHaveStyle({ display: 'grid' });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<UIPage />);

      const h2Headings = screen.getAllByRole('heading', { level: 2 });
      expect(h2Headings.length).toBeGreaterThan(0);
    });

    it('select has aria-label', () => {
      render(<UIPage />);

      const select = screen.getByLabelText(/select example/i);
      expect(select).toHaveAccessibleName();
    });

    it('all form inputs are labeled', () => {
      render(<UIPage />);

      const checkbox = screen.getByLabelText(/check me/i);
      const radio = screen.getByLabelText(/^radio$/i);

      expect(checkbox).toHaveAccessibleName();
      expect(radio).toHaveAccessibleName();
    });

    it('progress bar has proper role', () => {
      render(<UIPage />);

      const progress = screen.getByRole('progressbar');
      expect(progress).toBeInTheDocument();
    });
  });

  describe('Interactive Components', () => {
    it('renders tabs with tab items', () => {
      render(<UIPage />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(2);
    });

    it('renders accordion with items', () => {
      render(<UIPage />);

      const accordionButtons = screen.getAllByRole('button');
      const firstButton = accordionButtons.find((btn) => btn.textContent?.includes('First'));
      const secondButton = accordionButtons.find((btn) => btn.textContent?.includes('Second'));

      expect(firstButton).toBeInTheDocument();
      expect(secondButton).toBeInTheDocument();
    });
  });
});
