import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radii } from '@/constants/theme';

interface ResultRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  statusColor: string;
  timestamp?: string;
}

interface ResultsTableProps {
  title: string;
  rows: ResultRow[];
  maxRows?: number;
  emptyText?: string;
}

const STATUS_ICONS: Record<string, string> = {
  SUCCESS: 'check-circle',
  PASS: 'verified',
  FAIL: 'cancel',
  FAILED: 'cancel',
  ERROR_PREPAYMENT: 'warning',
  CRASH: 'error',
  NO_REPORT: 'remove-circle',
  HIT: 'gps-fixed',
  MISS: 'gps-not-fixed',
};

/**
 * Compact results table for dashboard — shows latest results
 * with status icon, primary/secondary text, and timestamp.
 */
export const ResultsTable: React.FC<ResultsTableProps> = ({
  title,
  rows,
  maxRows = 5,
  emptyText = 'No results yet',
}) => {
  const displayRows = rows.slice(0, maxRows);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>{rows.length}</Text>
      </View>

      {displayRows.length > 0 ? (
        displayRows.map((row) => (
          <View key={row.id} style={styles.row}>
            <MaterialIcons
              name={(STATUS_ICONS[row.status] || 'circle') as any}
              size={14}
              color={row.statusColor}
            />
            <View style={styles.rowContent}>
              <Text style={styles.primary} numberOfLines={1}>{row.primary}</Text>
              <Text style={styles.secondary} numberOfLines={1}>{row.secondary}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.statusBadge, { color: row.statusColor }]}>{row.status}</Text>
              {row.timestamp && (
                <Text style={styles.timestamp}>{row.timestamp}</Text>
              )}
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.empty}>{emptyText}</Text>
      )}

      {rows.length > maxRows && (
        <Text style={styles.moreText}>+{rows.length - maxRows} more</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  count: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowContent: {
    flex: 1,
    gap: 1,
  },
  primary: {
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '600',
  },
  secondary: {
    color: colors.textMuted,
    fontSize: 9,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 1,
  },
  statusBadge: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timestamp: {
    color: colors.textMuted,
    fontSize: 8,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: spacing.lg,
    fontStyle: 'italic',
  },
  moreText: {
    color: colors.textMuted,
    fontSize: 9,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
});
