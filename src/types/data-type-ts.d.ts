declare module 'data-type-ts' {
  export interface Validator<T> {
    validate(value: unknown): T;
  }

  export function string(): Validator<string>;
  export function number(): Validator<number>;
  export function boolean(): Validator<boolean>;
  export function object<T extends Record<string, Validator<any>>>(schema: T): Validator<{
    [K in keyof T]: T[K] extends Validator<infer U> ? U : never;
  }>;
  export function array<T>(itemValidator: Validator<T>): Validator<T[]>;
  export function optional<T>(validator: Validator<T>): Validator<T | undefined>;
  export function nullable<T>(validator: Validator<T>): Validator<T | null>;
} 