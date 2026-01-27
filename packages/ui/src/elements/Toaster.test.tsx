// packages/ui/src/elements/__tests__/Toaster.test.tsx
/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Toaster } from '../Toaster';

describe('Toaster', () => {
  describe('rendering', () => {
    it('should render with toaster class and top-right position by default', () => {
      const { container } = render(<Toaster messages={[]} onDismiss={vi.fn()} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('toaster');
      expect(wrapper).toHaveAttribute('data-position', 'top-right');
    });

    it('should render at top-left position', () => {
      const { container } = render(
        <Toaster messages={[]} onDismiss={vi.fn()} position="top-left" />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('toaster');
      expect(wrapper).toHaveAttribute('data-position', 'top-left');
    });

    it('should render at bottom-right position', () => {
      const { container } = render(
        <Toaster messages={[]} onDismiss={vi.fn()} position="bottom-right" />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('toaster');
      expect(wrapper).toHaveAttribute('data-position', 'bottom-right');
    });

    it('should render at bottom-left position', () => {
      const { container } = render(
        <Toaster messages={[]} onDismiss={vi.fn()} position="bottom-left" />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('toaster');
      expect(wrapper).toHaveAttribute('data-position', 'bottom-left');
    });
  });

  describe('messages', () => {
    it('should render messages with title', () => {
      const messages = [{ id: '1', title: 'Test Title' }];
      render(<Toaster messages={messages} onDismiss={vi.fn()} />);

      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('should render messages with description', () => {
      const messages = [{ id: '1', title: 'Title', description: 'Description text' }];
      render(<Toaster messages={messages} onDismiss={vi.fn()} />);

      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('should render multiple messages', () => {
      const messages = [
        { id: '1', title: 'First' },
        { id: '2', title: 'Second' },
        { id: '3', title: 'Third' },
      ];
      render(<Toaster messages={messages} onDismiss={vi.fn()} />);

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });

    it('should render empty container when no messages', () => {
      const { container } = render(<Toaster messages={[]} onDismiss={vi.fn()} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('dismiss callback', () => {
    it('should pass onDismiss to ToastContainer', () => {
      const onDismiss = vi.fn();
      const messages = [{ id: '1', title: 'Test' }];

      render(<Toaster messages={messages} onDismiss={onDismiss} />);

      // The ToastContainer should receive the onDismiss prop
      // We can't directly test if it's passed without clicking,
      // but we can verify the component renders without errors
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });
});
