// client/ui/src/components/billing/PaymentMethodCard.test.tsx
/**
 * Tests for PaymentMethodCard component.
 *
 * Tests payment method display and actions.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PaymentMethodCard } from './PaymentMethodCard';

import type { PaymentMethod } from '@abe-stack/shared';

const mockCardPaymentMethod: PaymentMethod = {
  id: 'pm_123',
  type: 'card',
  isDefault: false,
  cardDetails: {
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2025,
  },
  createdAt: '2024-01-01T00:00:00Z',
};

const mockDefaultCardPaymentMethod: PaymentMethod = {
  ...mockCardPaymentMethod,
  id: 'pm_124',
  isDefault: true,
};

const mockBankAccountPaymentMethod: PaymentMethod = {
  id: 'pm_125',
  type: 'bank_account',
  isDefault: false,
  cardDetails: null,
  createdAt: '2024-01-01T00:00:00Z',
};

describe('PaymentMethodCard', () => {
  describe('card rendering', () => {
    it('should render card payment method', () => {
      render(<PaymentMethodCard paymentMethod={mockCardPaymentMethod} />);

      expect(screen.getByText('visa')).toBeInTheDocument();
      expect(screen.getByText('**** 4242')).toBeInTheDocument();
      expect(screen.getByText('Expires 12/25')).toBeInTheDocument();
    });

    it('should render card brand icon', () => {
      render(<PaymentMethodCard paymentMethod={mockCardPaymentMethod} />);

      expect(screen.getByText('Visa')).toBeInTheDocument();
    });

    it('should render Mastercard brand', () => {
      const mastercardMethod: PaymentMethod = {
        ...mockCardPaymentMethod,
        cardDetails: { ...mockCardPaymentMethod.cardDetails!, brand: 'mastercard' },
      };

      render(<PaymentMethodCard paymentMethod={mastercardMethod} />);

      expect(screen.getByText('MC')).toBeInTheDocument();
    });

    it('should render American Express brand', () => {
      const amexMethod: PaymentMethod = {
        ...mockCardPaymentMethod,
        cardDetails: { ...mockCardPaymentMethod.cardDetails!, brand: 'amex' },
      };

      render(<PaymentMethodCard paymentMethod={amexMethod} />);

      expect(screen.getByText('Amex')).toBeInTheDocument();
    });

    it('should render custom expiry format', () => {
      const formatExpiry = vi.fn(() => 'December 2025');

      render(
        <PaymentMethodCard paymentMethod={mockCardPaymentMethod} formatExpiry={formatExpiry} />,
      );

      expect(formatExpiry).toHaveBeenCalledWith(12, 2025);
      expect(screen.getByText('Expires December 2025')).toBeInTheDocument();
    });
  });

  describe('bank account rendering', () => {
    it('should render bank account payment method', () => {
      render(<PaymentMethodCard paymentMethod={mockBankAccountPaymentMethod} />);

      expect(screen.getByText('Bank Account')).toBeInTheDocument();
    });

    it('should not render expiry for bank account', () => {
      render(<PaymentMethodCard paymentMethod={mockBankAccountPaymentMethod} />);

      expect(screen.queryByText(/Expires/)).not.toBeInTheDocument();
    });
  });

  describe('default badge', () => {
    it('should show default badge when isDefault is true', () => {
      render(<PaymentMethodCard paymentMethod={mockDefaultCardPaymentMethod} />);

      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('should not show default badge when isDefault is false', () => {
      render(<PaymentMethodCard paymentMethod={mockCardPaymentMethod} />);

      expect(screen.queryByText('Default')).not.toBeInTheDocument();
    });

    it('should not show Set Default button when isDefault is true', () => {
      render(
        <PaymentMethodCard paymentMethod={mockDefaultCardPaymentMethod} onSetDefault={vi.fn()} />,
      );

      expect(screen.queryByRole('button', { name: 'Set Default' })).not.toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('should render Set Default button when not default', () => {
      render(<PaymentMethodCard paymentMethod={mockCardPaymentMethod} onSetDefault={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'Set Default' })).toBeInTheDocument();
    });

    it('should render Remove button when onRemove is provided', () => {
      render(<PaymentMethodCard paymentMethod={mockCardPaymentMethod} onRemove={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    });

    it('should not render Set Default button when onSetDefault is undefined', () => {
      render(<PaymentMethodCard paymentMethod={mockCardPaymentMethod} />);

      expect(screen.queryByRole('button', { name: 'Set Default' })).not.toBeInTheDocument();
    });

    it('should not render Remove button when onRemove is undefined', () => {
      render(<PaymentMethodCard paymentMethod={mockCardPaymentMethod} />);

      expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    });

    it('should call onSetDefault when Set Default is clicked', async () => {
      const user = userEvent.setup();
      const onSetDefault = vi.fn();

      render(
        <PaymentMethodCard paymentMethod={mockCardPaymentMethod} onSetDefault={onSetDefault} />,
      );

      await user.click(screen.getByRole('button', { name: 'Set Default' }));

      expect(onSetDefault).toHaveBeenCalledWith(mockCardPaymentMethod);
    });

    it('should call onRemove when Remove is clicked', async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();

      render(<PaymentMethodCard paymentMethod={mockCardPaymentMethod} onRemove={onRemove} />);

      await user.click(screen.getByRole('button', { name: 'Remove' }));

      expect(onRemove).toHaveBeenCalledWith(mockCardPaymentMethod);
    });

    it('should not call onSetDefault when already default', () => {
      const onSetDefault = vi.fn();

      render(
        <PaymentMethodCard
          paymentMethod={mockDefaultCardPaymentMethod}
          onSetDefault={onSetDefault}
        />,
      );

      // Button should not be rendered
      expect(screen.queryByRole('button', { name: 'Set Default' })).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should disable Set Default button when isActing', () => {
      render(
        <PaymentMethodCard paymentMethod={mockCardPaymentMethod} onSetDefault={vi.fn()} isActing />,
      );

      expect(screen.getByRole('button', { name: 'Set Default' })).toBeDisabled();
    });

    it('should disable Remove button when isActing', () => {
      render(
        <PaymentMethodCard paymentMethod={mockCardPaymentMethod} onRemove={vi.fn()} isActing />,
      );

      expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled();
    });

    it('should not call onSetDefault when isActing', async () => {
      const user = userEvent.setup();
      const onSetDefault = vi.fn();

      render(
        <PaymentMethodCard
          paymentMethod={mockCardPaymentMethod}
          onSetDefault={onSetDefault}
          isActing
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Set Default' }));

      expect(onSetDefault).not.toHaveBeenCalled();
    });

    it('should not call onRemove when isActing', async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();

      render(
        <PaymentMethodCard paymentMethod={mockCardPaymentMethod} onRemove={onRemove} isActing />,
      );

      await user.click(screen.getByRole('button', { name: 'Remove' }));

      expect(onRemove).not.toHaveBeenCalled();
    });
  });

  describe('remove disabled state', () => {
    it('should disable Remove button when removeDisabled', () => {
      render(
        <PaymentMethodCard
          paymentMethod={mockCardPaymentMethod}
          onRemove={vi.fn()}
          removeDisabled
        />,
      );

      expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled();
    });

    it('should show tooltip title when removeDisabled', () => {
      render(
        <PaymentMethodCard
          paymentMethod={mockCardPaymentMethod}
          onRemove={vi.fn()}
          removeDisabled
        />,
      );

      const removeButton = screen.getByRole('button', { name: 'Remove' });
      expect(removeButton).toHaveAttribute(
        'title',
        'Cannot remove default payment method with active subscription',
      );
    });

    it('should not call onRemove when removeDisabled', async () => {
      const user = userEvent.setup();
      const onRemove = vi.fn();

      render(
        <PaymentMethodCard
          paymentMethod={mockCardPaymentMethod}
          onRemove={onRemove}
          removeDisabled
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Remove' }));

      expect(onRemove).not.toHaveBeenCalled();
    });

    it('should show default tooltip when not removeDisabled', () => {
      render(<PaymentMethodCard paymentMethod={mockCardPaymentMethod} onRemove={vi.fn()} />);

      const removeButton = screen.getByRole('button', { name: 'Remove' });
      expect(removeButton).toHaveAttribute('title', 'Remove payment method');
    });
  });

  describe('edge cases', () => {
    it('should handle payment method without card details', () => {
      const methodWithoutCard: PaymentMethod = {
        ...mockCardPaymentMethod,
        cardDetails: null,
      };

      render(<PaymentMethodCard paymentMethod={methodWithoutCard} />);

      // Should render type instead of card details
      expect(screen.getByText('Card')).toBeInTheDocument();
    });

    it('should handle unknown card brand', () => {
      const unknownBrandMethod: PaymentMethod = {
        ...mockCardPaymentMethod,
        cardDetails: { ...mockCardPaymentMethod.cardDetails!, brand: 'unknown' },
      };

      render(<PaymentMethodCard paymentMethod={unknownBrandMethod} />);

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('should handle PayPal payment method', () => {
      const paypalMethod: PaymentMethod = {
        id: 'pm_paypal',
        type: 'paypal',
        isDefault: false,
        cardDetails: null,
        createdAt: '2024-01-01T00:00:00Z',
      };

      render(<PaymentMethodCard paymentMethod={paypalMethod} />);

      expect(screen.getByText('Paypal')).toBeInTheDocument();
      expect(screen.getByText('PP')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply default class', () => {
      const { container } = render(
        <PaymentMethodCard paymentMethod={mockDefaultCardPaymentMethod} />,
      );

      expect(container.firstChild).toHaveClass('payment-method-card--default');
    });

    it('should accept custom className', () => {
      const { container } = render(
        <PaymentMethodCard paymentMethod={mockCardPaymentMethod} className="custom-class" />,
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should forward ref correctly', () => {
      const ref = vi.fn();

      render(<PaymentMethodCard ref={ref} paymentMethod={mockCardPaymentMethod} />);

      expect(ref).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper button types', () => {
      render(
        <PaymentMethodCard
          paymentMethod={mockCardPaymentMethod}
          onSetDefault={vi.fn()}
          onRemove={vi.fn()}
        />,
      );

      const setDefaultButton = screen.getByRole('button', { name: 'Set Default' });
      const removeButton = screen.getByRole('button', { name: 'Remove' });

      expect(setDefaultButton).toHaveAttribute('type', 'button');
      expect(removeButton).toHaveAttribute('type', 'button');
    });

    it('should have descriptive titles on buttons', () => {
      render(
        <PaymentMethodCard
          paymentMethod={mockCardPaymentMethod}
          onSetDefault={vi.fn()}
          onRemove={vi.fn()}
        />,
      );

      const removeButton = screen.getByRole('button', { name: 'Remove' });
      expect(removeButton).toHaveAttribute('title', 'Remove payment method');
    });
  });
});
