// main/shared/src/domain/auth/auth.password-patterns.ts

import { COMMON_PASSWORDS, KEYBOARD_PATTERNS } from '../../primitives/constants';

/**
 * Check for repeated characters (e.g., "aaa", "111")
 */
export function hasRepeatedChars(password: string, minLength = 3): boolean {
  const regex = new RegExp(`(.)\\1{${String(minLength - 1)},}`);
  return regex.test(password);
}

/**
 * Check for sequential characters (e.g., "abc", "123")
 */
export function hasSequentialChars(password: string, minLength = 3): boolean {
  const lower = password.toLowerCase();
  for (let i = 0; i <= lower.length - minLength; i++) {
    let isSequence = true;
    let isReverseSequence = true;

    for (let j = 1; j < minLength; j++) {
      if (lower.charCodeAt(i + j) !== lower.charCodeAt(i + j - 1) + 1) {
        isSequence = false;
      }
      if (lower.charCodeAt(i + j) !== lower.charCodeAt(i + j - 1) - 1) {
        isReverseSequence = false;
      }
    }

    if (isSequence || isReverseSequence) {
      return true;
    }
  }
  return false;
}

/**
 * Check for keyboard patterns
 */
export function hasKeyboardPattern(password: string): boolean {
  const lower = password.toLowerCase();
  return KEYBOARD_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Check if password is a common password or variation
 */
export function isCommonPassword(password: string): boolean {
  const lower = password.toLowerCase();

  // Direct match
  if (COMMON_PASSWORDS.has(lower)) {
    return true;
  }

  // Common substitutions (l33t speak)
  const normalized = lower
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/!/g, 'i');

  if (COMMON_PASSWORDS.has(normalized)) {
    return true;
  }

  // Check without trailing numbers
  let trimIndex = lower.length;
  while (trimIndex > 0) {
    const code = lower.charCodeAt(trimIndex - 1);
    if (code < 48 || code > 57) break;
    trimIndex--;
  }
  const withoutTrailingNumbers = lower.slice(0, trimIndex);
  if (withoutTrailingNumbers.length >= 4 && COMMON_PASSWORDS.has(withoutTrailingNumbers)) {
    return true;
  }

  return false;
}

/**
 * Check if password contains user inputs
 */
export function containsUserInput(password: string, userInputs: string[]): boolean {
  const lower = password.toLowerCase();
  return userInputs.some((input) => {
    const inputLower = input.toLowerCase();
    return inputLower.length >= 3 && lower.includes(inputLower);
  });
}
