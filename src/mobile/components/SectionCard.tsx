import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radii } from '@/constants/theme';

interface SectionCardProps {
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  accentColor?: string;
  urgent?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Reusable card wrapper for dashboard sections.
 * Provides a consistent header with icon + title + status subtitle.
 */
export const SectionCard: React.FC<SectionCardProps> = ({
  icon,
  iconColor,
  title,
  subtitle,
  accentColor,
  urgent,
  children,
  style,
}) => {
  const borderStyle = urgent
    ? { borderColor: colors.danger, borderWidth: 1.5 }
    : accentColor
      ? { borderColor: accentColor, borderWidth: 1, borderTopWidth: 2 }
      : { borderColor: colors.border, borderWidth: 1 };

  return (
    <View style={[styles.card, borderStyle, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: `${iconColor}20` }]}>
          <MaterialIcons name={icon as any} size={20} color={iconColor} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {urgent && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>!</Text>
          </View>
        )}
      </View>
      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

// ─── Stat Pill ──────────────────────────────────────────────────
interface StatPillProps {
  label: string;
  value: string | number;
  color?: string;
}

export const StatPill: React.FC<StatPillProps> = ({
  label,
  value,
  color = colors.textPrimary,
}) => (
  <View style={styles.statPill}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export const StatRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.statRow}>{children}</View>
);

// ─── Button Row ─────────────────────────────────────────────────
export const ActionRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.actionRow}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  urgentBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgentText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
