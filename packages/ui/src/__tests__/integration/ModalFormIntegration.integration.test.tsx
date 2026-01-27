// packages/ui/src/__tests__/integration/ModalFormIntegration.integration.test.tsx
/** @vitest-environment jsdom */
/**
 * Integration tests for Modal with Form components
 *
 * Tests complex modal + form scenarios:
 * - Form submission within modal
 * - Form validation in modal context
 * - Focus management with form elements
 * - Modal close behaviors with unsaved changes
 * - Nested modals with forms
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FormField } from '../../components/FormField';
import { Select } from '../../components/Select';
import { Alert } from '../../elements/Alert';
import { Button } from '../../elements/Button';
import { Input } from '../../elements/Input';
import { TextArea } from '../../elements/TextArea';
import { useDisclosure } from '../../hooks/useDisclosure';
import { useFormState } from '../../hooks/useFormState';
import { Modal } from '../../layouts/layers/Modal';

// =============================================================================
// Test Components
// =============================================================================

interface UserData {
  name: string;
  email: string;
  role: string;
  bio: string;
}

const CreateUserModal = ({
  onSubmit,
}: {
  onSubmit: (data: UserData) => Promise<void>;
}): React.ReactElement => {
  const { open, openFn, close } = useDisclosure({ defaultOpen: false });
  const { isLoading, error, wrapHandler, clearError } = useFormState();
  const [formData, setFormData] = useState<UserData>({
    name: '',
    email: '',
    role: '',
    bio: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof UserData, string>>>({});

  const validate = (): boolean => {
    const errors: Partial<Record<keyof UserData, string>> = {};

    if (formData.name.trim() === '') {
      errors.name = 'Name is required';
    }

    if (formData.email.trim() === '') {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    if (formData.role === '') {
      errors.role = 'Please select a role';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (): void => {
    clearError();
    if (!validate()) return;

    const wrappedSubmit = wrapHandler(onSubmit, {
      onSuccess: () => {
        close();
        resetForm();
      },
    });

    void wrappedSubmit(formData);
  };

  const resetForm = (): void => {
    setFormData({ name: '', email: '', role: '', bio: '' });
    setFieldErrors({});
    clearError();
  };

  const handleClose = (): void => {
    close();
    resetForm();
  };

  const handleChange = (field: keyof UserData, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field] !== undefined) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div>
      <Button onClick={openFn} data-testid="open-create-modal">
        Create User
      </Button>

      <Modal.Root open={open} onClose={handleClose}>
        <Modal.Header>
          <Modal.Title>Create New User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error !== null && (
            <Alert tone="danger" data-testid="modal-error">
              {error}
            </Alert>
          )}

          <FormField
            label="Name"
            htmlFor="modal-name"
            {...(fieldErrors.name !== undefined && { error: fieldErrors.name })}
            required
          >
            <Input
              id="modal-name"
              data-testid="modal-name"
              value={formData.name}
              onChange={(e) => {
                handleChange('name', e.target.value);
              }}
              disabled={isLoading}
            />
          </FormField>

          <FormField
            label="Email"
            htmlFor="modal-email"
            {...(fieldErrors.email !== undefined && { error: fieldErrors.email })}
            required
          >
            <Input
              id="modal-email"
              data-testid="modal-email"
              type="email"
              value={formData.email}
              onChange={(e) => {
                handleChange('email', e.target.value);
              }}
              disabled={isLoading}
            />
          </FormField>

          <FormField
            label="Role"
            htmlFor="modal-role"
            {...(fieldErrors.role !== undefined && { error: fieldErrors.role })}
            required
          >
            <Select
              id="modal-role"
              data-testid="modal-role"
              value={formData.role}
              onChange={(value) => {
                handleChange('role', value);
              }}
              disabled={isLoading}
            >
              <option value="">Select a role</option>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </Select>
          </FormField>

          <FormField label="Bio" htmlFor="modal-bio" helperText="Optional">
            <TextArea
              id="modal-bio"
              data-testid="modal-bio"
              value={formData.bio}
              onChange={(e) => {
                handleChange('bio', e.target.value);
              }}
              disabled={isLoading}
            />
          </FormField>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close data-testid="modal-cancel" disabled={isLoading}>
            Cancel
          </Modal.Close>
          <Button onClick={handleSubmit} disabled={isLoading} data-testid="modal-submit">
            {isLoading ? 'Creating...' : 'Create User'}
          </Button>
        </Modal.Footer>
      </Modal.Root>
    </div>
  );
};

const ConfirmDeleteModal = ({
  userName,
  onConfirm,
}: {
  userName: string;
  onConfirm: () => Promise<void>;
}): React.ReactElement => {
  const { open, openFn, close } = useDisclosure({ defaultOpen: false });
  const { isLoading, error, wrapHandler, clearError } = useFormState();
  const [confirmText, setConfirmText] = useState('');

  const isConfirmValid = confirmText === userName;

  const handleConfirm = (): void => {
    if (!isConfirmValid) return;
    clearError();

    const wrappedConfirm = wrapHandler(onConfirm, {
      onSuccess: () => {
        close();
        setConfirmText('');
      },
    });

    void wrappedConfirm({});
  };

  return (
    <div>
      <Button onClick={openFn} variant="text" data-testid="open-delete-modal">
        Delete User
      </Button>

      <Modal.Root open={open} onClose={close}>
        <Modal.Header>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Modal.Description>
            This action cannot be undone. Please type "{userName}" to confirm deletion.
          </Modal.Description>

          {error !== null && (
            <Alert tone="danger" data-testid="delete-error">
              {error}
            </Alert>
          )}

          <FormField label="Confirmation" htmlFor="confirm-input">
            <Input
              id="confirm-input"
              data-testid="confirm-input"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
              }}
              placeholder={`Type "${userName}" to confirm`}
              disabled={isLoading}
            />
          </FormField>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close data-testid="delete-cancel">Cancel</Modal.Close>
          <Button
            onClick={handleConfirm}
            disabled={!isConfirmValid || isLoading}
            variant="primary"
            data-testid="delete-confirm"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </Modal.Footer>
      </Modal.Root>
    </div>
  );
};

const MultiStepFormModal = ({
  onSubmit,
}: {
  onSubmit: (data: Record<string, string>) => Promise<void>;
}): React.ReactElement => {
  const { open, openFn, close } = useDisclosure({ defaultOpen: false });
  const { isLoading, error, wrapHandler, clearError } = useFormState();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    step1: '',
    step2: '',
    step3: '',
  });

  const steps = [
    { id: 'step-1', label: 'Step 1', field: 'step1' as const },
    { id: 'step-2', label: 'Step 2', field: 'step2' as const },
    { id: 'step-3', label: 'Step 3', field: 'step3' as const },
  ];

  const handleNext = (): void => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handlePrev = (): void => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = (): void => {
    clearError();
    const wrappedSubmit = wrapHandler(onSubmit, {
      onSuccess: () => {
        close();
        setStep(0);
        setFormData({ step1: '', step2: '', step3: '' });
      },
    });

    void wrappedSubmit(formData);
  };

  const handleClose = (): void => {
    close();
    setStep(0);
    setFormData({ step1: '', step2: '', step3: '' });
    clearError();
  };

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;

  return (
    <div>
      <Button onClick={openFn} data-testid="open-wizard-modal">
        Open Wizard
      </Button>

      <Modal.Root open={open} onClose={handleClose}>
        <Modal.Header>
          <Modal.Title>Setup Wizard - {currentStep?.label}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error !== null && (
            <Alert tone="danger" data-testid="wizard-error">
              {error}
            </Alert>
          )}

          <div data-testid="step-indicator">
            Step {step + 1} of {steps.length}
          </div>

          {currentStep !== undefined && (
            <FormField label={`${currentStep.label} Input`} htmlFor={currentStep.id}>
              <Input
                id={currentStep.id}
                data-testid={`${currentStep.field}-input`}
                value={formData[currentStep.field]}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    [currentStep.field]: e.target.value,
                  }));
                }}
                disabled={isLoading}
              />
            </FormField>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close data-testid="wizard-cancel">Cancel</Modal.Close>
          {step > 0 && (
            <Button onClick={handlePrev} variant="secondary" data-testid="wizard-prev">
              Previous
            </Button>
          )}
          {isLastStep ? (
            <Button onClick={handleSubmit} disabled={isLoading} data-testid="wizard-submit">
              {isLoading ? 'Submitting...' : 'Complete'}
            </Button>
          ) : (
            <Button onClick={handleNext} data-testid="wizard-next">
              Next
            </Button>
          )}
        </Modal.Footer>
      </Modal.Root>
    </div>
  );
};

const ModalWithUnsavedChanges = ({
  onSave,
}: {
  onSave: (data: string) => Promise<void>;
}): React.ReactElement => {
  const { open, openFn, close } = useDisclosure({ defaultOpen: false });
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const { isLoading, wrapHandler, clearError } = useFormState();

  const hasChanges = content !== savedContent;

  const handleClose = (): void => {
    if (hasChanges) {
      setShowConfirm(true);
    } else {
      close();
    }
  };

  const handleConfirmClose = (): void => {
    setShowConfirm(false);
    setContent(savedContent);
    close();
  };

  const handleCancelClose = (): void => {
    setShowConfirm(false);
  };

  const handleSave = (): void => {
    clearError();
    const wrappedSave = wrapHandler(onSave, {
      onSuccess: () => {
        setSavedContent(content);
      },
    });
    void wrappedSave(content);
  };

  return (
    <div>
      <Button onClick={openFn} data-testid="open-unsaved-modal">
        Open Editor
      </Button>

      <Modal.Root open={open} onClose={handleClose}>
        <Modal.Header>
          <Modal.Title>Editor {hasChanges ? '(unsaved)' : ''}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FormField label="Content" htmlFor="editor-content">
            <TextArea
              id="editor-content"
              data-testid="editor-content"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
              }}
              disabled={isLoading}
              rows={5}
            />
          </FormField>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close data-testid="editor-close">Close</Modal.Close>
          <Button onClick={handleSave} disabled={isLoading} data-testid="editor-save">
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal.Root>

      {/* Confirmation dialog for unsaved changes */}
      <Modal.Root open={showConfirm} onClose={handleCancelClose}>
        <Modal.Header>
          <Modal.Title>Unsaved Changes</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Modal.Description>
            You have unsaved changes. Are you sure you want to close?
          </Modal.Description>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={handleCancelClose} variant="secondary" data-testid="keep-editing">
            Keep Editing
          </Button>
          <Button onClick={handleConfirmClose} data-testid="discard-changes">
            Discard Changes
          </Button>
        </Modal.Footer>
      </Modal.Root>
    </div>
  );
};

