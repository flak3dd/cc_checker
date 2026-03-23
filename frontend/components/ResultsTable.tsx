import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AnimatedCard } from '@/components/AnimatedCard';
import { ScreenshotViewer } from '@/components/ScreenshotViewer';
import { impactLight } from '@/utils/haptics';
import { colors, spacing, radii, fontSize, shadows } from '@/constants/theme';

interface ResultRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  statusColor: string;
  timestamp?: string;
  imageUrl?: string;
}

interface ResultsTableProps {
  title: string;
  rows: ResultRow[];
  maxRows?: number;
  emptyText?: string;
  accentColor?: string;
}

const STATUS_ICONS: Record<string, string> = {
  SUCCESS: 'check-circle',
  PASS: 'verified',
  UNKNOWN: 'verified',
  FAIL: 'cancel',
  FAILED: 'cancel',
  ERROR_PREPAYMENT: 'warning',
  CRASH: 'error',
  NO_REPORT: 'remove-circle',
  HIT: 'gps-fixed',
  MISS: 'gps-not-fixed',
};

export const ResultsTable: React.FC<ResultsTableProps> = ({
  title,
  rows,
  maxRows = 5,
  emptyText = 'No results yet',
  accentColor,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [viewingImage, setViewingImage] = useState<{ url: string; title: string } | null>(null);
  const toggle = useCallback(() => {
    impactLight();
    setExpanded(prev => !prev);
  }, []);

  const displayRows = expanded ? rows : rows.slice(0, maxRows);
  const hasMore = rows.length > maxRows;

  const isPass = title.includes('PASS');
  const resolvedAccent = accentColor || (isPass ? colors.success : colors.danger);

  return (
    <View style={[
      styles.container,
      isPass && rows.length > 0 && shadows.glow(resolvedAccent, 4),
    ]}>
      {/* Accent bar top */}
      <View style={[styles.accentBar, { backgroundColor: resolvedAccent }]} />

      {/* Header */}
      <AnimatedPressable onPress={hasMore ? toggle : undefined} style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.accentDot, { backgroundColor: resolvedAccent }]} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.countBadge, { backgroundColor: resolvedAccent + '12' }]}>
            <Text style={[styles.count, { color: resolvedAccent }]}>{rows.length}</Text>
          </View>
          {hasMore && (
            <MaterialIcons
              name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
              size={16}
              color={colors.textMuted}
            />
          )}
        </View>
      </AnimatedPressable>

      {/* Rows */}
      {displayRows.length > 0 ? (
        displayRows.map((row, idx) => (
          <AnimatedCard key={row.id} index={idx}>
            <View style={[styles.row, idx === displayRows.length - 1 && !hasMore && styles.rowLast]}>
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
              {row.imageUrl && (
                <AnimatedPressable
                  onPress={() => setViewingImage({ url: row.imageUrl!, title: `${row.primary} — ${row.status}` })}
                  style={styles.screenshotBtn}
                >
                  <MaterialIcons name="photo-camera" size={14} color={colors.primary} />
                </AnimatedPressable>
              )}
            </View>
          </AnimatedCard>
        ))
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="inbox" size={20} color={colors.textMuted} />
          <Text style={styles.empty}>{emptyText}</Text>
        </View>
      )}

      {/* Footer toggle */}
      {hasMore && (
        <AnimatedPressable onPress={toggle} style={styles.footer}>
          <Text style={styles.footerText}>
            {expanded ? 'Collapse' : `Show all ${rows.length}`}
          </Text>
          <MaterialIcons
            name={expanded ? 'unfold-less' : 'unfold-more'}
            size={12}
            color={colors.primary}
          />
        </AnimatedPressable>
      )}

      {viewingImage && (
        <ScreenshotViewer
          visible={!!viewingImage}
          imageUrl={viewingImage.url}
          title={viewingImage.title}
          onDismiss={() => setViewingImage(null)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  accentBar: {
    height: 2,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: 'monospace',
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  count: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    fontFamily: 'monospace',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  primary: {
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  secondary: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontFamily: 'monospace',
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  statusBadge: {
    fontSize: fontSize['2xs'],
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  timestamp: {
    color: colors.textMuted,
    fontSize: fontSize['2xs'],
    fontVariant: ['tabular-nums'],
    fontFamily: 'monospace',
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing['2xl'],
  },
  empty: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    fontFamily: 'monospace',
  },
  screenshotBtn: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
});
