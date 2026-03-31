import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePlateCheckStatusQuery, usePlateCheckResultsQuery, useWaRegoHitsQuery } from '@/hooks/useQueries';
import { Text, Snackbar } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { api, API_BASE_URL } from '@/services/api';
import { ControlPanel } from '@/components/ControlPanel';
import { LiveLogPanel } from '@/components/LiveLogPanel';
import { ResultsTable } from '@/components/ResultsTable';
import { AnimatedCard } from '@/components/AnimatedCard';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useActionHandler } from '@/hooks/useActionHandler';
import { colors, spacing, radii, fontSize, pageMargins } from '@/constants/theme';

export default function PlateCheckScreen() {
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = usePlateCheckStatusQuery();
  const { data: resultsData, isLoading: resultsLoading, refetch: refetchResults } = usePlateCheckResultsQuery();
  const { data: waHits, isLoading: hitsLoading, refetch: refetchHits } = useWaRegoHitsQuery();
  const { isLoading: actionLoading, snackMessage, showSnack, dismissSnack, execute } = useActionHandler();

  const isLoading = statusLoading || resultsLoading || hitsLoading;
  const isRunning = !!status?.is_running;

  const handleRefresh = () => {
    refetchStatus();
    refetchResults();
    refetchHits();
  };

  const hitRows = useMemo(() => {
    if (!waHits || waHits.length === 0) return [];
    return [...waHits].reverse().map((hit: any, i: number) => {
      const screenshotUrl = hit.screenshot
        ? `${API_BASE_URL}/screenshots/hits/${hit.screenshot}`
        : undefined;
      return {
        id: `hit-${i}`,
        primary: hit.plate,
        secondary: hit.details || 'Account Found',
        status: 'HIT' as string,
        statusColor: colors.success,
        timestamp: hit.timestamp
          ? new Date(hit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : undefined,
        imageUrl: screenshotUrl,
      };
    });
  }, [waHits]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: pageMargins.horizontal }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh}
            tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <View style={styles.gridRow}>
          {/* Side Column: Control & Stats */}
          <View style={styles.sideColumn}>
            <View style={styles.block}>
              <Text style={styles.blockTitle}>SYSTEM CONTROL</Text>
              <ControlPanel
                title="Plate Rotation"
                icon="directions-car"
                accentColor={colors.success}
                isRunning={isRunning}
                onStart={() => execute(() => api.startPlateCheck(), 'Plate check started', 'Failed to start', handleRefresh)}
                onStop={() => execute(() => api.stopPlateCheck(), 'Plate check stopped', 'Failed to stop', handleRefresh)}
              >
                <Text style={styles.helpHint}>Automated WA government registration lookup and rotation.</Text>
              </ControlPanel>

              <View style={styles.actionsRow}>
                <AnimatedPressable
                  onPress={() => execute(() => api.generatePlates(100), 'Generated 100 plates', 'Failed to generate', handleRefresh)}
                  style={styles.actionBtn}
                >
                  <MaterialIcons name="auto-fix-high" size={14} color={colors.primary} />
                  <Text style={styles.actionBtnText}>GENERATE 100</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={() => execute(() => api.clearPlateResults(), 'Logs cleared', 'Failed to clear', handleRefresh)}
                  style={[styles.actionBtn, styles.actionBtnDanger]}
                >
                  <MaterialIcons name="delete-outline" size={14} color={colors.danger} />
                  <Text style={[styles.actionBtnText, { color: colors.danger }]}>CLEAR</Text>
                </AnimatedPressable>
              </View>
            </View>

            <View style={styles.block}>
              <Text style={styles.blockTitle}>ROTATION STATS</Text>
              <View style={styles.statsGrid}>
                <StatBox label="HITS" value={status?.hits_count || 0} color={colors.success} />
                <StatBox label="TOTAL" value={status?.total_lines || 0} color={colors.textPrimary} />
                <StatBox label="QUEUE" value={status?.pending_count || 0} color={colors.warning} />
              </View>
            </View>
          </View>

          {/* Main Column: Results & Logs */}
          <View style={styles.mainColumn}>
            <ResultsTable
              title="WA REGISTRATION HITS"
              rows={hitRows}
              maxRows={10}
              emptyText="No registration hits detected"
              accentColor={colors.success}
            />

            <View style={styles.block}>
              <Text style={styles.blockTitle}>LIVE ROTATION STREAM</Text>
              <LiveLogPanel file="wa" title="Plate Rotation" height={320} />
            </View>

            <View style={styles.block}>
              <Text style={styles.blockTitle}>RAW ACTIVITY LOG</Text>
              {resultsData?.results && resultsData.results.length > 0 ? (
                resultsData.results.slice(-15).reverse().map((item: string, index: number) => (
                  <ActivityRow key={index} item={item} />
                ))
              ) : (
                <View style={styles.emptyActivity}>
                  <Text style={styles.emptyText}>Waiting for rotation activity...</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <Snackbar visible={showSnack} onDismiss={dismissSnack} duration={3000} style={styles.snackbar}>
        {snackMessage}
      </Snackbar>
    </SafeAreaView>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActivityRow({ item }: { item: string }) {
  const isHit = item.includes('[HIT');
  const isFail = item.includes('[FAIL');
  const itemColor = isHit ? colors.success : isFail ? colors.danger : colors.textSecondary;
  const badgeLabel = isHit ? 'HIT' : isFail ? 'MISS' : 'LOG';

  return (
    <View style={styles.resultItem}>
      <View style={[styles.resultDot, { backgroundColor: itemColor }]} />
      <Text style={[styles.resultText, { color: itemColor }]} numberOfLines={1}>
        {item}
      </Text>
      <View style={[styles.badge, { backgroundColor: itemColor + '12' }]}>
        <Text style={[styles.badgeText, { color: itemColor }]}>{badgeLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  scrollContent: { paddingTop: spacing.lg, paddingBottom: spacing['5xl'] },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    flexWrap: 'wrap',
  },
  sideColumn: {
    flex: 1,
    minWidth: 320,
    gap: spacing.md,
  },
  mainColumn: {
    flex: 1.5,
    minWidth: 320,
    gap: spacing.md,
  },
  block: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  blockTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  helpHint: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: -spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCell: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statValue: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary + '15',
    backgroundColor: colors.primaryMuted,
  },
  actionBtnDanger: {
    borderColor: colors.danger + '15',
    backgroundColor: colors.dangerMuted,
  },
  actionBtnText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  resultDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  resultText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  badge: {
    borderRadius: radii.xs,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
  emptyActivity: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
  snackbar: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
});
