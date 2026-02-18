// main/apps/web/src/features/auth/hooks/useAuthFormState.ts
// Re-export from @bslt/react/hooks for backwards compatibility
import { useFormState, type FormState } from '@bslt/react/hooks';

/**
 * Auth-specific alias for useFormState.
 * @deprecated Use useFormState from @bslt/ui directly.
 */
export const useAuthFormState = useFormState;

/**
 * Auth-specific alias for FormState.
 * @deprecated Use FormState from @bslt/ui directly.
 */
export type AuthFormState = FormState;
