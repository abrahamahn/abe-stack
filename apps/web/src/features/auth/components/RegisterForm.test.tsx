// apps/web/src/features/auth/components/RegisterForm.test.tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RegisterForm } from './RegisterForm';

vi.mock('@abe-stack/ui', () => {
  const mockButton = ({ children }: { children: React.ReactNode }) => <button>{children}</button>;
  const mockFormField = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const mockInput = () => <input />;
  const mockPasswordInput = () => <input type="password" />;
  const mockAlert = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    Button: mockButton,
    FormField: mockFormField,
    Input: mockInput,
    PasswordInput: mockPasswordInput,
    Alert: mockAlert,
  };
});

describe('RegisterForm', () => {
  it('should render', () => {
    const { container } = render(<RegisterForm onRegister={vi.fn()} isLoading={false} error={null} />);
    expect(container).toBeInTheDocument();
  });
});
