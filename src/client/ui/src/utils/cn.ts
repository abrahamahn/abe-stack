// src/client/ui/src/utils/cn.ts
// Intentionally does NOT perform Tailwind class conflict resolution.
export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[]
  | { [className: string]: unknown };

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

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const v of inputs) toClassName(v, out);
  return out.join(' ');
}
