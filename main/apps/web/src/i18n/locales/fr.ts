// main/apps/web/src/i18n/locales/fr.ts
/**
 * French translation strings.
 *
 * All keys must match those defined in en-US.ts.
 *
 * @module i18n-locale-fr
 */

import type { FlatTranslationMap } from '../types';

// ============================================================================
// French Translations
// ============================================================================

export const fr: FlatTranslationMap = {
  // Common
  'common.save': 'Enregistrer',
  'common.cancel': 'Annuler',
  'common.delete': 'Supprimer',
  'common.edit': 'Modifier',
  'common.loading': 'Chargement...',
  'common.error': 'Une erreur est survenue',
  'common.success': 'Succ\u00e8s',
  'common.confirm': 'Confirmer',
  'common.back': 'Retour',
  'common.next': 'Suivant',
  'common.submit': 'Soumettre',
  'common.search': 'Rechercher',

  // Auth - Login
  'auth.login.title': 'Se connecter',
  'auth.login.email': 'Adresse e-mail',
  'auth.login.password': 'Mot de passe',
  'auth.login.submit': 'Se connecter',
  'auth.login.forgotPassword': 'Mot de passe oubli\u00e9 ?',
  'auth.login.noAccount': "Vous n'avez pas de compte ?",
  'auth.login.signUp': "S'inscrire",
  'auth.login.withPasskey': 'Se connecter avec Passkey',

  // Auth - Register
  'auth.register.title': 'Cr\u00e9er un compte',
  'auth.register.email': 'Adresse e-mail',
  'auth.register.password': 'Mot de passe',
  'auth.register.confirmPassword': 'Confirmer le mot de passe',
  'auth.register.submit': 'Cr\u00e9er un compte',
  'auth.register.hasAccount': 'Vous avez d\u00e9j\u00e0 un compte ?',
  'auth.register.signIn': 'Se connecter',

  // Auth - Forgot Password
  'auth.forgotPassword.title': 'R\u00e9initialiser le mot de passe',
  'auth.forgotPassword.email': 'Adresse e-mail',
  'auth.forgotPassword.submit': 'Envoyer le lien de r\u00e9initialisation',
  'auth.forgotPassword.sent': 'V\u00e9rifiez votre e-mail pour le lien de r\u00e9initialisation',

  // Settings
  'settings.title': 'Param\u00e8tres',
  'settings.profile.title': 'Profil',
  'settings.security.title': 'S\u00e9curit\u00e9',
  'settings.sessions.title': 'Sessions',
  'settings.passkeys.title': 'Passkeys',
  'settings.dangerZone.title': 'Zone dangereuse',

  // Settings - Preferences
  'settings.preferences.title': 'Préférences',
  'settings.preferences.description': "Personnalisez l'apparence et le comportement de l'application.",
  'settings.preferences.theme.title': 'Thème',
  'settings.preferences.theme.description':
    "Choisissez l'apparence de l'application. Sélectionnez un thème ou laissez-le suivre les paramètres du système.",
  'settings.preferences.theme.light': 'Clair',
  'settings.preferences.theme.dark': 'Sombre',
  'settings.preferences.theme.system': 'Système',
  'settings.preferences.theme.lightDescription': 'Toujours utiliser le thème clair',
  'settings.preferences.theme.darkDescription': 'Toujours utiliser le thème sombre',
  'settings.preferences.theme.systemDescription': "Suivre les paramètres du système d'exploitation",
  'settings.preferences.theme.currentSelection': 'Sélection actuelle :',
  'settings.preferences.timezone.title': 'Fuseau horaire',
  'settings.preferences.timezone.description':
    'Définissez votre fuseau horaire préféré pour afficher les dates et heures.',
  'settings.preferences.language.title': 'Langue',
  'settings.preferences.language.description':
    "Choisissez votre langue préférée pour l'interface de l'application.",
  'settings.preferences.language.saved': 'Préférence de langue enregistrée.',

  // Workspace
  'workspace.create': 'Cr\u00e9er un espace de travail',
  'workspace.members': 'Membres',
  'workspace.invitations': 'Invitations',
  'workspace.settings': "Param\u00e8tres de l'espace de travail",

  // Errors
  'error.unauthorized': 'Vous devez vous connecter pour acc\u00e9der \u00e0 cette page',
  'error.forbidden': "Vous n'avez pas la permission d'acc\u00e9der \u00e0 cette ressource",
  'error.notFound': 'Page non trouv\u00e9e',
  'error.serverError': 'Une erreur inattendue est survenue. Veuillez r\u00e9essayer.',
};
