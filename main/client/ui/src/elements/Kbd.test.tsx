// main/client/ui/src/elements/Kbd.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Kbd } from './Kbd';

describe('Kbd', () => {
  it('renders keyboard key with default size', () => {
    render(<Kbd>Ctrl</Kbd>);
    const kbd = screen.getByText('Ctrl');
    expect(kbd).toBeInTheDocument();
    expect(kbd).toHaveClass('kbd');
    expect(kbd).toHaveAttribute('data-size', 'md');
  });

  it('renders with small size', () => {
    render(<Kbd size="sm">K</Kbd>);
    const kbd = screen.getByText('K');
    expect(kbd).toHaveAttribute('data-size', 'sm');
  });

  it('forwards className', () => {
    render(<Kbd className="custom-kbd">Enter</Kbd>);
    const kbd = screen.getByText('Enter');
    expect(kbd).toHaveClass('kbd');
    expect(kbd).toHaveClass('custom-kbd');
  });

  it('forwards ref', () => {
    const ref = { current: null as HTMLElement | null };
    render(<Kbd ref={ref}>Space</Kbd>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('KBD');
  });

  it('passes through additional props', () => {
    render(
      <Kbd data-testid="my-kbd" title="Press this key">
        Esc
      </Kbd>,
    );
    const kbd = screen.getByTestId('my-kbd');
    expect(kbd).toHaveAttribute('title', 'Press this key');
    expect(kbd).toHaveTextContent('Esc');
  });

  it('renders multiple keys in sequence', () => {
    render(
      <span>
        <Kbd>Ctrl</Kbd>+<Kbd>C</Kbd>
      </span>,
    );
    expect(screen.getByText('Ctrl')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });
});
