// Define the Validator interface
export interface Validator<T> {
  validate(value: unknown): T;
} 