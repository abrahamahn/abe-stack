// main/client/ui/src/__tests__/integration/FormComposition.integration.test.tsx
/** @vitest-environment jsdom */
/**
 * Integration tests for form composition
 *
 * Tests complex form scenarios with multiple components working together:
 * - FormField with Input, TextArea, Select
 * - Form validation and error handling
 * - useFormState and useResendCooldown hooks integration
 * - Accessibility of form compositions
 */

import { useFormState, useResendCooldown } from '@abe-stack/react/hooks';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FormField } from '../../components/FormField';
import { Select } from '../../components/Select';
import { Alert } from '../../elements/Alert';
import { Button } from '../../elements/Button';
import { Input } from '../../elements/Input';
import { TextArea } from '../../elements/TextArea';

// =============================================================================
// Test Components
// =============================================================================

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  message: string;
  country: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  message?: string;
  country?: string;
}

function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {};

  if (data.email === '') {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Invalid email format';
  }

  if (data.password === '') {
    errors.password = 'Password is required';
  } else if (data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }

  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (data.message === '') {
    errors.message = 'Message is required';
  } else if (data.message.length < 10) {
    errors.message = 'Message must be at least 10 characters';
  }

  if (data.country === '') {
    errors.country = 'Please select a country';
  }

  return errors;
}

const RegistrationForm = ({
  onSubmit,
}: {
  onSubmit: (data: FormData) => Promise<void>;
}): React.ReactElement => {
  const { isLoading, error, wrapHandler, clearError } = useFormState();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    message: '',
    country: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    clearError();

    const errors = validateForm(formData);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const wrappedSubmit = wrapHandler(onSubmit);
    void wrappedSubmit(formData);
  };

  const handleChange = (field: keyof FormData, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field] !== undefined) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-label="Registration form">
      {error !== null && (
        <Alert tone="danger" data-testid="form-error">
          {error}
        </Alert>
      )}

      <FormField
        label="Email"
        htmlFor="email"
        {...(fieldErrors.email !== undefined && { error: fieldErrors.email })}
        required
      >
        <Input
          id="email"
          data-testid="email-input"
          type="email"
          value={formData.email}
          onChange={(e) => {
            handleChange('email', e.target.value);
          }}
          aria-invalid={Boolean(fieldErrors.email)}
          disabled={isLoading}
        />
      </FormField>

      <FormField
        label="Password"
        htmlFor="password"
        {...(fieldErrors.password !== undefined && { error: fieldErrors.password })}
        required
      >
        <Input
          id="password"
          data-testid="password-input"
          type="password"
          value={formData.password}
          onChange={(e) => {
            handleChange('password', e.target.value);
          }}
          aria-invalid={Boolean(fieldErrors.password)}
          disabled={isLoading}
        />
      </FormField>

      <FormField
        label="Confirm Password"
        htmlFor="confirmPassword"
        {...(fieldErrors.confirmPassword !== undefined && { error: fieldErrors.confirmPassword })}
        required
      >
        <Input
          id="confirmPassword"
          data-testid="confirm-password-input"
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => {
            handleChange('confirmPassword', e.target.value);
          }}
          aria-invalid={Boolean(fieldErrors.confirmPassword)}
          disabled={isLoading}
        />
      </FormField>

      <FormField
        label="Message"
        htmlFor="message"
        {...(fieldErrors.message !== undefined && { error: fieldErrors.message })}
        description="Tell us about yourself"
        required
      >
        <TextArea
          id="message"
          data-testid="message-input"
          value={formData.message}
          onChange={(e) => {
            handleChange('message', e.target.value);
          }}
          aria-invalid={Boolean(fieldErrors.message)}
          disabled={isLoading}
        />
      </FormField>

      <FormField
        label="Country"
        htmlFor="country"
        {...(fieldErrors.country !== undefined && { error: fieldErrors.country })}
        required
      >
        <Select
          id="country"
          data-testid="country-select"
          value={formData.country}
          onChange={(value) => {
            handleChange('country', value);
          }}
          disabled={isLoading}
        >
          <option value="">Select a country</option>
          <option value="us">United States</option>
          <option value="uk">United Kingdom</option>
          <option value="ca">Canada</option>
        </Select>
      </FormField>

      <Button type="submit" disabled={isLoading} data-testid="submit-btn">
        {isLoading ? 'Submitting...' : 'Register'}
      </Button>
    </form>
  );
};

