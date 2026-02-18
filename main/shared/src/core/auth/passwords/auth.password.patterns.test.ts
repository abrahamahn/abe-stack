// main/shared/src/core/auth/passwords/auth.password.patterns.test.ts
import { describe, expect, it } from 'vitest';

import { COMMON_PASSWORDS, KEYBOARD_PATTERNS } from '../../constants/auth';

import {
  containsUserInput,
  hasKeyboardPattern,
  hasRepeatedChars,
  hasSequentialChars,
  isCommonPassword,
} from './auth.password.patterns';

describe('Password Patterns', () => {
  describe('COMMON_PASSWORDS', () => {
    it('should contain known common passwords', () => {
      expect(COMMON_PASSWORDS.has('password')).toBe(true);
      expect(COMMON_PASSWORDS.has('123456')).toBe(true);
      expect(COMMON_PASSWORDS.has('qwerty')).toBe(true);
      expect(COMMON_PASSWORDS.has('admin')).toBe(true);
    });

    it('should not contain strong passwords', () => {
      expect(COMMON_PASSWORDS.has('xK9#mP2$vL7@nQ4')).toBe(false);
    });
  });

  describe('KEYBOARD_PATTERNS', () => {
    it('should contain keyboard patterns', () => {
      expect(KEYBOARD_PATTERNS).toContain('qwerty');
      expect(KEYBOARD_PATTERNS).toContain('asdf');
      expect(KEYBOARD_PATTERNS).toContain('1234');
      expect(KEYBOARD_PATTERNS).toContain('zxcv');
    });
  });

  describe('hasRepeatedChars', () => {
    it('should detect repeated characters', () => {
      expect(hasRepeatedChars('aaa')).toBe(true);
      expect(hasRepeatedChars('111')).toBe(true);
      expect(hasRepeatedChars('passssword')).toBe(true);
    });

    it('should not flag short repeats', () => {
      expect(hasRepeatedChars('aa')).toBe(false);
      expect(hasRepeatedChars('password')).toBe(false);
    });

    it('should use custom minLength', () => {
      expect(hasRepeatedChars('aa', 2)).toBe(true);
      expect(hasRepeatedChars('aaa', 4)).toBe(false);
    });
  });

  describe('hasSequentialChars', () => {
    it('should detect ascending sequences', () => {
      expect(hasSequentialChars('abc')).toBe(true);
      expect(hasSequentialChars('123')).toBe(true);
      expect(hasSequentialChars('xyz')).toBe(true);
    });

    it('should detect descending sequences', () => {
      expect(hasSequentialChars('cba')).toBe(true);
      expect(hasSequentialChars('321')).toBe(true);
      expect(hasSequentialChars('zyx')).toBe(true);
    });

    it('should not flag non-sequential characters', () => {
      expect(hasSequentialChars('ace')).toBe(false);
      expect(hasSequentialChars('password')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(hasSequentialChars('ABC')).toBe(true);
      expect(hasSequentialChars('AbC')).toBe(true);
    });

    it('should use custom minLength', () => {
      expect(hasSequentialChars('ab', 2)).toBe(true);
      expect(hasSequentialChars('abc', 4)).toBe(false);
    });
  });

  describe('hasKeyboardPattern', () => {
    it('should detect keyboard patterns', () => {
      expect(hasKeyboardPattern('qwerty')).toBe(true);
      expect(hasKeyboardPattern('asdfgh')).toBe(true);
      expect(hasKeyboardPattern('zxcvbn')).toBe(true);
      expect(hasKeyboardPattern('qazwsx')).toBe(true);
    });

    it('should detect patterns within password', () => {
      expect(hasKeyboardPattern('myqwertypass')).toBe(true);
      expect(hasKeyboardPattern('pass1234word')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(hasKeyboardPattern('QWERTY')).toBe(true);
      expect(hasKeyboardPattern('QwErTy')).toBe(true);
    });

    it('should not flag non-keyboard patterns', () => {
      expect(hasKeyboardPattern('xK9mP2vL7nQ4')).toBe(false);
    });
  });

  describe('isCommonPassword', () => {
    it('should detect common passwords', () => {
      expect(isCommonPassword('password')).toBe(true);
      expect(isCommonPassword('123456')).toBe(true);
      expect(isCommonPassword('qwerty')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isCommonPassword('PASSWORD')).toBe(true);
      expect(isCommonPassword('PaSsWoRd')).toBe(true);
    });

    it('should detect leet speak variations', () => {
      expect(isCommonPassword('p4ssw0rd')).toBe(true);
      expect(isCommonPassword('pa$$word')).toBe(true);
      expect(isCommonPassword('passw0rd')).toBe(true);
    });

    it('should detect passwords with trailing numbers', () => {
      expect(isCommonPassword('password123')).toBe(true);
      expect(isCommonPassword('admin99')).toBe(true);
    });

    it('should not flag strong passwords', () => {
      expect(isCommonPassword('xK9#mP2$vL7@nQ4')).toBe(false);
    });
  });

  describe('containsUserInput', () => {
    it('should detect username in password', () => {
      expect(containsUserInput('johnpassword', ['john'])).toBe(true);
      expect(containsUserInput('passwordjohn123', ['john'])).toBe(true);
    });

    it('should detect email parts in password', () => {
      expect(containsUserInput('smith2024pass', ['john.smith@example.com', 'smith'])).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(containsUserInput('JOHNpassword', ['john'])).toBe(true);
      expect(containsUserInput('johnPASSWORD', ['JOHN'])).toBe(true);
    });

    it('should ignore short inputs', () => {
      expect(containsUserInput('abpassword', ['ab'])).toBe(false);
    });

    it('should not flag when no user input present', () => {
      expect(containsUserInput('strongpassword', ['john', 'smith'])).toBe(false);
    });
  });
});
