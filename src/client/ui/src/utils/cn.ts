// src/client/ui/src/utils/cn.ts
/**
 * Lightweight class name utility.
 *
 * Merges class name values from strings, numbers, arrays, and conditional
 * object maps into a single space-separated string. Intentionally does
 * **not** perform Tailwind class conflict resolution -- it is a simple
 * concatenation utility similar to `clsx`.
 */

/**
 * A value (or nested structure of values) that can be resolved to CSS class names.
 *
 * Accepted shapes:
 * - `string` -- used directly
 * - `number` -- converted to string (0 is falsy and skipped)
 * - `boolean | null | undefined` -- falsy values are skipped
 * - `ClassValue[]` -- recursively flattened
 * - `Record<string, unknown>` -- keys with truthy values are included
 */
export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[]
  | { [className: string]: unknown };

/**
 * Recursively resolves a single {@link ClassValue} and pushes resulting
 * class name strings into the output array.
 *
 * @param value - A class value to resolve
 * @param out - Mutable accumulator array that collects class name strings
 */
function toClassName(value: ClassValue, out: string[]): void {
  if (value === null || value === undefined || value === false || value === '' || value === 0) {
    return;
  }

  if (typeof value === 'string') {
    if (value !== '') out.push(value);
    return;
  }

  if (typeof value === 'number') {
    // `0` is falsy and already filtered above.
    out.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    for (const v of value) toClassName(v, out);
    return;
  }

  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined && v !== null && v !== false && v !== '' && v !== 0) {
        out.push(k);
      }
    }
  }
}

/**
 * Merges multiple class value inputs into a single space-separated string.
 *
 * Falsy values (`false`, `null`, `undefined`, `0`, `''`) are ignored.
 * Arrays are recursively flattened. Object keys are included when their
 * values are truthy.
 *
 * @param inputs - Any number of class values to merge
 * @returns A space-separated class name string
 *
 * @example
 * ```ts
 * cn('btn', isActive && 'btn-active', ['extra', { hidden: false }]);
 * // "btn btn-active extra"
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const v of inputs) toClassName(v, out);
  return out.join(' ');
}
