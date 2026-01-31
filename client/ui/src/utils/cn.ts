// client/ui/src/utils/cn.ts

type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | ClassList
  | { [key: string]: boolean | null | undefined };

type ClassList = ClassValue[];

/**
 * Custom implementation of classNames utility to avoid dependencies.
 * Handles strings, numbers, arrays, and objects with boolean values.
 * Does NOT perform Tailwind class merging (conflict resolution).
 */
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  for (const arg of inputs) {
    if (arg === null || arg === undefined || arg === false) continue;

    if (typeof arg === 'string') {
      const trimmed = arg.trim();
      if (trimmed !== '') classes.push(trimmed); // Filter out whitespace-only strings
    } else if (typeof arg === 'number') {
      if (arg !== 0) classes.push(String(arg)); // Exclude 0 to match clsx behavior
    } else if (Array.isArray(arg)) {
      if (arg.length > 0) {
        const inner = cn(...arg);
        if (inner !== '') {
          classes.push(inner);
        }
      }
    } else if (typeof arg === 'object') {
      // Check for custom toString methods (e.g. not plain objects)
      const objArg = arg as Record<string, unknown>;

      // If it has a custom toString (not Object.prototype.toString), treat as string
      if (
        objArg.toString !== Object.prototype.toString &&
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        !String(objArg).includes('[object Object]')
      ) {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        classes.push(String(objArg));
        continue;
      }

      // Plain object: iterate keys
      // Cast to Record<string, unknown> and verify values are truthy
      const obj = arg as Record<string, unknown>;
      for (const key of Object.keys(obj)) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && (obj[key] as boolean)) {
          classes.push(key);
        }
      }
    }
    // Functions are ignored based on previous logic, which seems correct for 'btn' vs 'btn function'
  }

  return classes.join(' ');
}
