import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing, radii } from '@/constants/theme';

interface StatCellProps {
  value: string | number;
  label: string;
  color?: string;
  /** Make this cell span full width */
  wide?: boolean;
}

const StatCell: React.FC<StatCellProps> = ({ value, label, color = colors.textPrimary, wide }) => (
  <View style={[styles.cell, wide && styles.cellWide]}>
    <Text style={[styles.value, { color }]}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

interface HeroStatsProps {
  stats: StatCellProps[];
}

/**
 * Bento-style hero stats grid — 2-column layout with large numerics.
 */
export const HeroStats: React.FC<HeroStatsProps> = ({ stats }) => (
  <View style={styles.grid}>
    {stats.map((stat, i) => (
      <StatCell key={i} {...stat} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    backgroundColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  cell: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: colors.surface,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  cellWide: {
    minWidth: '100%',
  },
  value: {
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  label: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
});
