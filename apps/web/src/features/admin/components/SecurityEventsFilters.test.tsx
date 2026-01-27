// apps/web/src/features/admin/components/SecurityEventsFilters.test.tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { SecurityEventsFilters } from './SecurityEventsFilters';

import type { SecurityEventsFilter } from '@abe-stack/core';

// ============================================================================
// Tests
// ============================================================================

describe('SecurityEventsFilters', () => {
  const mockOnFilterChange = vi.fn();
  const emptyFilter: SecurityEventsFilter = {};

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render event type select', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      expect(screen.getByLabelText('Event Type')).toBeInTheDocument();
    });

    it('should render severity select', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      expect(screen.getByLabelText('Severity')).toBeInTheDocument();
    });

    it('should render email input', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('should render IP address input', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      expect(screen.getByLabelText('IP Address')).toBeInTheDocument();
    });

    it('should render start date input', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    });

    it('should render end date input', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    });

    it('should render user ID input', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      expect(screen.getByLabelText('User ID')).toBeInTheDocument();
    });

    it('should render apply filters button', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      expect(screen.getByRole('button', { name: 'Apply Filters' })).toBeInTheDocument();
    });

    it('should render clear button', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    });
  });

  describe('event type filter', () => {
    it('should display current event type value', () => {
      const filter: SecurityEventsFilter = {
        eventType: 'login_failed',
      };

      render(<SecurityEventsFilters filter={filter} onFilterChange={mockOnFilterChange} />);

      const select = screen.getByLabelText('Event Type');
      expect(select).toHaveValue('login_failed');
    });

    it('should update local state when event type is changed', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      const select = screen.getByLabelText('Event Type');
      fireEvent.change(select, { target: { value: 'account_locked' } });

      expect(select).toHaveValue('account_locked');
    });
  });

  describe('severity filter', () => {
    it('should display current severity value', () => {
      const filter: SecurityEventsFilter = {
        severity: 'high',
      };

      render(<SecurityEventsFilters filter={filter} onFilterChange={mockOnFilterChange} />);

      const select = screen.getByLabelText('Severity');
      expect(select).toHaveValue('high');
    });

    it('should update local state when severity is changed', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      const select = screen.getByLabelText('Severity');
      fireEvent.change(select, { target: { value: 'critical' } });

      expect(select).toHaveValue('critical');
    });
  });

  describe('email filter', () => {
    it('should display current email value', () => {
      const filter: SecurityEventsFilter = {
        email: 'test@example.com',
      };

      render(<SecurityEventsFilters filter={filter} onFilterChange={mockOnFilterChange} />);

      const input = screen.getByLabelText('Email');
      expect(input).toHaveValue('test@example.com');
    });

    it('should update local state when email is typed', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      const input = screen.getByLabelText('Email');
      fireEvent.change(input, { target: { value: 'user@test.com' } });

      expect(input).toHaveValue('user@test.com');
    });
  });

  describe('IP address filter', () => {
    it('should display current IP address value', () => {
      const filter: SecurityEventsFilter = {
        ipAddress: '192.168.1.1',
      };

      render(<SecurityEventsFilters filter={filter} onFilterChange={mockOnFilterChange} />);

      const input = screen.getByLabelText('IP Address');
      expect(input).toHaveValue('192.168.1.1');
    });

    it('should update local state when IP address is typed', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      const input = screen.getByLabelText('IP Address');
      fireEvent.change(input, { target: { value: '10.0.0.1' } });

      expect(input).toHaveValue('10.0.0.1');
    });
  });

  describe('date filters', () => {
    it('should display current start date value', () => {
      const filter: SecurityEventsFilter = {
        startDate: '2024-01-01T00:00:00',
      };

      render(<SecurityEventsFilters filter={filter} onFilterChange={mockOnFilterChange} />);

      const input = screen.getByLabelText('Start Date');
      expect(input).toHaveValue('2024-01-01T00:00:00');
    });

    it('should display current end date value', () => {
      const filter: SecurityEventsFilter = {
        endDate: '2024-01-31T23:59:59',
      };

      render(<SecurityEventsFilters filter={filter} onFilterChange={mockOnFilterChange} />);

      const input = screen.getByLabelText('End Date');
      expect(input).toHaveValue('2024-01-31T23:59:59');
    });

    it('should update local state when start date is changed', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      const input = screen.getByLabelText('Start Date');
      fireEvent.change(input, { target: { value: '2024-02-01T00:00:00' } });

      expect(input).toHaveValue('2024-02-01T00:00:00');
    });

    it('should update local state when end date is changed', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      const input = screen.getByLabelText('End Date');
      fireEvent.change(input, { target: { value: '2024-02-28T23:59:59' } });

      expect(input).toHaveValue('2024-02-28T23:59:59');
    });
  });

  describe('user ID filter', () => {
    it('should display current user ID value', () => {
      const filter: SecurityEventsFilter = {
        userId: 'user-123',
      };

      render(<SecurityEventsFilters filter={filter} onFilterChange={mockOnFilterChange} />);

      const input = screen.getByLabelText('User ID');
      expect(input).toHaveValue('user-123');
    });

    it('should update local state when user ID is typed', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      const input = screen.getByLabelText('User ID');
      fireEvent.change(input, { target: { value: 'user-456' } });

      expect(input).toHaveValue('user-456');
    });
  });

  describe('applying filters', () => {
    it('should call onFilterChange with updated filters when apply is clicked', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      const eventTypeSelect = screen.getByLabelText('Event Type');
      fireEvent.change(eventTypeSelect, { target: { value: 'login_failed' } });

      const applyButton = screen.getByRole('button', { name: 'Apply Filters' });
      fireEvent.click(applyButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        eventType: 'login_failed',
      });
    });

    it('should call onFilterChange with multiple filters', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      const eventTypeSelect = screen.getByLabelText('Event Type');
      fireEvent.change(eventTypeSelect, { target: { value: 'account_locked' } });

      const severitySelect = screen.getByLabelText('Severity');
      fireEvent.change(severitySelect, { target: { value: 'critical' } });

      const emailInput = screen.getByLabelText('Email');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      const applyButton = screen.getByRole('button', { name: 'Apply Filters' });
      fireEvent.click(applyButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        eventType: 'account_locked',
        severity: 'critical',
        email: 'test@example.com',
      });
    });

    it('should not include undefined values in filter', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      const eventTypeSelect = screen.getByLabelText('Event Type');
      fireEvent.change(eventTypeSelect, { target: { value: 'login_failed' } });

      const applyButton = screen.getByRole('button', { name: 'Apply Filters' });
      fireEvent.click(applyButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith({
        eventType: 'login_failed',
      });
    });

    it('should not include empty string values in filter', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      const emailInput = screen.getByLabelText('Email');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(emailInput, { target: { value: '' } });

      const applyButton = screen.getByRole('button', { name: 'Apply Filters' });
      fireEvent.click(applyButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith({});
    });
  });

  describe('clearing filters', () => {
    it('should call onFilterChange with empty filter when clear is clicked', () => {
      const filter: SecurityEventsFilter = {
        eventType: 'login_failed',
        severity: 'high',
        email: 'test@example.com',
      };

      render(<SecurityEventsFilters filter={filter} onFilterChange={mockOnFilterChange} />);

      const clearButton = screen.getByRole('button', { name: 'Clear' });
      fireEvent.click(clearButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith({});
    });

    it('should reset all form inputs when clear is clicked', () => {
      const filter: SecurityEventsFilter = {
        eventType: 'login_failed',
        severity: 'high',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
      };

      render(<SecurityEventsFilters filter={filter} onFilterChange={mockOnFilterChange} />);

      const clearButton = screen.getByRole('button', { name: 'Clear' });
      fireEvent.click(clearButton);

      const eventTypeSelect = screen.getByLabelText('Event Type');
      const severitySelect = screen.getByLabelText('Severity');
      const emailInput = screen.getByLabelText('Email');
      const ipInput = screen.getByLabelText('IP Address');

      expect(eventTypeSelect).toHaveValue('');
      expect(severitySelect).toHaveValue('');
      expect(emailInput).toHaveValue('');
      expect(ipInput).toHaveValue('');
    });
  });

  describe('edge cases', () => {
    it('should handle filter with all fields populated', () => {
      const filter: SecurityEventsFilter = {
        eventType: 'login_failed',
        severity: 'critical',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        startDate: '2024-01-01T00:00:00',
        endDate: '2024-01-31T23:59:59',
        userId: 'user-123',
      };

      render(<SecurityEventsFilters filter={filter} onFilterChange={mockOnFilterChange} />);

      expect(screen.getByLabelText('Event Type')).toHaveValue('login_failed');
      expect(screen.getByLabelText('Severity')).toHaveValue('critical');
      expect(screen.getByLabelText('Email')).toHaveValue('test@example.com');
      expect(screen.getByLabelText('IP Address')).toHaveValue('192.168.1.1');
      expect(screen.getByLabelText('User ID')).toHaveValue('user-123');
    });

    it('should handle undefined filter values', () => {
      render(<SecurityEventsFilters filter={emptyFilter} onFilterChange={mockOnFilterChange} />);

      expect(screen.getByLabelText('Event Type')).toHaveValue('');
      expect(screen.getByLabelText('Severity')).toHaveValue('');
      expect(screen.getByLabelText('Email')).toHaveValue('');
    });
  });
});
