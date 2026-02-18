// main/apps/web/src/features/onboarding/hooks/useOnboarding.test.ts
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TOTAL_STEPS, useOnboarding } from './useOnboarding';

// Mock useLocalStorage from @bslt/react/hooks
let storedValue = false;
const mockSetValue = vi.fn((value: boolean | ((prev: boolean) => boolean)) => {
  if (typeof value === 'function') {
    storedValue = value(storedValue);
  } else {
    storedValue = value;
  }
});

vi.mock('@bslt/react/hooks', async () => {
  const actual = await vi.importActual('@bslt/react/hooks');
  return {
    ...actual,
    useLocalStorage: () => [storedValue, mockSetValue],
  };
});

describe('useOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storedValue = false;
  });

  it('should start at step 1', () => {
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.currentStep).toBe(1);
  });

  it('should have correct total steps', () => {
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.totalSteps).toBe(TOTAL_STEPS);
    expect(result.current.totalSteps).toBe(3);
  });

  it('should report isFirstStep correctly', () => {
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.isFirstStep).toBe(true);
    expect(result.current.isLastStep).toBe(false);
  });

  it('should start with empty form data', () => {
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.formData.workspaceName).toBe('');
    expect(result.current.formData.inviteEmail).toBe('');
  });

  it('should update form fields', () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => {
      result.current.updateField('workspaceName', 'My Team');
    });
    expect(result.current.formData.workspaceName).toBe('My Team');
  });

  it('should update invite email field', () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => {
      result.current.updateField('inviteEmail', 'user@example.com');
    });
    expect(result.current.formData.inviteEmail).toBe('user@example.com');
  });

  it('should move to next step', () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => {
      result.current.nextStep();
    });
    expect(result.current.currentStep).toBe(2);
  });

  it('should move to step 3', () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => {
      result.current.nextStep();
    });
    act(() => {
      result.current.nextStep();
    });
    expect(result.current.currentStep).toBe(3);
    expect(result.current.isLastStep).toBe(true);
  });

  it('should not exceed total steps', () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => {
      result.current.nextStep();
      result.current.nextStep();
      result.current.nextStep();
      result.current.nextStep();
    });
    expect(result.current.currentStep).toBe(3);
  });

  it('should go to previous step', () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => {
      result.current.nextStep();
    });
    expect(result.current.currentStep).toBe(2);
    act(() => {
      result.current.prevStep();
    });
    expect(result.current.currentStep).toBe(1);
  });

  it('should not go below step 1', () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => {
      result.current.prevStep();
    });
    expect(result.current.currentStep).toBe(1);
  });

  it('should skip to next step', () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => {
      result.current.skipStep();
    });
    expect(result.current.currentStep).toBe(2);
  });

  it('should report isCompleted from localStorage', () => {
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.isCompleted).toBe(false);
  });

  it('should mark onboarding as completed', () => {
    const { result } = renderHook(() => useOnboarding());
    act(() => {
      result.current.completeOnboarding();
    });
    expect(mockSetValue).toHaveBeenCalledWith(true);
  });

  it('should reset onboarding state', () => {
    const { result } = renderHook(() => useOnboarding());
    // Advance and fill form
    act(() => {
      result.current.nextStep();
      result.current.updateField('workspaceName', 'Test');
      result.current.updateField('inviteEmail', 'test@test.com');
    });
    expect(result.current.currentStep).toBe(2);
    expect(result.current.formData.workspaceName).toBe('Test');

    // Reset
    act(() => {
      result.current.resetOnboarding();
    });
    expect(result.current.currentStep).toBe(1);
    expect(result.current.formData.workspaceName).toBe('');
    expect(result.current.formData.inviteEmail).toBe('');
    expect(mockSetValue).toHaveBeenCalledWith(false);
  });

  it('should report isFirstStep and isLastStep correctly across steps', () => {
    const { result } = renderHook(() => useOnboarding());

    // Step 1
    expect(result.current.isFirstStep).toBe(true);
    expect(result.current.isLastStep).toBe(false);

    // Step 2
    act(() => {
      result.current.nextStep();
    });
    expect(result.current.isFirstStep).toBe(false);
    expect(result.current.isLastStep).toBe(false);

    // Step 3
    act(() => {
      result.current.nextStep();
    });
    expect(result.current.isFirstStep).toBe(false);
    expect(result.current.isLastStep).toBe(true);
  });
});
