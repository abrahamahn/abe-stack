import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { format } from 'prettier';

import { colors } from '../../packages/ui/src/theme/colors';
import { motion } from '../../packages/ui/src/theme/motion';
import { spacing } from '../../packages/ui/src/theme/spacing';
import { typography } from '../../packages/ui/src/theme/typography';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const themeCssPath = path.resolve(__dirname, '../packages/ui/src/theme/theme.css');

const darkOverrides = {
  primary: '#3b82f6',
  primaryMuted: '#1e3a8a',
  danger: '#f87171',
  success: '#34d399',
  warning: '#fbbf24',
  neutral: '#e5e7eb',
  muted: '#9ca3af',
  bg: '#0b1220',
  surface: '#111827',
  surfaceStrong: '#0f172a',
  border: '#1f2937',
  text: '#f8fafc',
  textMuted: '#d5dde7',
  textInverse: '#0b1220',
  controlThumb: '#e5e7eb',
  badgePrimaryBg: '#1e3a8a',
  badgePrimaryBorder: '#3b82f6',
  badgeSuccessBg: '#0f3f2b',
  badgeSuccessBorder: '#34d399',
  badgeDangerBg: '#3b0d0d',
  badgeDangerBorder: '#f87171',
  badgeWarningBg: '#422006',
  badgeWarningBorder: '#fbbf24',
  badgeNeutralBg: '#1f2937',
  badgeNeutralBorder: '#334155',
  alertInfoBg: '#1e3a8a',
  alertInfoBorder: '#3b82f6',
  alertInfoText: '#e0f2fe',
  alertSuccessBg: '#0f3f2b',
  alertSuccessBorder: '#34d399',
  alertSuccessText: '#bbf7d0',
  alertDangerBg: '#3b0d0d',
  alertDangerBorder: '#f87171',
  alertDangerText: '#fecaca',
  alertWarningBg: '#422006',
  alertWarningBorder: '#fbbf24',
  alertWarningText: '#fef3c7',
};

