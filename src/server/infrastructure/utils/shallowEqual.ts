import intersection from "lodash/intersection";
import isArray from "lodash/isArray";
import isPlainObject from "lodash/isPlainObject";

export function shallowEqual(a: unknown, b: unknown): boolean {
  if (a == b) return true;
  if (isArray(a)) {
    if (!isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((x, i) => b[i] === x);
  }
  if (isPlainObject(a)) {
    if (!isPlainObject(b)) return false;
    const keys = Object.keys(a as object);
    const sameKeys = intersection(keys, Object.keys(b as object));
    if (keys.length !== sameKeys.length) return false;
    return keys.every(
      (key) =>
        (a as Record<string, unknown>)[key] ==
        (b as Record<string, unknown>)[key],
    );
  }
  return false;
}