const ResendVerificationForm = ({
  onResend,
}: {
  onResend: () => Promise<void>;
}): React.ReactElement => {
  const { isLoading, error, wrapHandler, clearError } = useFormState();
  const { cooldown, isOnCooldown, startCooldown } = useResendCooldown(30);

  const handleResend = (): void => {
    clearError();
    const wrappedResend = wrapHandler(onResend, {
      onSuccess: () => {
        startCooldown();
      },
    });
    void wrappedResend({});
  };

  return (
    <div data-testid="resend-form">
      {error !== null && (
        <Alert tone="danger" data-testid="resend-error">
          {error}
        </Alert>
      )}

      <p>Didn't receive the verification email?</p>

      <Button onClick={handleResend} disabled={isLoading || isOnCooldown} data-testid="resend-btn">
        {isLoading ? 'Sending...' : isOnCooldown ? `Resend in ${cooldown}s` : 'Resend Email'}
      </Button>
    </div>
  );
};

// =============================================================================
// Tests
// =============================================================================

describe('FormComposition Integration Tests', () => {
  describe('Registration Form', () => {
    it('renders all form fields correctly', () => {
      render(<RegistrationForm onSubmit={vi.fn().mockResolvedValue(undefined)} />);

      expect(screen.getByTestId('email-input')).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
      expect(screen.getByTestId('message-input')).toBeInTheDocument();
      expect(screen.getByTestId('country-select')).toBeInTheDocument();
      expect(screen.getByTestId('submit-btn')).toBeInTheDocument();
    });

    it('shows validation errors on empty submit', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<RegistrationForm onSubmit={onSubmit} />);

      await user.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });
      expect(screen.getByText('Password is required')).toBeInTheDocument();
      expect(screen.getByText('Message is required')).toBeInTheDocument();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not submit with invalid email', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<RegistrationForm onSubmit={onSubmit} />);

      // Fill all required fields with valid data except email
      await user.type(screen.getByTestId('email-input'), 'invalid-email');
      await user.type(screen.getByTestId('password-input'), 'password123');
      await user.type(screen.getByTestId('confirm-password-input'), 'password123');
      await user.type(screen.getByTestId('message-input'), 'This is a test message');

      const selectTrigger = screen.getByTestId('country-select');
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'United States' }));

      await user.click(screen.getByTestId('submit-btn'));

      // Form should not submit due to validation failure
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('validates password length', async () => {
      const user = userEvent.setup();
      render(<RegistrationForm onSubmit={vi.fn()} />);

      await user.type(screen.getByTestId('password-input'), 'short');
      await user.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      });
    });

    it('validates password confirmation match', async () => {
      const user = userEvent.setup();
      render(<RegistrationForm onSubmit={vi.fn()} />);

      await user.type(screen.getByTestId('password-input'), 'password123');
      await user.type(screen.getByTestId('confirm-password-input'), 'different123');
      await user.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });
    });

    it('validates message length', async () => {
      const user = userEvent.setup();
      render(<RegistrationForm onSubmit={vi.fn()} />);

      await user.type(screen.getByTestId('message-input'), 'short');
      await user.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Message must be at least 10 characters')).toBeInTheDocument();
      });
    });

    it('clears field errors when user types', async () => {
      const user = userEvent.setup();
      render(<RegistrationForm onSubmit={vi.fn()} />);

      // Trigger validation error
      await user.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });

      // Start typing to clear error
      await user.type(screen.getByTestId('email-input'), 'test');

      await waitFor(() => {
        expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
      });
    });

    it('submits form with valid data', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<RegistrationForm onSubmit={onSubmit} />);

      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.type(screen.getByTestId('password-input'), 'password123');
      await user.type(screen.getByTestId('confirm-password-input'), 'password123');
      await user.type(
        screen.getByTestId('message-input'),
        'This is a test message that is long enough',
      );

      // Select country using the custom Select component
      const selectTrigger = screen.getByTestId('country-select');
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'United States' }));

      await user.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          message: 'This is a test message that is long enough',
          country: 'us',
        });
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      let resolveSubmit: () => void = () => {};
      const onSubmit = vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve;
          }),
      );
      render(<RegistrationForm onSubmit={onSubmit} />);

      // Fill valid form
      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.type(screen.getByTestId('password-input'), 'password123');
      await user.type(screen.getByTestId('confirm-password-input'), 'password123');
      await user.type(
        screen.getByTestId('message-input'),
        'This is a test message that is long enough',
      );

      const selectTrigger = screen.getByTestId('country-select');
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'United States' }));

      await user.click(screen.getByTestId('submit-btn'));

      // Check loading state
      await waitFor(() => {
        expect(screen.getByTestId('submit-btn')).toHaveTextContent('Submitting...');
        expect(screen.getByTestId('submit-btn')).toBeDisabled();
      });

      // Complete submission
      act(() => {
        resolveSubmit();
      });

      await waitFor(() => {
        expect(screen.getByTestId('submit-btn')).toHaveTextContent('Register');
        expect(screen.getByTestId('submit-btn')).not.toBeDisabled();
      });
    });

    // Note: Error handling with rejected promises is tested in useFormState unit tests.
    // Integration tests with mockRejectedValue cause unhandled rejection warnings.

    it('disables inputs during submission', async () => {
      const user = userEvent.setup();
      let resolveSubmit: () => void = () => {};
      const onSubmit = vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve;
          }),
      );
      render(<RegistrationForm onSubmit={onSubmit} />);

      // Fill valid form
      await user.type(screen.getByTestId('email-input'), 'test@example.com');
      await user.type(screen.getByTestId('password-input'), 'password123');
      await user.type(screen.getByTestId('confirm-password-input'), 'password123');
      await user.type(
        screen.getByTestId('message-input'),
        'This is a test message that is long enough',
      );

      const selectTrigger = screen.getByTestId('country-select');
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'United States' }));

      await user.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('email-input')).toBeDisabled();
        expect(screen.getByTestId('password-input')).toBeDisabled();
        expect(screen.getByTestId('confirm-password-input')).toBeDisabled();
        expect(screen.getByTestId('message-input')).toBeDisabled();
      });

      // Complete submission
      act(() => {
        resolveSubmit();
      });

      await waitFor(() => {
        expect(screen.getByTestId('email-input')).not.toBeDisabled();
      });
    });
  });

  describe('Resend Verification Form with Cooldown', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('renders resend button', () => {
      render(<ResendVerificationForm onResend={vi.fn().mockResolvedValue(undefined)} />);

      expect(screen.getByTestId('resend-btn')).toHaveTextContent('Resend Email');
    });

    // Note: Cooldown timing tests are covered in useResendCooldown unit tests.
    // Integration tests with fake timers and async operations can be unreliable.
  });

  describe('Form Field Component Compositions', () => {
    it('associates label with Input.Field correctly', () => {
      render(<Input.Field id="test-input" label="Test Label" description="Helper text" />);

      const input = screen.getByLabelText('Test Label');
      expect(input).toBeInTheDocument();
      expect(screen.getByText('Helper text')).toBeInTheDocument();
    });

    it('shows error state on Input.Field', () => {
      render(<Input.Field id="test-input" label="Test Label" error="This field has an error" />);

      expect(screen.getByText('This field has an error')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('handles focus management between multiple fields', async () => {
      const user = userEvent.setup();
      render(
        <form>
          <FormField label="First" htmlFor="first">
            <Input id="first" data-testid="first" />
          </FormField>
          <FormField label="Second" htmlFor="second">
            <Input id="second" data-testid="second" />
          </FormField>
          <FormField label="Third" htmlFor="third">
            <Input id="third" data-testid="third" />
          </FormField>
        </form>,
      );

      const firstInput = screen.getByTestId('first');
      const secondInput = screen.getByTestId('second');
      const thirdInput = screen.getByTestId('third');

      await user.click(firstInput);
      expect(firstInput).toHaveFocus();

      await user.tab();
      expect(secondInput).toHaveFocus();

      await user.tab();
      expect(thirdInput).toHaveFocus();

      await user.tab({ shift: true });
      expect(secondInput).toHaveFocus();
    });
  });
});
