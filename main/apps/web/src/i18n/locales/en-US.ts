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