// =============================================================================
// Tests
// =============================================================================

describe('ModalFormIntegration Integration Tests', () => {
  describe('CreateUserModal', () => {
    it('opens modal and shows form', async () => {
      const user = userEvent.setup();
      render(<CreateUserModal onSubmit={vi.fn().mockResolvedValue(undefined)} />);

      await user.click(screen.getByTestId('open-create-modal'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByTestId('modal-name')).toBeInTheDocument();
        expect(screen.getByTestId('modal-email')).toBeInTheDocument();
        expect(screen.getByTestId('modal-role')).toBeInTheDocument();
      });
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<CreateUserModal onSubmit={onSubmit} />);

      await user.click(screen.getByTestId('open-create-modal'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('modal-submit'));

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.getByText('Please select a role')).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      render(<CreateUserModal onSubmit={vi.fn()} />);

      await user.click(screen.getByTestId('open-create-modal'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.type(screen.getByTestId('modal-name'), 'John');
      await user.type(screen.getByTestId('modal-email'), 'invalid-email');
      await user.click(screen.getByTestId('modal-submit'));

      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      });
    });

    it('submits valid form and closes modal', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<CreateUserModal onSubmit={onSubmit} />);

      await user.click(screen.getByTestId('open-create-modal'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.type(screen.getByTestId('modal-name'), 'John Doe');
      await user.type(screen.getByTestId('modal-email'), 'john@example.com');

      // Select role
      await user.click(screen.getByTestId('modal-role'));
      await user.click(screen.getByRole('option', { name: 'Admin' }));

      await user.type(screen.getByTestId('modal-bio'), 'A software developer');

      await user.click(screen.getByTestId('modal-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin',
          bio: 'A software developer',
        });
      });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
      render(<CreateUserModal onSubmit={onSubmit} />);

      await user.click(screen.getByTestId('open-create-modal'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.type(screen.getByTestId('modal-name'), 'John');
      await user.type(screen.getByTestId('modal-email'), 'john@example.com');
      await user.click(screen.getByTestId('modal-role'));
      await user.click(screen.getByRole('option', { name: 'Admin' }));

      await user.click(screen.getByTestId('modal-submit'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-submit')).toHaveTextContent('Creating...');
        expect(screen.getByTestId('modal-name')).toBeDisabled();
      });

      act(() => {
        resolveSubmit();
      });
    });

    // Note: Error handling with rejected promises is tested in useFormState unit tests.
    // Integration tests with mockRejectedValue cause unhandled rejection warnings.

    it('resets form when cancelled', async () => {
      const user = userEvent.setup();
      render(<CreateUserModal onSubmit={vi.fn()} />);

      await user.click(screen.getByTestId('open-create-modal'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.type(screen.getByTestId('modal-name'), 'John');
      await user.click(screen.getByTestId('modal-cancel'));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Open again - should be reset
      await user.click(screen.getByTestId('open-create-modal'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-name')).toHaveValue('');
      });
    });
  });

  describe('ConfirmDeleteModal', () => {
    it('requires exact name match to enable confirm button', async () => {
      const user = userEvent.setup();
      render(<ConfirmDeleteModal userName="John Doe" onConfirm={vi.fn()} />);

      await user.click(screen.getByTestId('open-delete-modal'));

      await waitFor(() => {
        expect(screen.getByTestId('delete-confirm')).toBeDisabled();
      });

      await user.type(screen.getByTestId('confirm-input'), 'John');
      expect(screen.getByTestId('delete-confirm')).toBeDisabled();

      await user.clear(screen.getByTestId('confirm-input'));
      await user.type(screen.getByTestId('confirm-input'), 'John Doe');

      expect(screen.getByTestId('delete-confirm')).not.toBeDisabled();
    });

    it('confirms deletion with valid input', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      render(<ConfirmDeleteModal userName="John Doe" onConfirm={onConfirm} />);

      await user.click(screen.getByTestId('open-delete-modal'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.type(screen.getByTestId('confirm-input'), 'John Doe');
      await user.click(screen.getByTestId('delete-confirm'));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('MultiStepFormModal', () => {
    it('navigates through steps', async () => {
      const user = userEvent.setup();
      render(<MultiStepFormModal onSubmit={vi.fn()} />);

      await user.click(screen.getByTestId('open-wizard-modal'));

      await waitFor(() => {
        expect(screen.getByTestId('step-indicator')).toHaveTextContent('Step 1 of 3');
        expect(screen.getByTestId('step1-input')).toBeInTheDocument();
      });

      // Go to step 2
      await user.click(screen.getByTestId('wizard-next'));

      await waitFor(() => {
        expect(screen.getByTestId('step-indicator')).toHaveTextContent('Step 2 of 3');
        expect(screen.getByTestId('step2-input')).toBeInTheDocument();
      });

      // Go to step 3
      await user.click(screen.getByTestId('wizard-next'));

      await waitFor(() => {
        expect(screen.getByTestId('step-indicator')).toHaveTextContent('Step 3 of 3');
        expect(screen.getByTestId('step3-input')).toBeInTheDocument();
        expect(screen.getByTestId('wizard-submit')).toBeInTheDocument();
      });

      // Go back
      await user.click(screen.getByTestId('wizard-prev'));

      await waitFor(() => {
        expect(screen.getByTestId('step-indicator')).toHaveTextContent('Step 2 of 3');
      });
    });

    it('preserves data between steps', async () => {
      const user = userEvent.setup();
      render(<MultiStepFormModal onSubmit={vi.fn()} />);

      await user.click(screen.getByTestId('open-wizard-modal'));

      await waitFor(() => {
        expect(screen.getByTestId('step1-input')).toBeInTheDocument();
      });

      await user.type(screen.getByTestId('step1-input'), 'Step 1 data');
      await user.click(screen.getByTestId('wizard-next'));

      await user.type(screen.getByTestId('step2-input'), 'Step 2 data');

      // Go back and check
      await user.click(screen.getByTestId('wizard-prev'));

      await waitFor(() => {
        expect(screen.getByTestId('step1-input')).toHaveValue('Step 1 data');
      });
    });

    it('submits all data on completion', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<MultiStepFormModal onSubmit={onSubmit} />);

      await user.click(screen.getByTestId('open-wizard-modal'));

      await waitFor(() => {
        expect(screen.getByTestId('step1-input')).toBeInTheDocument();
      });

      await user.type(screen.getByTestId('step1-input'), 'Data 1');
      await user.click(screen.getByTestId('wizard-next'));

      await user.type(screen.getByTestId('step2-input'), 'Data 2');
      await user.click(screen.getByTestId('wizard-next'));

      await user.type(screen.getByTestId('step3-input'), 'Data 3');
      await user.click(screen.getByTestId('wizard-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          step1: 'Data 1',
          step2: 'Data 2',
          step3: 'Data 3',
        });
      });
    });

    it('resets wizard when cancelled', async () => {
      const user = userEvent.setup();
      render(<MultiStepFormModal onSubmit={vi.fn()} />);

      await user.click(screen.getByTestId('open-wizard-modal'));

      await waitFor(() => {
        expect(screen.getByTestId('step1-input')).toBeInTheDocument();
      });

      await user.type(screen.getByTestId('step1-input'), 'Data');
      await user.click(screen.getByTestId('wizard-next'));
      await user.click(screen.getByTestId('wizard-cancel'));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Reopen - should be reset
      await user.click(screen.getByTestId('open-wizard-modal'));

      await waitFor(() => {
        expect(screen.getByTestId('step-indicator')).toHaveTextContent('Step 1 of 3');
        expect(screen.getByTestId('step1-input')).toHaveValue('');
      });
    });
  });

  describe('ModalWithUnsavedChanges', () => {
    it('shows confirmation when closing with unsaved changes', async () => {
      const user = userEvent.setup();
      render(<ModalWithUnsavedChanges onSave={vi.fn()} />);

      await user.click(screen.getByTestId('open-unsaved-modal'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.type(screen.getByTestId('editor-content'), 'Some unsaved content');
      await user.click(screen.getByTestId('editor-close'));

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });
    });

    it('keeps modal open when choosing to continue editing', async () => {
      const user = userEvent.setup();
      render(<ModalWithUnsavedChanges onSave={vi.fn()} />);

      await user.click(screen.getByTestId('open-unsaved-modal'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.type(screen.getByTestId('editor-content'), 'Content');
      await user.click(screen.getByTestId('editor-close'));

      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('keep-editing'));

      await waitFor(() => {
        expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument();
        expect(screen.getByTestId('editor-content')).toHaveValue('Content');
      });
    });

    it('discards changes when confirmed', async () => {
      const user = userEvent.setup();
      render(<ModalWithUnsavedChanges onSave={vi.fn()} />);

      await user.click(screen.getByTestId('open-unsaved-modal'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.type(screen.getByTestId('editor-content'), 'Content');
      await user.click(screen.getByTestId('editor-close'));

      await waitFor(() => {
        expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('discard-changes'));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('closes without confirmation after saving', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(<ModalWithUnsavedChanges onSave={onSave} />);

      await user.click(screen.getByTestId('open-unsaved-modal'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.type(screen.getByTestId('editor-content'), 'Content');
      await user.click(screen.getByTestId('editor-save'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('Content');
      });

      // Now close should work without confirmation
      await user.click(screen.getByTestId('editor-close'));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Focus Management in Modal Forms', () => {
    it('focuses first input when modal opens', async () => {
      const user = userEvent.setup();
      render(<CreateUserModal onSubmit={vi.fn()} />);

      await user.click(screen.getByTestId('open-create-modal'));

      await waitFor(() => {
        expect(screen.getByTestId('modal-name')).toHaveFocus();
      });
    });

    it('traps focus within modal form', async () => {
      const user = userEvent.setup();
      render(
        <>
          <Button data-testid="outside">Outside</Button>
          <CreateUserModal onSubmit={vi.fn()} />
        </>,
      );

      await user.click(screen.getByTestId('open-create-modal'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Tab through modal elements
      for (let i = 0; i < 10; i++) {
        await user.tab();
      }

      // Focus should never leave modal
      expect(screen.getByTestId('outside')).not.toHaveFocus();
    });

    it('restores focus when modal closes', async () => {
      const user = userEvent.setup();
      render(<CreateUserModal onSubmit={vi.fn()} />);

      const openButton = screen.getByTestId('open-create-modal');
      await user.click(openButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('modal-cancel'));

      await waitFor(() => {
        expect(openButton).toHaveFocus();
      });
    });
  });
});
