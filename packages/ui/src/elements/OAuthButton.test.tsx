// packages/ui/src/elements/OAuthButton.test.tsx
/**
 * Tests for OAuthButton component.
 *
 * Tests styled button for OAuth/social auth providers.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { OAuthButton } from './OAuthButton';

describe('OAuthButton', () => {
  describe('rendering', () => {
    it('should render as a button element', () => {
      render(<OAuthButton>Sign in</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Sign in' });
      expect(button.tagName).toBe('BUTTON');
    });

    it('should render children', () => {
      render(
        <OAuthButton>
          <span>Google Icon</span>
          <span>Continue with Google</span>
        </OAuthButton>,
      );

      expect(screen.getByText('Google Icon')).toBeInTheDocument();
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    });

    it('should apply oauth-button class', () => {
      render(<OAuthButton>Sign in</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Sign in' });
      expect(button).toHaveClass('oauth-button');
    });

    it('should merge custom className with base class', () => {
      render(<OAuthButton className="custom-class">Sign in</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Sign in' });
      expect(button).toHaveClass('oauth-button');
      expect(button).toHaveClass('custom-class');
    });

    it('should handle empty className', () => {
      render(<OAuthButton className="">Sign in</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Sign in' });
      expect(button).toHaveClass('oauth-button');
      expect(button.className.trim()).toBe('oauth-button');
    });

    it('should default to type button', () => {
      render(<OAuthButton>Sign in</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Sign in' });
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should allow submit type', () => {
      render(<OAuthButton type="submit">Submit</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Submit' });
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should allow reset type', () => {
      render(<OAuthButton type="reset">Reset</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Reset' });
      expect(button).toHaveAttribute('type', 'reset');
    });
  });

  describe('interactions', () => {
    it('should call onClick when clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<OAuthButton onClick={onClick}>Sign in</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Sign in' });
      await user.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should not call onClick when disabled', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(
        <OAuthButton onClick={onClick} disabled>
          Sign in
        </OAuthButton>,
      );

      const button = screen.getByRole('button', { name: 'Sign in' });
      await user.click(button);

      expect(onClick).not.toHaveBeenCalled();
    });

    it('should support keyboard interaction', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<OAuthButton onClick={onClick}>Sign in</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Sign in' });
      await user.tab();
      expect(button).toHaveFocus();

      await user.keyboard('[Enter]');
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should support space key interaction', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      render(<OAuthButton onClick={onClick}>Sign in</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Sign in' });
      button.focus();

      await user.keyboard('[Space]');
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('states', () => {
    it('should support disabled state', () => {
      render(<OAuthButton disabled>Sign in</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Sign in' });
      expect(button).toBeDisabled();
    });

    it('should support enabled state', () => {
      render(<OAuthButton>Sign in</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Sign in' });
      expect(button).toBeEnabled();
    });

    it('should support aria-busy state', () => {
      render(<OAuthButton aria-busy="true">Signing in...</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Signing in...' });
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('props passthrough', () => {
    it('should pass data attributes', () => {
      render(
        <OAuthButton data-testid="oauth-btn" data-provider="google">
          Sign in
        </OAuthButton>,
      );

      const button = screen.getByTestId('oauth-btn');
      expect(button).toHaveAttribute('data-provider', 'google');
    });

    it('should pass aria attributes', () => {
      render(
        <OAuthButton aria-label="Sign in with Google" aria-describedby="oauth-help">
          Sign in
        </OAuthButton>,
      );

      const button = screen.getByRole('button', { name: 'Sign in with Google' });
      expect(button).toHaveAttribute('aria-describedby', 'oauth-help');
    });

    it('should pass style prop', () => {
      render(<OAuthButton style={{ backgroundColor: 'blue' }}>Sign in</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Sign in' });
      expect(button).toHaveAttribute('style', expect.stringContaining('background-color'));
    });

    it('should pass id prop', () => {
      render(<OAuthButton id="oauth-button">Sign in</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Sign in' });
      expect(button).toHaveAttribute('id', 'oauth-button');
    });

    it('should pass name prop', () => {
      render(<OAuthButton name="oauth-action">Sign in</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Sign in' });
      expect(button).toHaveAttribute('name', 'oauth-action');
    });

    it('should pass value prop', () => {
      render(<OAuthButton value="google">Sign in</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Sign in' });
      expect(button).toHaveAttribute('value', 'google');
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to button element', () => {
      const ref = createRef<HTMLButtonElement>();

      render(<OAuthButton ref={ref}>Sign in</OAuthButton>);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current?.textContent).toBe('Sign in');
    });

    it('should allow ref to access button methods', () => {
      const ref = createRef<HTMLButtonElement>();

      render(<OAuthButton ref={ref}>Sign in</OAuthButton>);

      expect(() => ref.current?.focus()).toBeDefined();
      expect(() => ref.current?.click()).toBeDefined();
      expect(() => ref.current?.blur()).toBeDefined();
    });

    it('should focus button via ref', () => {
      const ref = createRef<HTMLButtonElement>();

      render(<OAuthButton ref={ref}>Sign in</OAuthButton>);

      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });
  });

  describe('accessibility', () => {
    it('should have correct role', () => {
      render(<OAuthButton>Sign in</OAuthButton>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should be keyboard focusable', async () => {
      const user = userEvent.setup();

      render(<OAuthButton>Sign in</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Sign in' });
      await user.tab();

      expect(button).toHaveFocus();
    });

    it('should not be focusable when disabled', async () => {
      const user = userEvent.setup();

      render(<OAuthButton disabled>Sign in</OAuthButton>);

      await user.tab();
      const button = screen.getByRole('button', { name: 'Sign in' });

      expect(button).not.toHaveFocus();
    });

    it('should support custom aria-label', () => {
      render(<OAuthButton aria-label="Sign in with Google">G</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Sign in with Google' });
      expect(button).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle no children', () => {
      render(<OAuthButton />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button.textContent).toBe('');
    });

    it('should handle null children', () => {
      render(<OAuthButton>{null}</OAuthButton>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button.textContent).toBe('');
    });

    it('should handle undefined children', () => {
      render(<OAuthButton>{undefined}</OAuthButton>);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button.textContent).toBe('');
    });

    it('should handle multiple className values', () => {
      render(<OAuthButton className="class1 class2 class3">Sign in</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Sign in' });
      expect(button).toHaveClass('oauth-button', 'class1', 'class2', 'class3');
    });

    it('should trim whitespace from className', () => {
      render(<OAuthButton className="  custom-class  ">Sign in</OAuthButton>);

      const button = screen.getByRole('button', { name: 'Sign in' });
      const classes = button.className.split(' ').filter((c) => c !== '');
      expect(classes).toEqual(['oauth-button', 'custom-class']);
    });
  });
});
