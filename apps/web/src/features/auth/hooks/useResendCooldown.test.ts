// apps/web/src/features/auth/hooks/__tests__/useResendCooldown.test.ts
import { useResendCooldown as uiUseResendCooldown } from '@abe-stack/ui';
import { describe, expect, it } from 'vitest';

import { useResendCooldown } from '../useResendCooldown';

import type { UseResendCooldownReturn } from '../useResendCooldown';
import type { UseResendCooldownReturn as UIUseResendCooldownReturn } from '@abe-stack/ui';

describe('useResendCooldown', () => {
  it('is a re-export of useResendCooldown from @abe-stack/ui', () => {
    expect(useResendCooldown).toBe(uiUseResendCooldown);
  });

  it('has the expected function signature', () => {
    expect(typeof useResendCooldown).toBe('function');
  });
});

describe('UseResendCooldownReturn type', () => {
  it('is compatible with UseResendCooldownReturn from @abe-stack/ui', () => {
    // Type-level test: types should be compatible
    const cooldownReturn: UIUseResendCooldownReturn = {
      cooldown: 0,
      isOnCooldown: false,
      startCooldown: () => undefined,
      resetCooldown: () => undefined,
    };

    // This assignment should compile without error
    const localReturn: UseResendCooldownReturn = cooldownReturn;
    const backToUI: UIUseResendCooldownReturn = localReturn;

    expect(localReturn).toEqual(cooldownReturn);
    expect(backToUI).toEqual(localReturn);
  });
});