function toCssVars(): string {
  const tokens = {
    '--ui-radius-sm': spacing.xs,
    '--ui-radius-md': '10px',
    '--ui-radius-lg': '16px',
    '--ui-gap-xs': spacing.xs,
    '--ui-gap-sm': spacing.sm,
    '--ui-gap-md': spacing.md,
    '--ui-gap-lg': spacing.lg,
    '--ui-gap-xl': spacing.xl,
    '--ui-motion-duration-fast': motion.durations.fast,
    '--ui-motion-duration-base': motion.durations.base,
    '--ui-motion-duration-slow': motion.durations.slow,
    '--ui-motion-duration-slower': motion.durations.slower,
    '--ui-motion-duration-shimmer': motion.durations.shimmer,
    '--ui-motion-ease-standard': motion.easing.standard,
    '--ui-motion-ease-in': motion.easing.in,
    '--ui-motion-ease-out': motion.easing.out,
    '--ui-font-family': typography.fontFamily,
    '--ui-font-size-base': typography.sizes.sm,
    '--ui-font-size-xs': typography.sizes.xs,
    '--ui-font-size-sm': typography.sizes.sm,
    '--ui-font-size-md': typography.sizes.md,
    '--ui-font-size-lg': typography.sizes.lg,
    '--ui-font-size-xl': typography.sizes.xl,
    '--ui-font-weight-regular': typography.weights.regular.toString(),
    '--ui-font-weight-medium': typography.weights.medium.toString(),
    '--ui-font-weight-bold': typography.weights.bold.toString(),
    '--ui-line-height-base': typography.lineHeights.normal.toString(),
    '--ui-line-height-tight': typography.lineHeights.tight.toString(),
    '--ui-line-height-normal': typography.lineHeights.normal.toString(),
    '--ui-line-height-loose': typography.lineHeights.loose.toString(),
    '--ui-color-primary': colors.primary,
    '--ui-color-accent': colors.primary,
    '--ui-color-primary-muted': colors.primaryMuted,
    '--ui-color-danger': colors.danger,
    '--ui-color-success': colors.success,
    '--ui-color-warning': colors.warning,
    '--ui-color-neutral': colors.neutral,
    '--ui-color-muted': colors.muted,
    '--ui-color-bg': colors.surface,
    '--ui-color-surface': '#f7f7f8',
    '--ui-color-surface-strong': '#0f172a',
    '--ui-color-border': '#e2e5e9',
    '--ui-color-shadow': '0 10px 30px rgba(18, 38, 63, 0.08)',
    '--ui-color-text': '#0f172a',
    '--ui-color-text-muted': '#4b5563',
    '--ui-color-text-inverse': '#e2e8f0',
    '--ui-color-control-thumb': '#ffffff',
    '--ui-focus': '0 0 0 3px rgba(59, 130, 246, 0.35)',
    '--ui-alert-info-bg': '#eff6ff',
    '--ui-alert-info-border': '#cbdcff',
    '--ui-alert-info-text': '#1e3a8a',
    '--ui-alert-success-bg': '#ecfdf3',
    '--ui-alert-success-border': '#bbf7d0',
    '--ui-alert-success-text': '#166534',
    '--ui-alert-danger-bg': '#fef2f2',
    '--ui-alert-danger-border': '#fecdd3',
    '--ui-alert-danger-text': '#7f1d1d',
    '--ui-alert-warning-bg': '#fffbeb',
    '--ui-alert-warning-border': '#fde68a',
    '--ui-alert-warning-text': '#92400e',
    '--ui-badge-primary-bg': '#e0e7ff',
    '--ui-badge-primary-border': '#c7d2fe',
    '--ui-badge-success-bg': '#e0f7ec',
    '--ui-badge-success-border': '#a7f3d0',
    '--ui-badge-danger-bg': '#fee2e2',
    '--ui-badge-danger-border': '#fecdd3',
    '--ui-badge-warning-bg': '#fef3c7',
    '--ui-badge-warning-border': '#fcd34d',
    '--ui-badge-neutral-bg': '#f1f5f9',
    '--ui-badge-neutral-border': '#e2e8f0',
  };

  const dark = {
    ...tokens,
    '--ui-color-primary': darkOverrides.primary,
    '--ui-color-primary-muted': darkOverrides.primaryMuted,
    '--ui-color-danger': darkOverrides.danger,
    '--ui-color-success': darkOverrides.success,
    '--ui-color-warning': darkOverrides.warning,
    '--ui-color-neutral': darkOverrides.neutral,
    '--ui-color-muted': darkOverrides.muted,
    '--ui-color-bg': darkOverrides.bg,
    '--ui-color-surface': darkOverrides.surface,
    '--ui-color-surface-strong': darkOverrides.surfaceStrong,
    '--ui-color-border': darkOverrides.border,
    '--ui-color-shadow': '0 16px 48px rgba(0, 0, 0, 0.45)',
    '--ui-color-text': darkOverrides.text,
    '--ui-color-text-muted': darkOverrides.textMuted,
    '--ui-color-text-inverse': darkOverrides.textInverse,
    '--ui-color-control-thumb': darkOverrides.controlThumb,
    '--ui-alert-info-bg': darkOverrides.alertInfoBg,
    '--ui-alert-info-border': darkOverrides.alertInfoBorder,
    '--ui-alert-info-text': darkOverrides.alertInfoText,
    '--ui-alert-success-bg': darkOverrides.alertSuccessBg,
    '--ui-alert-success-border': darkOverrides.alertSuccessBorder,
    '--ui-alert-success-text': darkOverrides.alertSuccessText,
    '--ui-alert-danger-bg': darkOverrides.alertDangerBg,
    '--ui-alert-danger-border': darkOverrides.alertDangerBorder,
    '--ui-alert-danger-text': darkOverrides.alertDangerText,
    '--ui-alert-warning-bg': darkOverrides.alertWarningBg,
    '--ui-alert-warning-border': darkOverrides.alertWarningBorder,
    '--ui-alert-warning-text': darkOverrides.alertWarningText,
    '--ui-badge-primary-bg': darkOverrides.badgePrimaryBg,
    '--ui-badge-primary-border': darkOverrides.badgePrimaryBorder,
    '--ui-badge-success-bg': darkOverrides.badgeSuccessBg,
    '--ui-badge-success-border': darkOverrides.badgeSuccessBorder,
    '--ui-badge-danger-bg': darkOverrides.badgeDangerBg,
    '--ui-badge-danger-border': darkOverrides.badgeDangerBorder,
    '--ui-badge-warning-bg': darkOverrides.badgeWarningBg,
    '--ui-badge-warning-border': darkOverrides.badgeWarningBorder,
    '--ui-badge-neutral-bg': darkOverrides.badgeNeutralBg,
    '--ui-badge-neutral-border': darkOverrides.badgeNeutralBorder,
  };

  const serialize = (obj: Record<string, string>): string =>
    Object.entries(obj)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n');

  return `:root {\n${serialize(tokens)}\n}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n${serialize(
    dark,
  )}\n  }\n}\n`;
}

async function build(): Promise<void> {
  const css = toCssVars();
  const formatted = await format(css, { parser: 'css' });
  await fs.writeFile(themeCssPath, formatted, 'utf8');

  console.log(`Generated theme CSS at ${themeCssPath}`);
}

build().catch((err: unknown) => {
  console.error('Failed to build theme.css', err);
  process.exitCode = 1;
});
