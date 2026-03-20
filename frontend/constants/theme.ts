/**
 * Design token system — Cyberpunk HUD Control Panel
 * Strong Cyan primary on Carbon Black, high-density ops aesthetic.
 */

import { Platform } from 'react-native';
import { MD3DarkTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// ─── Color Tokens ───────────────────────────────────────────────
export const colors = {
  // Primary
  primary: '#00CCCC',
  primaryDim: '#008F8F',
  primaryGlow: 'rgba(0, 204, 204, 0.12)',
  primaryMuted: 'rgba(0, 204, 204, 0.08)',

  // Backgrounds
  background: '#08080D',
  surface: '#101018',
  surfaceElevated: '#181822',
  surfaceHighlight: '#20202C',

  // Borders
  border: '#1E1E2E',
  borderActive: '#2A2A40',
  borderFocus: '#00CCCC',

  // Text
  textPrimary: '#E8E8F0',
  textSecondary: '#7A7A90',
  textMuted: '#44445A',
  textInverse: '#08080D',

  // Semantic
  success: '#00E676',
  successDim: '#00A854',
  successMuted: 'rgba(0, 230, 118, 0.12)',
  danger: '#FF3B5C',
  dangerDim: '#CC2F4A',
  dangerMuted: 'rgba(255, 59, 92, 0.12)',
  warning: '#FFB020',
  warningMuted: 'rgba(255, 176, 32, 0.12)',
  info: '#4D8AFF',
  infoMuted: 'rgba(77, 138, 255, 0.12)',
  accent: '#9B6DFF',
  accentDim: '#7B4FDB',
  accentMuted: 'rgba(155, 109, 255, 0.12)',

  // Terminal
  terminalBg: '#0A0A10',
  terminalText: '#00E676',
  terminalDim: '#3A6A4A',
  terminalHighlight: '#FFB020',
  terminalError: '#FF3B5C',

  // Misc
  overlay: 'rgba(0, 0, 0, 0.7)',
  shimmer: 'rgba(255, 255, 255, 0.02)',
} as const;

// ─── Spacing ────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

// ─── Radius ─────────────────────────────────────────────────────
export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 999,
} as const;

// ─── Typography ─────────────────────────────────────────────────
export const Fonts = Platform.select({
  ios: { sans: 'system-ui', mono: 'ui-monospace' },
  default: { sans: 'normal', mono: 'monospace' },
  web: {
    sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});

// ─── Paper Theme ────────────────────────────────────────────────
export const paperTheme: MD3Theme = {
  ...MD3DarkTheme,
  dark: true,
  roundness: radii.md,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primaryGlow,
    secondary: colors.accent,
    secondaryContainer: colors.accentMuted,
    tertiary: colors.info,
    tertiaryContainer: colors.infoMuted,
    surface: colors.surface,
    surfaceVariant: colors.surfaceElevated,
    surfaceDisabled: colors.surfaceHighlight,
    background: colors.background,
    error: colors.danger,
    errorContainer: colors.dangerMuted,
    onPrimary: colors.textInverse,
    onPrimaryContainer: colors.primary,
    onSecondary: colors.textPrimary,
    onSecondaryContainer: colors.accent,
    onSurface: colors.textPrimary,
    onSurfaceVariant: colors.textSecondary,
    onSurfaceDisabled: colors.textMuted,
    onBackground: colors.textPrimary,
    onError: colors.textPrimary,
    onErrorContainer: colors.danger,
    outline: colors.border,
    outlineVariant: colors.borderActive,
    inverseSurface: colors.textPrimary,
    inverseOnSurface: colors.background,
    inversePrimary: colors.primaryDim,
    shadow: '#000000',
    scrim: colors.overlay,
    backdrop: colors.overlay,
    elevation: {
      level0: 'transparent',
      level1: colors.surface,
      level2: colors.surfaceElevated,
      level3: colors.surfaceHighlight,
      level4: colors.surfaceHighlight,
      level5: colors.surfaceHighlight,
    },
  },
};

// ─── Legacy compat ──────────────────────────────────────────────
export const Colors = {
  light: {
    text: colors.textPrimary,
    background: colors.background,
    tint: colors.primary,
    icon: colors.textSecondary,
    tabIconDefault: colors.textMuted,
    tabIconSelected: colors.primary,
  },
  dark: {
    text: colors.textPrimary,
    background: colors.background,
    tint: colors.primary,
    icon: colors.textSecondary,
    tabIconDefault: colors.textMuted,
    tabIconSelected: colors.primary,
  },
};
