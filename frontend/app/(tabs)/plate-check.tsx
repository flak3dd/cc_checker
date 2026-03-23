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
import { colors, spacing, radii, fontSize, shadows } from '@/constants/theme';

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

  // Build WA hits rows with screenshot URLs
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh}
            tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {/* ─── Header ─────────────────────────── */}
        <AnimatedCard index={0}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>WA GOVERNMENT</Text>
            <Text style={styles.title}>Plate Checker</Text>
          </View>
        </AnimatedCard>

        {/* ─── Stats Grid ─────────────────────── */}
        <AnimatedCard index={1}>
          <View style={styles.statsGrid}>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: colors.success }]}>{status?.hits_count || 0}</Text>
              <Text style={styles.statLabel}>HITS</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{status?.total_lines || 0}</Text>
              <Text style={styles.statLabel}>ATTEMPTS</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: colors.warning }]}>{status?.pending_count || 0}</Text>
              <Text style={styles.statLabel}>PENDING</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* ─── Control ────────────────────────── */}
        <AnimatedCard index={2}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: colors.success }]} />
            <Text style={styles.sectionLabel}>CONTROL</Text>
          </View>
        </AnimatedCard>

        <AnimatedCard index={3}>
          <ControlPanel
            title="Plate Rotation"
            icon="directions-car"
            accentColor={colors.success}
            isRunning={isRunning}
            onStart={() => execute(() => api.startPlateCheck(), 'Plate check started', 'Failed to start', handleRefresh)}
            onStop={() => execute(() => api.stopPlateCheck(), 'Plate check stopped', 'Failed to stop', handleRefresh)}
          >
            <Text style={styles.helpHint}>Rotates through WA plate numbers checking registration status</Text>
          </ControlPanel>
        </AnimatedCard>

        {/* ─── Actions ────────────────────────── */}
        <AnimatedCard index={4}>
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
              <Text style={[styles.actionBtnText, { color: colors.danger }]}>CLEAR LOGS</Text>
            </AnimatedPressable>
          </View>
        </AnimatedCard>

        {/* ─── WA Hits with Screenshots ─────── */}
        <AnimatedCard index={5}>
          <View style={[styles.sectionHeader, { marginTop: spacing['2xl'] }]}>
            <View style={[styles.sectionDot, { backgroundColor: colors.success }]} />
            <Text style={styles.sectionLabel}>WA HITS</Text>
          </View>
        </AnimatedCard>
        <AnimatedCard index={6}>
          <ResultsTable
            title="PLATES · HITS"
            rows={hitRows}
            maxRows={10}
            emptyText="No hits yet"
            accentColor={colors.success}
          />
        </AnimatedCard>

        {/* ─── Live Log ───────────────────────── */}
        <AnimatedCard index={7}>
          <View style={[styles.sectionHeader, { marginTop: spacing['2xl'] }]}>
            <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.sectionLabel}>LIVE STREAM</Text>
          </View>
          <LiveLogPanel file="wa" title="Plate Rotation" height={240} />
        </AnimatedCard>

        {/* ─── Recent Activity ────────────────── */}
        <AnimatedCard index={8}>
          <View style={[styles.sectionHeader, { marginTop: spacing['2xl'] }]}>
            <View style={[styles.sectionDot, { backgroundColor: colors.textMuted }]} />
            <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
          </View>
        </AnimatedCard>

        {isRunning && (
          <AnimatedCard index={9}>
            <View style={styles.runningBanner}>
              <View style={styles.runningDot} />
              <Text style={styles.runningText}>Monitoring live rotation...</Text>
            </View>
          </AnimatedCard>
        )}

        {resultsData?.results && resultsData.results.length > 0 ? (
          resultsData.results.slice(-20).reverse().map((item: string, index: number) => {
            const isHit = item.includes('[HIT');
            const isFail = item.includes('[FAIL');
            const itemColor = isHit ? colors.success : isFail ? colors.danger : colors.textSecondary;
            const badgeLabel = isHit ? 'HIT' : isFail ? 'MISS' : 'LOG';

            return (
              <AnimatedCard key={index} index={10 + index}>
                <View style={styles.resultItem}>
                  <View style={[styles.resultDot, { backgroundColor: itemColor }]} />
                  <View style={styles.resultContent}>
                    <Text style={[styles.resultText, { color: itemColor }]} numberOfLines={2}>
                      {item}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: itemColor + '15' }]}>
                    <Text style={[styles.badgeText, { color: itemColor }]}>{badgeLabel}</Text>
                  </View>
                </View>
              </AnimatedCard>
            );
          })
        ) : (
          <AnimatedCard index={10}>
            <View style={styles.emptyState}>
              <MaterialIcons name="search-off" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>No activity yet</Text>
              <Text style={styles.emptyHint}>Start a plate rotation to see results</Text>
            </View>
          </AnimatedCard>
        )}

        <View style={{ height: spacing['5xl'] }} />
      </ScrollView>

      <Snackbar visible={showSnack} onDismiss={dismissSnack} duration={3000} style={styles.snackbar}>
        {snackMessage}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  scrollContent: { padding: spacing.xl },
  header: { marginBottom: spacing['2xl'], marginTop: spacing.md },
  eyebrow: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 4,
    fontFamily: 'monospace',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  // Stats
  statsGrid: {
    flexDirection: 'row',
    gap: 1,
    backgroundColor: colors.borderSubtle,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCell: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize['4xl'],
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    fontFamily: 'monospace',
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: fontSize['2xs'],
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 2,
    fontFamily: 'monospace',
    marginTop: spacing.sm,
  },
  // Sections
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 3,
    fontFamily: 'monospace',
  },
  helpHint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 14,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary + '25',
    backgroundColor: colors.primaryMuted,
  },
  actionBtnDanger: {
    borderColor: colors.danger + '25',
    backgroundColor: colors.dangerMuted,
  },
  actionBtnText: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  // Running Banner
  runningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successMuted,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.success + '20',
  },
  runningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  runningText: {
    color: colors.success,
    fontWeight: '700',
    fontSize: fontSize.md,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  // Results
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  resultDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  resultContent: {
    flex: 1,
  },
  resultText: {
    fontFamily: 'monospace',
    fontSize: fontSize.sm,
    lineHeight: 16,
  },
  badge: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: fontSize['2xs'],
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  // Empty
  emptyState: {
    padding: spacing['5xl'],
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    fontFamily: 'monospace',
  },
  snackbar: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
});
