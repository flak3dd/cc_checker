/**
 * Design token system — Refined Professional v1
 * Soft deep grays, sapphire accents, and clean typography.
 * Balanced padding, subtle shadows, and modern sans-serif fonts.
 */

import { Platform } from 'react-native';
import { MD3DarkTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

// ─── Color Tokens ───────────────────────────────────────────────
export const colors = {
  // Primary — Electric Blue / Modern Accent
  primary: '#0EA5E9', // Sky 500 - more vibrant
  primaryDim: '#0284C7', // Sky 600
  primaryGlow: 'rgba(14, 165, 233, 0.15)',
  primaryMuted: 'rgba(14, 165, 233, 0.08)',
  primaryBright: '#38BDF8', // Sky 400

  // Backgrounds — Deep refined grays with better hierarchy
  background: '#0A0A0C', // Darker for more depth
  surface: '#141418',
  surfaceElevated: '#1C1C20', // Zinc 900
  surfaceHighlight: '#2A2A30', // Zinc 800
  surfaceHover: '#404046', // Zinc 700

  // Borders
  border: '#27272A',
  borderActive: '#3F3F46',
  borderFocus: '#3B82F6',
  borderSubtle: '#18181B',

  // Text
  textPrimary: '#FAFAFA', // Zinc 50
  textSecondary: '#A1A1AA', // Zinc 400
  textMuted: '#71717A', // Zinc 500
  textInverse: '#000000',

  // Semantic
  success: '#10B981', // Emerald 500
  successDim: '#059669',
  successMuted: 'rgba(16, 185, 129, 0.08)',
  successGlow: 'rgba(16, 185, 129, 0.15)',
  danger: '#EF4444', // Red 500
  dangerDim: '#DC2626',
  dangerMuted: 'rgba(239, 68, 68, 0.08)',
  dangerGlow: 'rgba(239, 68, 68, 0.15)',
  warning: '#F59E0B', // Amber 500
  warningDim: '#D97706',
  warningMuted: 'rgba(245, 158, 11, 0.08)',
  warningGlow: 'rgba(245, 158, 11, 0.15)',
  info: '#0EA5E9', // Sky 500
  infoDim: '#0284C7',
  infoMuted: 'rgba(14, 165, 233, 0.08)',
  infoGlow: 'rgba(14, 165, 233, 0.15)',
  accent: '#8B5CF6', // Violet 500
  accentDim: '#7C3AED',
  accentMuted: 'rgba(139, 92, 246, 0.08)',
  accentGlow: 'rgba(139, 92, 246, 0.15)',

  // Terminal / Logs (keeping slightly technical but cleaner)
  terminalBg: '#0C0C0E',
  terminalText: '#E4E4E7', // Zinc 200
  terminalDim: '#71717A',
  terminalHighlight: '#3B82F6',
  terminalError: '#EF4444',
  terminalCursor: '#3B82F6',

  // Glass & Overlay
  overlay: 'rgba(0, 0, 0, 0.75)',
  shimmer: 'rgba(255, 255, 255, 0.02)',
  glassLight: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassThin: 'rgba(255, 255, 255, 0.03)',
  glassMorphism: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)',
  },
} as const;

export const pageMargins = {
  horizontal: 32, // spacing['2xl'] * 1.5 for breathing room
  vertical: 16,
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

// ─── Radius (12-16pt for refined look) ───────────────────────────
export const radii = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 999,
} as const;

// ─── Typography Scale ───────────────────────────────────────────
export const fontSize = {
  '2xs': 10,
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 16,
  xl: 18,
  '2xl': 22,
  '3xl': 28,
  '4xl': 36,
  '5xl': 44,
  display: 52,
} as const;

// ─── Shadows ────────────────────────────────────────────────────
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: (color: string, radius = 8) =>
    Platform.select({
      ios: {
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: radius,
      },
      default: { elevation: Math.min(Math.round(radius / 4), 6) },
    }) as any,
  borderGlow: (color: string) => ({
    borderColor: color + '30',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
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

