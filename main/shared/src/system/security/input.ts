// main/shared/src/system/security/input.ts
/**
 * Shared input-security utilities.
 *
 * Pure helpers for sanitization and injection pattern detection.
 * These are framework-agnostic and can be reused across server/client tooling.
 */

function stripScriptBlocks(value: string): string {
  const lower = value.toLowerCase();
  let out = '';
  let i = 0;
  while (i < value.length) {
    if (lower.startsWith('<script', i) || lower.startsWith('</script', i)) {
      out += '&lt;';
      i++;
      continue;
    }
    out += value[i] as string;
    i++;
  }
  return out;
}

function isWordChar(code: number): boolean {
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 95
  );
}

function isWhitespace(code: number): boolean {
  return code === 9 || code === 10 || code === 13 || code === 32;
}

function stripEventHandlers(value: string): string {
  let out = '';
  let i = 0;
  while (i < value.length) {
    const first = value.charCodeAt(i);
    const second = value.charCodeAt(i + 1);
    if ((first === 79 || first === 111) && (second === 78 || second === 110)) {
      let j = i + 2;
      while (j < value.length && isWordChar(value.charCodeAt(j))) {
        j++;
      }
      if (j > i + 2) {
        let k = j;
        while (k < value.length && isWhitespace(value.charCodeAt(k))) {
          k++;
        }
        if (k < value.length && value.charCodeAt(k) === 61) {
          i = k + 1;
          continue;
        }
      }
    }
    out += value[i] as string;
    i++;
  }
  return out;
}

function stripDangerousSchemes(value: string): string {
  let output = '';
  let i = 0;
  while (i < value.length) {
    const code = value.charCodeAt(i);
    if (code === 58) {
      let j = output.length - 1;
      while (j >= 0 && isWhitespace(output.charCodeAt(j))) {
        j--;
      }

      let token = '';
      let tokenStart = j + 1;
      let k = j;
      while (k >= 0) {
        const charCode = output.charCodeAt(k);
        if ((charCode >= 65 && charCode <= 90) || (charCode >= 97 && charCode <= 122)) {
          token = `${String.fromCharCode(charCode).toLowerCase()}${token}`;
          tokenStart = k;
          k--;
          continue;
        }
        if (isWhitespace(charCode)) {
          k--;
          continue;
        }
        break;
      }

      if (token === 'javascript' || token === 'vbscript') {
        output = output.slice(0, tokenStart);
        i++;
        continue;
      }
    }

    output += value[i] as string;
    i++;
  }

  return output;
}

function isAllowedDataImagePrefix(lower: string, index: number): boolean {
  const allowedPrefixes = [
    'data:image/png',
    'data:image/jpg',
    'data:image/jpeg',
    'data:image/gif',
    'data:image/webp',
    'data:image/svg+xml',
  ];
  for (const prefix of allowedPrefixes) {
    if (lower.startsWith(prefix, index)) {
      return true;
    }
  }
  return false;
}

function stripDangerousDataUrls(value: string): string {
  let output = value;
  let lower = output.toLowerCase();
  let idx = lower.indexOf('data:');
  while (idx >= 0) {
    if (isAllowedDataImagePrefix(lower, idx)) {
      idx = lower.indexOf('data:', idx + 5);
      continue;
    }
    const comma = output.indexOf(',', idx);
    if (comma < 0) {
      output = output.slice(0, idx);
      return output;
    }
    output = output.slice(0, idx) + output.slice(comma + 1);
    lower = output.toLowerCase();
    idx = lower.indexOf('data:', idx);
  }
  return output;
}

/**
 * Sanitize string input to reduce XSS and injection payloads.
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';

  let filtered = '';
  const trimmed = input.trim();
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i] as string;
    const code = trimmed.charCodeAt(i);
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127)) {
      filtered += char;
    }
  }

  filtered = stripScriptBlocks(filtered);
  filtered = stripEventHandlers(filtered);
  filtered = stripDangerousSchemes(filtered);
  filtered = stripDangerousDataUrls(filtered);

  return filtered;
}

/**
 * SQL injection detection options.
 */
export interface SQLInjectionDetectionOptions {
  /**
   * Enable SQL injection detection.
   * Default: true.
   */
  enabled?: boolean;
}

/**
 * Check for potential SQL injection patterns.
 */
export function detectSQLInjection(
  input: string,
  options: SQLInjectionDetectionOptions = {},
): boolean {
  const { enabled = true } = options;

  if (!enabled) {
    return false;
  }

  const patterns = [
    /\bunion\s+(all\s+)?select\b/i,
    /\bselect\s+.+\s+from\s+/i,
    /\binsert\s+into\s+/i,
    /\bupdate\s+\S+\s+set\s+/i,
    /\bdelete\s+from\s+/i,
    /\bdrop\s+(table|database|index)\b/i,
    /(-{2}|\/\*|\*\/)/,
    /(\\x27|\\x2D\\x2D|\\x2F\\x2A|\\x2A\\x2F)/,
    /(\bor\b\s+\d+\s*=\s*\d+)/i,
    /(\band\b\s+\d+\s*=\s*\d+)/i,
    /'\s*(or|and)\s+['"\d]/i,
    /;\s*(select|insert|update|delete|drop|create|alter|exec|execute)\b/i,
  ];

  return patterns.some((pattern) => pattern.test(input));
}

/**
 * Check for potential NoSQL injection patterns.
 */
export function detectNoSQLInjection(input: unknown): boolean {
  if (typeof input === 'string') {
    const lower = input.toLowerCase();
    const markers = [
      '$',
      '{',
      '}',
      '[',
      ']',
      '$eq',
      '$ne',
      '$gt',
      '$gte',
      '$lt',
      '$lte',
      '$in',
      '$nin',
      '$and',
      '$or',
      '$not',
      '$nor',
      '$exists',
      '$type',
      '$regex',
      '$where',
      '$options',
    ];
    return markers.some((marker) => lower.includes(marker));
  }

  if (typeof input === 'object' && input !== null) {
    return Object.keys(input as Record<string, unknown>).some(
      (key) => key.startsWith('$') || ['__proto__', 'prototype', 'constructor'].includes(key),
    );
  }

  return false;
}

/**
 * Validate key names for incoming untrusted object payloads.
 */
export function isValidInputKeyName(key: string): boolean {
  return (
    /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) &&
    !['__proto__', 'prototype', 'constructor', 'tostring', 'valueof'].includes(key.toLowerCase())
  );
}
