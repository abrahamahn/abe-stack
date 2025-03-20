/**
 * Type for validator functions
 */
export type Validator = (value: unknown) => string | null;

/**
 * Interface for validation rules
 */
export interface ValidationRule {
  field: string;
  rules: Validator[];
}
