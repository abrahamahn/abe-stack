// main/apps/web/src/i18n/locales/es.ts
/**
 * Spanish translation strings.
 *
 * All keys must match those defined in en-US.ts.
 *
 * @module i18n-locale-es
 */

import type { FlatTranslationMap } from '../types';

// ============================================================================
// Spanish Translations
// ============================================================================

export const es: FlatTranslationMap = {
  // Common
  'common.save': 'Guardar',
  'common.cancel': 'Cancelar',
  'common.delete': 'Eliminar',
  'common.edit': 'Editar',
  'common.loading': 'Cargando...',
  'common.error': 'Algo sali\u00f3 mal',
  'common.success': '\u00c9xito',
  'common.confirm': 'Confirmar',
  'common.back': 'Atr\u00e1s',
  'common.next': 'Siguiente',
  'common.submit': 'Enviar',
  'common.search': 'Buscar',

  // Auth - Login
  'auth.login.title': 'Iniciar sesi\u00f3n',
  'auth.login.email': 'Correo electr\u00f3nico',
  'auth.login.password': 'Contrase\u00f1a',
  'auth.login.submit': 'Iniciar sesi\u00f3n',
  'auth.login.forgotPassword': '\u00bfOlvidaste tu contrase\u00f1a?',
  'auth.login.noAccount': '\u00bfNo tienes una cuenta?',
  'auth.login.signUp': 'Reg\u00edstrate',
  'auth.login.withPasskey': 'Iniciar sesi\u00f3n con Passkey',

  // Auth - Register
  'auth.register.title': 'Crear cuenta',
  'auth.register.email': 'Correo electr\u00f3nico',
  'auth.register.password': 'Contrase\u00f1a',
  'auth.register.confirmPassword': 'Confirmar contrase\u00f1a',
  'auth.register.submit': 'Crear cuenta',
  'auth.register.hasAccount': '\u00bfYa tienes una cuenta?',
  'auth.register.signIn': 'Inicia sesi\u00f3n',

  // Auth - Forgot Password
  'auth.forgotPassword.title': 'Restablecer contrase\u00f1a',
  'auth.forgotPassword.email': 'Correo electr\u00f3nico',
  'auth.forgotPassword.submit': 'Enviar enlace de restablecimiento',
  'auth.forgotPassword.sent': 'Revisa tu correo para el enlace de restablecimiento',

  // Settings
  'settings.title': 'Configuraci\u00f3n',
  'settings.profile.title': 'Perfil',
  'settings.security.title': 'Seguridad',
  'settings.sessions.title': 'Sesiones',
  'settings.passkeys.title': 'Passkeys',
  'settings.dangerZone.title': 'Zona de peligro',

  // Settings - Preferences
  'settings.preferences.title': 'Preferencias',
  'settings.preferences.description': 'Personaliza la apariencia y el comportamiento de la aplicación.',
  'settings.preferences.theme.title': 'Tema',
  'settings.preferences.theme.description':
    'Elige el aspecto de la aplicación. Selecciona un tema o deja que siga la configuración del sistema.',
  'settings.preferences.theme.light': 'Claro',
  'settings.preferences.theme.dark': 'Oscuro',
  'settings.preferences.theme.system': 'Sistema',
  'settings.preferences.theme.lightDescription': 'Usar siempre el tema claro',
  'settings.preferences.theme.darkDescription': 'Usar siempre el tema oscuro',
  'settings.preferences.theme.systemDescription': 'Seguir la configuración del sistema operativo',
  'settings.preferences.theme.currentSelection': 'Selección actual:',
  'settings.preferences.timezone.title': 'Zona horaria',
  'settings.preferences.timezone.description':
    'Establece tu zona horaria preferida para mostrar fechas y horas.',
  'settings.preferences.language.title': 'Idioma',
  'settings.preferences.language.description':
    'Elige tu idioma preferido para la interfaz de la aplicación.',
  'settings.preferences.language.saved': 'Preferencia de idioma guardada.',

  // Workspace
  'workspace.create': 'Crear espacio de trabajo',
  'workspace.members': 'Miembros',
  'workspace.invitations': 'Invitaciones',
  'workspace.settings': 'Configuraci\u00f3n del espacio de trabajo',

  // Errors
  'error.unauthorized': 'Necesitas iniciar sesi\u00f3n para acceder a esta p\u00e1gina',
  'error.forbidden': 'No tienes permiso para acceder a este recurso',
  'error.notFound': 'P\u00e1gina no encontrada',
  'error.serverError': 'Ocurri\u00f3 un error inesperado. Por favor, int\u00e9ntalo de nuevo.',
};
