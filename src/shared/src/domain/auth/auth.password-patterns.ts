// src/shared/src/domain/auth/auth.password-patterns.ts

/**
 * Common Passwords (Top 200 most common)
 */
export const COMMON_PASSWORDS = new Set([
  'password',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'monkey',
  '1234567',
  'letmein',
  'trustno1',
  'dragon',
  'baseball',
  'iloveyou',
  'master',
  'sunshine',
  'ashley',
  'bailey',
  'shadow',
  '123123',
  '654321',
  'superman',
  'qazwsx',
  'michael',
  'football',
  'password1',
  'password123',
  'batman',
  'login',
  'admin',
  'princess',
  'welcome',
  'solo',
  'passw0rd',
  'starwars',
  'hello',
  'charlie',
  'donald',
  'hunter',
  'jennifer',
  'jordan',
  'joshua',
  'maggie',
  'andrew',
  'nicole',
  'jessica',
  'michelle',
  'daniel',
  'matthew',
  'anthony',
  'william',
  'soccer',
  'cheese',
  'winter',
  'summer',
  'spring',
  'autumn',
  'orange',
  'purple',
  'access',
  'secret',
  'internet',
  'computer',
  'google',
  'yahoo',
  'facebook',
  'twitter',
  'linkedin',
  'myspace',
  'pepper',
  'killer',
  'george',
  'zxcvbn',
  'qwerty123',
  'asdf',
  'asdfgh',
  'zxcvb',
  'zxcvbnm',
  '111111',
  '000000',
  '121212',
  '1q2w3e',
  '1q2w3e4r',
  '1qaz2wsx',
  'q1w2e3r4',
  'abcdef',
  'abcd1234',
  'test',
  'test123',
  'guest',
  'master123',
  'changeme',
  'default',
  'root',
  'toor',
  'pass',
  'temp',
  'temp123',
  'password12',
  'password1234',
  'qwerty1',
  'qwerty12',
  'letmein1',
]);

/**
 * Keyboard Patterns
 */
export const KEYBOARD_PATTERNS = [
  'qwerty',
  'qwertyuiop',
  'asdf',
  'asdfgh',
  'asdfghjkl',
  'zxcv',
  'zxcvb',
  'zxcvbn',
  'zxcvbnm',
  '1234',
  '12345',
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  '0987654321',
  '987654321',
  '87654321',
  '7654321',
  '654321',
  '54321',
  '4321',
  'qazwsx',
  'qaz',
  'wsx',
  'edc',
  'rfv',
  'tgb',
  'yhn',
  'ujm',
];

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
  const withoutTrailingNumbers = lower.replace(/\d+$/, '');
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
