/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Dropdown } from '../primitives/Dropdown';
import { MenuItem } from '../primitives/MenuItem';

describe('Dropdown', () => {
  it('opens on trigger click and renders menu items', () => {
    render(
      <Dropdown trigger={<button>Open</button>}>
        <MenuItem>Item 1</MenuItem>
        <MenuItem>Item 2</MenuItem>
      </Dropdown>,
    );

    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('closes when selecting a menu item', () => {
    render(
      <Dropdown trigger={<button>Open</button>}>
        <MenuItem onClick={() => {}}>Item 1</MenuItem>
      </Dropdown>,
    );

    fireEvent.click(screen.getByText('Open'));
    fireEvent.click(screen.getByText('Item 1'));
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
  });

  it('closes on Escape when open', () => {
    render(
      <Dropdown trigger={<button>Open</button>}>
        <MenuItem>Item 1</MenuItem>
      </Dropdown>,
    );

    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    expect(screen.getByText('Open')).toHaveFocus();
  });
});
