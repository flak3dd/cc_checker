/**
 * Design token system — Cyberpunk HUD v3
 * Deep blacks canvas (#000000 / #0A0A0F), neon accents (cyan, green, amber, crimson).
 * Generous padding (16-20pt), rounded corners (16-20pt), monospaced tactical labels.
 * Breathing room between sections (24-32pt).
 */

import { Platform } from 'react-native';
import { MD3DarkTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// ─── Color Tokens ───────────────────────────────────────────────
export const colors = {
  // Primary — Cyan
  primary: '#00CCCC',
  primaryDim: '#008F8F',
  primaryGlow: 'rgba(0, 204, 204, 0.14)',
  primaryMuted: 'rgba(0, 204, 204, 0.08)',
  primaryBright: '#33FFFF',

  // Backgrounds — Deep blacks
  background: '#000000',
  surface: '#0A0A0F',
  surfaceElevated: '#111118',
  surfaceHighlight: '#1A1A24',
  surfaceHover: '#222230',

  // Borders
  border: '#1A1A28',
  borderActive: '#2A2A42',
  borderFocus: '#00CCCC',
  borderSubtle: '#0F0F18',

  // Text
  textPrimary: '#EAEAF2',
  textSecondary: '#8888A0',
  textMuted: '#505068',
  textInverse: '#000000',

  // Semantic — Neon accents
  success: '#00E676',
  successDim: '#00A854',
  successMuted: 'rgba(0, 230, 118, 0.10)',
  successGlow: 'rgba(0, 230, 118, 0.25)',
  danger: '#FF3B5C',
  dangerDim: '#CC2F4A',
  dangerMuted: 'rgba(255, 59, 92, 0.10)',
  dangerGlow: 'rgba(255, 59, 92, 0.25)',
  warning: '#FFB020',
  warningDim: '#CC8D1A',
  warningMuted: 'rgba(255, 176, 32, 0.10)',
  warningGlow: 'rgba(255, 176, 32, 0.25)',
  info: '#4D8AFF',
  infoDim: '#3D6ECC',
  infoMuted: 'rgba(77, 138, 255, 0.10)',
  infoGlow: 'rgba(77, 138, 255, 0.25)',
  accent: '#9B6DFF',
  accentDim: '#7B4FDB',
  accentMuted: 'rgba(155, 109, 255, 0.10)',
  accentGlow: 'rgba(155, 109, 255, 0.25)',

  // Terminal
  terminalBg: '#050508',
  terminalText: '#00E676',
  terminalDim: '#3A6A4A',
  terminalHighlight: '#FFB020',
  terminalError: '#FF3B5C',
  terminalCursor: '#00CCCC',

  // Glass & Overlay
  overlay: 'rgba(0, 0, 0, 0.80)',
  shimmer: 'rgba(255, 255, 255, 0.03)',
  glassLight: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.05)',
  glassThin: 'rgba(255, 255, 255, 0.02)',
} as const;

// ─── Spacing (generous: 16-20pt cards, 24-32pt sections) ───────
export const spacing = {
  '2xs': 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
} as const;

// ─── Radius (16-20pt for cards) ─────────────────────────────────
export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 999,
} as const;

// ─── Typography Scale ───────────────────────────────────────────
export const fontSize = {
  '2xs': 8,
  xs: 9,
  sm: 10,
  base: 11,
  md: 12,
  lg: 14,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
  '5xl': 40,
  display: 48,
} as const;

// ─── Shadows ────────────────────────────────────────────────────
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: (color: string, radius = 12) =>
    Platform.select({
      ios: {
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: radius,
      },
      default: { elevation: Math.min(Math.round(radius / 2), 12) },
    }) as any,
  borderGlow: (color: string) => ({
    borderColor: color + '40',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  }),
} as const;

// ─── Animation Presets ──────────────────────────────────────────
export const motion = {
  /** Default spring for UI transitions */
  spring: { damping: 14, stiffness: 120, mass: 0.8 },
  /** Snappy spring for buttons */
  springSnap: { damping: 18, stiffness: 200, mass: 0.6 },
  /** Gentle spring for cards */
  springGentle: { damping: 12, stiffness: 80, mass: 1 },
  /** Stagger delay per item (ms) */
  staggerDelay: 50,
  /** Press scale */
  pressScale: 0.96,
} as const;

// ─── Fonts ──────────────────────────────────────────────────────
export const Fonts = Platform.select({
  ios: { sans: 'System', mono: 'Menlo' },
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
  roundness: radii.lg,
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
      level5: colors.surfaceHover,
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
