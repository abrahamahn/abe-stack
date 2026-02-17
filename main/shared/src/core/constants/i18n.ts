// main/shared/src/core/constants/i18n.ts

/**
 * @file Internationalization Constants
 * @description Locales, currencies, and other i18n related constants.
 * @module Core/Constants/I18n
 */

export const LOCALES = ['en-US', 'en-GB', 'de-DE'] as const;
export type Locale = (typeof LOCALES)[number];

export const CURRENCIES = ['USD', 'EUR', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];
