// apps/web/src/features/auth/hooks/useAuthFormState.ts
// Re-export from @abe-stack/ui for backwards compatibility
import { useFormState } from '@abe-stack/ui';

import type { FormState } from '@abe-stack/ui';

/**
 * Auth-specific alias for useFormState.
 * @deprecated Use useFormState from @abe-stack/ui directly.
 */
export const useAuthFormState = useFormState;

/**
 * Auth-specific alias for FormState.
 * @deprecated Use FormState from @abe-stack/ui directly.
 */
export type AuthFormState = FormState;
