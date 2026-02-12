// src/shared/src/utils/keyboard/index.ts
/**
 * Keyboard Utilities
 *
 * Platform detection, key binding parsing, and keyboard event matching.
 */

export {
  formatKeyBinding,
  isEditableElement,
  isMac,
  matchesAnyBinding,
  matchesKeyBinding,
  matchesModifiers,
  parseKeyBinding,
  type KeyModifiers,
  type ParsedKeyBinding,
} from './keyboard';
