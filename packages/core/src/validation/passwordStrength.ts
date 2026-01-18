// packages/core/src/validation/passwordStrength.ts
/**
 * Password Strength Estimation
 *
 * Lightweight replacement for zxcvbn. Provides:
 * - Score (0-4) based on entropy and patterns
 * - Feedback with warnings and suggestions
 * - Crack time estimates
 */

// ============================================================================
// Types
// ============================================================================

export interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  feedback: {
    warning: string;
    suggestions: string[];
  };
  crackTimeDisplay: string;
  entropy: number;
}

// ============================================================================
// Common Passwords (Top 200 most common)
// ============================================================================

const COMMON_PASSWORDS = new Set([
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

// ============================================================================
// Keyboard Patterns
// ============================================================================

const KEYBOARD_PATTERNS = [
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

// ============================================================================
// Pattern Detection
// ============================================================================

/**
 * Check for repeated characters (e.g., "aaa", "111")
 */
function hasRepeatedChars(password: string, minLength = 3): boolean {
  const regex = new RegExp(`(.)\\1{${String(minLength - 1)},}`);
  return regex.test(password);
}

/**
 * Check for sequential characters (e.g., "abc", "123")
 */
function hasSequentialChars(password: string, minLength = 3): boolean {
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
function hasKeyboardPattern(password: string): boolean {
  const lower = password.toLowerCase();
  return KEYBOARD_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Check if password is a common password or variation
 */
function isCommonPassword(password: string): boolean {
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
function containsUserInput(password: string, userInputs: string[]): boolean {
  const lower = password.toLowerCase();
  return userInputs.some((input) => {
    const inputLower = input.toLowerCase();
    return inputLower.length >= 3 && lower.includes(inputLower);
  });
}

// ============================================================================
// Entropy Calculation
// ============================================================================

/**
 * Calculate character set size based on password composition
 */
function getCharsetSize(password: string): number {
  let size = 0;

  if (/[a-z]/.test(password)) size += 26;
  if (/[A-Z]/.test(password)) size += 26;
  if (/[0-9]/.test(password)) size += 10;
  if (/[^a-zA-Z0-9]/.test(password)) size += 32; // Common symbols

  return size || 1;
}

/**
 * Calculate entropy in bits
 */
function calculateEntropy(password: string): number {
  const charsetSize = getCharsetSize(password);
  return password.length * Math.log2(charsetSize);
}

// ============================================================================
// Crack Time Estimation
// ============================================================================

/**
 * Estimate crack time based on entropy
 * Assumes offline slow hashing (10,000 guesses/second)
 */
function estimateCrackTime(entropy: number): { seconds: number; display: string } {
  // 10^4 guesses per second (offline slow hashing like bcrypt)
  const guessesPerSecond = 10000;
  const possibleCombinations = Math.pow(2, entropy);
  const seconds = possibleCombinations / guessesPerSecond / 2; // Average case

  // Format display
  if (seconds < 1) {
    return { seconds, display: 'less than a second' };
  }
  if (seconds < 60) {
    return { seconds, display: `${String(Math.round(seconds))} seconds` };
  }
  if (seconds < 3600) {
    return { seconds, display: `${String(Math.round(seconds / 60))} minutes` };
  }
  if (seconds < 86400) {
    return { seconds, display: `${String(Math.round(seconds / 3600))} hours` };
  }
  if (seconds < 2592000) {
    return { seconds, display: `${String(Math.round(seconds / 86400))} days` };
  }
  if (seconds < 31536000) {
    return { seconds, display: `${String(Math.round(seconds / 2592000))} months` };
  }
  if (seconds < 3153600000) {
    return { seconds, display: `${String(Math.round(seconds / 31536000))} years` };
  }
  return { seconds, display: 'centuries' };
}

// ============================================================================
// Score Calculation
// ============================================================================

/**
 * Calculate password strength score (0-4)
 */
function calculateScore(
  entropy: number,
  penalties: {
    isCommon: boolean;
    hasRepeats: boolean;
    hasSequence: boolean;
    hasKeyboard: boolean;
    containsInput: boolean;
  },
): 0 | 1 | 2 | 3 | 4 {
  // Apply entropy penalties for patterns
  let adjustedEntropy = entropy;

  if (penalties.isCommon) adjustedEntropy *= 0.1;
  if (penalties.hasRepeats) adjustedEntropy *= 0.7;
  if (penalties.hasSequence) adjustedEntropy *= 0.7;
  if (penalties.hasKeyboard) adjustedEntropy *= 0.5;
  if (penalties.containsInput) adjustedEntropy *= 0.5;

  // Score thresholds based on adjusted entropy
  if (adjustedEntropy < 20) return 0;
  if (adjustedEntropy < 35) return 1;
  if (adjustedEntropy < 50) return 2;
  if (adjustedEntropy < 65) return 3;
  return 4;
}

// ============================================================================
// Feedback Generation
// ============================================================================

/**
 * Generate feedback based on detected patterns
 */
function generateFeedback(
  password: string,
  penalties: {
    isCommon: boolean;
    hasRepeats: boolean;
    hasSequence: boolean;
    hasKeyboard: boolean;
    containsInput: boolean;
  },
): { warning: string; suggestions: string[] } {
  const suggestions: string[] = [];
  let warning = '';

  if (penalties.isCommon) {
    warning = 'This is a commonly used password.';
    suggestions.push('Avoid common passwords');
  }

  if (penalties.containsInput) {
    warning = warning || 'This password contains personal information.';
    suggestions.push('Avoid using personal information in passwords');
  }

  if (penalties.hasKeyboard) {
    warning = warning || 'This password uses a keyboard pattern.';
    suggestions.push('Avoid keyboard patterns like "qwerty" or "asdf"');
  }

  if (penalties.hasSequence) {
    warning = warning || 'This password contains sequential characters.';
    suggestions.push('Avoid sequential characters like "abc" or "123"');
  }

  if (penalties.hasRepeats) {
    warning = warning || 'This password has repeated characters.';
    suggestions.push('Avoid repeated characters like "aaa"');
  }

  // General suggestions based on password composition
  if (!/[A-Z]/.test(password)) {
    suggestions.push('Add uppercase letters');
  }
  if (!/[a-z]/.test(password)) {
    suggestions.push('Add lowercase letters');
  }
  if (!/[0-9]/.test(password)) {
    suggestions.push('Add numbers');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    suggestions.push('Add symbols');
  }
  if (password.length < 12) {
    suggestions.push('Make the password longer');
  }

  // Limit suggestions
  return {
    warning,
    suggestions: suggestions.slice(0, 3),
  };
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Estimate password strength
 *
 * @param password - Password to analyze
 * @param userInputs - Optional user-specific words to penalize (email, name, etc.)
 * @returns StrengthResult with score, feedback, and crack time estimate
 */
export function estimatePasswordStrength(
  password: string,
  userInputs: string[] = [],
): StrengthResult {
  // Calculate base entropy
  const entropy = calculateEntropy(password);

  // Detect patterns
  const penalties = {
    isCommon: isCommonPassword(password),
    hasRepeats: hasRepeatedChars(password),
    hasSequence: hasSequentialChars(password),
    hasKeyboard: hasKeyboardPattern(password),
    containsInput: containsUserInput(password, userInputs),
  };

  // Calculate score
  const score = calculateScore(entropy, penalties);

  // Generate feedback
  const feedback = generateFeedback(password, penalties);

  // Estimate crack time
  const crackTime = estimateCrackTime(entropy);

  return {
    score,
    feedback,
    crackTimeDisplay: crackTime.display,
    entropy,
  };
}
