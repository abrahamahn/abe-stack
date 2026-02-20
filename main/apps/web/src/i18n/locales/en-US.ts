// main/apps/web/src/i18n/locales/en-US.ts
/**
 * English (US) translation strings.
 *
 * This is the default locale and serves as the canonical reference
 * for all translation keys used in the application.
 *
 * @module i18n-locale-en-US
 */

import type { FlatTranslationMap } from '../types';

// ============================================================================
// English (US) Translations
// ============================================================================

export const enUS: FlatTranslationMap = {
  // Common
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.loading': 'Loading...',
  'common.error': 'Something went wrong',
  'common.success': 'Success',
  'common.confirm': 'Confirm',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.submit': 'Submit',
  'common.search': 'Search',

  // Auth - Login
  'auth.login.title': 'Sign In',
  'auth.login.email': 'Email address',
  'auth.login.password': 'Password',
  'auth.login.submit': 'Sign In',
  'auth.login.forgotPassword': 'Forgot password?',
  'auth.login.noAccount': "Don't have an account?",
  'auth.login.signUp': 'Sign up',
  'auth.login.withPasskey': 'Sign in with Passkey',

  // Auth - Register
  'auth.register.title': 'Create Account',
  'auth.register.email': 'Email address',
  'auth.register.password': 'Password',
  'auth.register.confirmPassword': 'Confirm password',
  'auth.register.submit': 'Create Account',
  'auth.register.hasAccount': 'Already have an account?',
  'auth.register.signIn': 'Sign in',

  // Auth - Forgot Password
  'auth.forgotPassword.title': 'Reset Password',
  'auth.forgotPassword.email': 'Email address',
  'auth.forgotPassword.submit': 'Send Reset Link',
  'auth.forgotPassword.sent': 'Check your email for a reset link',

  // Settings
  'settings.title': 'Settings',
  'settings.profile.title': 'Profile',
  'settings.security.title': 'Security',
  'settings.sessions.title': 'Sessions',
  'settings.passkeys.title': 'Passkeys',
  'settings.dangerZone.title': 'Danger Zone',

  // Settings - Preferences
  'settings.preferences.title': 'Preferences',
  'settings.preferences.description': 'Customize the application appearance and behavior.',
  'settings.preferences.theme.title': 'Theme',
  'settings.preferences.theme.description':
    'Choose how the application looks. Select a theme or let it follow your system settings.',
  'settings.preferences.theme.light': 'Light',
  'settings.preferences.theme.dark': 'Dark',
  'settings.preferences.theme.system': 'System',
  'settings.preferences.theme.lightDescription': 'Always use light theme',
  'settings.preferences.theme.darkDescription': 'Always use dark theme',
  'settings.preferences.theme.systemDescription': 'Match your operating system setting',
  'settings.preferences.theme.currentSelection': 'Current selection:',
  'settings.preferences.timezone.title': 'Timezone',
  'settings.preferences.timezone.description':
    'Set your preferred timezone for displaying dates and times.',
  'settings.preferences.language.title': 'Language',
  'settings.preferences.language.description':
    'Choose your preferred language for the application interface.',
  'settings.preferences.language.saved': 'Language preference saved.',

  // Workspace
  'workspace.create': 'Create Workspace',
  'workspace.members': 'Members',
  'workspace.invitations': 'Invitations',
  'workspace.settings': 'Workspace Settings',

  // Errors
  'error.unauthorized': 'You need to sign in to access this page',
  'error.forbidden': 'You do not have permission to access this resource',
  'error.notFound': 'Page not found',
  'error.serverError': 'An unexpected error occurred. Please try again.',
};
