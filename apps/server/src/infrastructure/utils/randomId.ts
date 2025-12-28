import chunk from "lodash/chunk";
import md5 from "md5";
import { v4 as uuid } from "uuid";

/**
 * Generate a random UUID
 * @param seed Optional seed string to make the UUID deterministic
 * @returns A random UUID
 */
export function randomId(seed?: string): string {
  // When seed is provided, generate deterministic UUID
  if (seed) {
    const hash = md5(seed);
    const hexBytes = chunk(hash, 2).map((pair) => pair.join(""));
    // Convert to Uint8Array for compatibility with uuid
    const randomArray = new Uint8Array(16);
    hexBytes.slice(0, 16).forEach((hex, i) => {
      randomArray[i] = parseInt(hex, 16);
    });
    return uuid({ random: randomArray });
  }

  // Otherwise generate cryptographically secure random UUID
  const random = new Uint8Array(16);
  crypto.getRandomValues(random);
  return uuid({ random });
}
