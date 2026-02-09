// src/client/ui/src/components/Tabs.test.tsx
/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Tabs } from './Tabs';

const items = [
  { id: 'a', label: 'Tab A', content: 'Content A' },
  { id: 'b', label: 'Tab B', content: 'Content B' },
];

const threeItems = [
  { id: '1', label: 'First', content: 'First Content' },
  { id: '2', label: 'Second', content: 'Second Content' },
  { id: '3', label: 'Third', content: 'Third Content' },
];

describe('Tabs', () => {
  describe('rendering', () => {
    it('renders default tab and switches on click', () => {
      render(<Tabs items={items} defaultValue="a" />);

      expect(screen.getByRole('tab', { name: /tab a/i })).toHaveAttribute('data-active', 'true');
      expect(screen.getByText('Content A')).toBeInTheDocument();
      expect(screen.queryByText('Content B')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('tab', { name: /tab b/i }));
      expect(screen.getByRole('tab', { name: /tab b/i })).toHaveAttribute('data-active', 'true');
      expect(screen.getByText('Content B')).toBeInTheDocument();
      expect(screen.queryByText('Content A')).not.toBeInTheDocument();
    });

    it('defaults to first tab when no defaultValue provided', () => {
      render(<Tabs items={items} />);

      expect(screen.getByRole('tab', { name: /tab a/i })).toHaveAttribute('data-active', 'true');
      expect(screen.getByText('Content A')).toBeInTheDocument();
    });

    it('handles empty items array gracefully', () => {
      render(<Tabs items={[]} />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.queryAllByRole('tab')).toHaveLength(0);
      expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument();
    });

    it('calls onChange on click', () => {
      const onChange = vi.fn();
      render(<Tabs items={items} defaultValue="a" onChange={onChange} />);

      fireEvent.click(screen.getByRole('tab', { name: /tab b/i }));
      expect(onChange).toHaveBeenCalledWith('b');
    });
  });

  describe('keyboard navigation', () => {
    it('moves focus/active with arrow keys', () => {
      render(<Tabs items={items} defaultValue="a" />);

      const tabA = screen.getByRole('tab', { name: /tab a/i });
      const tabB = screen.getByRole('tab', { name: /tab b/i });

      tabA.focus();
      fireEvent.keyDown(tabA, { key: 'ArrowRight' });
      expect(tabB).toHaveAttribute('data-active', 'true');
      expect(screen.getByText('Content B')).toBeInTheDocument();

      fireEvent.keyDown(tabB, { key: 'ArrowLeft' });
      expect(tabA).toHaveAttribute('data-active', 'true');
      expect(screen.getByText('Content A')).toBeInTheDocument();
    });

    it('calls onChange for keyboard navigation', () => {
      const onChange = vi.fn();
      render(<Tabs items={items} defaultValue="a" onChange={onChange} />);

      const tabA = screen.getByRole('tab', { name: /tab a/i });
      fireEvent.keyDown(tabA, { key: 'End' });
      expect(onChange).toHaveBeenCalledWith('b');

      const tabB = screen.getByRole('tab', { name: /tab b/i });
      fireEvent.keyDown(tabB, { key: 'Home' });
      expect(onChange).toHaveBeenCalledWith('a');
    });

    it('wraps around with ArrowRight from last tab', () => {
      render(<Tabs items={threeItems} defaultValue="3" />);

      const lastTab = screen.getByRole('tab', { name: /third/i });
      fireEvent.keyDown(lastTab, { key: 'ArrowRight' });

      expect(screen.getByRole('tab', { name: /first/i })).toHaveAttribute('data-active', 'true');
    });

    it('wraps around with ArrowLeft from first tab', () => {
      render(<Tabs items={threeItems} defaultValue="1" />);

      const firstTab = screen.getByRole('tab', { name: /first/i });
      fireEvent.keyDown(firstTab, { key: 'ArrowLeft' });

      expect(screen.getByRole('tab', { name: /third/i })).toHaveAttribute('data-active', 'true');
    });

    it('Home key goes to first tab', () => {
      render(<Tabs items={threeItems} defaultValue="3" />);

      const lastTab = screen.getByRole('tab', { name: /third/i });
      fireEvent.keyDown(lastTab, { key: 'Home' });

      expect(screen.getByRole('tab', { name: /first/i })).toHaveAttribute('data-active', 'true');
    });

    it('End key goes to last tab', () => {
      render(<Tabs items={threeItems} defaultValue="1" />);

      const firstTab = screen.getByRole('tab', { name: /first/i });
      fireEvent.keyDown(firstTab, { key: 'End' });

      expect(screen.getByRole('tab', { name: /third/i })).toHaveAttribute('data-active', 'true');
    });
  });

  describe('controlled mode', () => {
    it('respects controlled value prop', () => {
      const ControlledTabs = (): React.ReactElement => {
        const [value, setValue] = useState('a');
        return (
          <>
            <button
              onClick={() => {
                setValue('b');
              }}
            >
              Set B
            </button>
            <Tabs items={items} value={value} onChange={setValue} />
          </>
        );
      };

      render(<ControlledTabs />);

      expect(screen.getByRole('tab', { name: /tab a/i })).toHaveAttribute('data-active', 'true');

      fireEvent.click(screen.getByText('Set B'));
      expect(screen.getByRole('tab', { name: /tab b/i })).toHaveAttribute('data-active', 'true');
      expect(screen.getByText('Content B')).toBeInTheDocument();
    });

    it('does not update internal state when controlled', () => {
      const onChange = vi.fn();
      render(<Tabs items={items} value="a" onChange={onChange} />);

      fireEvent.click(screen.getByRole('tab', { name: /tab b/i }));

      // onChange called but tab doesn't change since we don't update value prop
      expect(onChange).toHaveBeenCalledWith('b');
      expect(screen.getByText('Content A')).toBeInTheDocument();
    });

    it('keyboard navigation calls onChange in controlled mode', () => {
      const onChange = vi.fn();
      render(<Tabs items={items} value="a" onChange={onChange} />);

      const tabA = screen.getByRole('tab', { name: /tab a/i });
      fireEvent.keyDown(tabA, { key: 'ArrowRight' });

      expect(onChange).toHaveBeenCalledWith('b');
    });
  });

  describe('accessibility', () => {
    it('renders with proper ARIA roles', () => {
      render(<Tabs items={items} defaultValue="a" />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(2);
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('sets aria-selected on active tab', () => {
      render(<Tabs items={items} defaultValue="a" />);

      expect(screen.getByRole('tab', { name: /tab a/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tab', { name: /tab b/i })).toHaveAttribute('aria-selected', 'false');
    });

    it('sets aria-controls linking tab to panel', () => {
      render(<Tabs items={items} defaultValue="a" />);

      const tab = screen.getByRole('tab', { name: /tab a/i });
      const panel = screen.getByRole('tabpanel');

      expect(tab).toHaveAttribute('aria-controls', panel.id);
    });

    it('sets aria-labelledby on panel linking to tab', () => {
      render(<Tabs items={items} defaultValue="a" />);

      const tab = screen.getByRole('tab', { name: /tab a/i });
      const panel = screen.getByRole('tabpanel');

      expect(panel).toHaveAttribute('aria-labelledby', tab.id);
    });

    it('sets tabIndex correctly for roving tabindex', () => {
      render(<Tabs items={items} defaultValue="a" />);

      expect(screen.getByRole('tab', { name: /tab a/i })).toHaveAttribute('tabIndex', '0');
      expect(screen.getByRole('tab', { name: /tab b/i })).toHaveAttribute('tabIndex', '-1');
    });

    it('panel has tabIndex 0 for focus', () => {
      render(<Tabs items={items} defaultValue="a" />);

      expect(screen.getByRole('tabpanel')).toHaveAttribute('tabIndex', '0');
    });
  });
});
