import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useResultsQuery,
  useWaRegoHitsQuery,
  useWaCheckoutResultsQuery,
  useCarfactsResultsQuery,
} from '@/hooks/useQueries';
import { Text, Snackbar } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { api, API_BASE_URL } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';
import { useActionHandler } from '@/hooks/useActionHandler';
import { ResultsTable } from '@/components/ResultsTable';
import { AnimatedCard } from '@/components/AnimatedCard';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { impactHeavy } from '@/utils/haptics';
import { colors, spacing, radii, fontSize, shadows } from '@/constants/theme';

const isPass = (s: string) => s === 'SUCCESS' || s === 'PASS' || s === 'UNKNOWN';

export default function ResultsScreen() {
  const queryClient = useQueryClient();
  const { isLoading: actionLoading, snackMessage, showSnack, dismissSnack, execute } = useActionHandler();

  const { data: ccResults, isLoading: ccLoading, refetch: refetchCC } = useResultsQuery();
  const { data: waHits, isLoading: waHitsLoading, refetch: refetchWAHits } = useWaRegoHitsQuery();
  const { data: waCheckoutResults, isLoading: waLoading, refetch: refetchWA } = useWaCheckoutResultsQuery();
  const { data: carfactsResults, isLoading: cfLoading, refetch: refetchCF } = useCarfactsResultsQuery();

  const isRefreshing = ccLoading || waHitsLoading || waLoading || cfLoading;

  const handleRefresh = () => { refetchCC(); refetchWAHits(); refetchWA(); refetchCF(); };

  const handleClearAll = () => {
    Alert.alert('Clear All Results', 'Clear results from all checkers?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: () => {
          impactHeavy();
          execute(
            async () => {
              await api.clearResults();
              await api.clearWaCheckoutLogs();
              await api.clearCarfactsLogs();
              queryClient.invalidateQueries({ queryKey: ['results'] });
              queryClient.invalidateQueries({ queryKey: ['waCheckoutResults'] });
              queryClient.invalidateQueries({ queryKey: ['carfactsResults'] });
            },
            'All results cleared',
            'Failed to clear',
          );
        },
      },
    ]);
  };

  const fmt = (ts?: string) =>
    ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined;

  const toRow = (id: string, primary: string, secondary: string, status: string, statusColor: string, timestamp?: string, imageUrl?: string) =>
    ({ id, primary, secondary, status, statusColor, timestamp, imageUrl });

  // ─── PPSR
  const ccAllRows = useMemo(() => {
    const flat = ccResults?.runs.flat() || [];
    return [...flat].reverse().map((r, i) =>
      toRow(`cc-${i}`, r.card_number, `${r.mm}/${r.yy} · CVV ${r.cvv}`, r.status,
        isPass(r.status) ? colors.success : colors.danger, fmt(r.timestamp))
    );
  }, [ccResults]);
  const ccPassRows = useMemo(() => ccAllRows.filter(r => isPass(r.status)), [ccAllRows]);
  const ccFailRows = useMemo(() => ccAllRows.filter(r => !isPass(r.status)), [ccAllRows]);

  // ─── WA Plate Hits (with screenshots)
  const waHitRows = useMemo(() => {
    const hits = [...(waHits || [])].reverse();
    return hits.map((r: any, i: number) => {
      const screenshotUrl = r.screenshot ? `${API_BASE_URL}/screenshots/hits/${r.screenshot}` : undefined;
      return toRow(`hit-${i}`, r.plate, r.details || 'Account Found',
        'HIT', colors.success, fmt(r.timestamp), screenshotUrl);
    });
  }, [waHits]);

  // ─── WA Checkout
  const waAllRows = useMemo(() => {
    const checkouts = [...(waCheckoutResults || [])].reverse();
    return checkouts.map((r: any, i: number) => {
      const screenshotUrl = r.screenshot ? `${API_BASE_URL}/screenshots/hits/${r.screenshot}` : undefined;
      return toRow(`co-${i}`, r.plate, r.card_number || `...${r.card_last4 || '????'}`,
        r.status || 'UNKNOWN', r.status === 'SUCCESS' ? colors.success : colors.danger, fmt(r.timestamp), screenshotUrl);
    });
  }, [waCheckoutResults]);
  const waPassRows = useMemo(() => waAllRows.filter(r => r.status === 'SUCCESS'), [waAllRows]);
  const waFailRows = useMemo(() => waAllRows.filter(r => r.status !== 'SUCCESS'), [waAllRows]);

  // ─── CarFacts
  const cfAllRows = useMemo(() => {
    const results = [...(carfactsResults || [])].reverse();
    return results.map((r: any, i: number) =>
      toRow(`cf-${i}`, r.plate, r.card_number || (r.card_last4 ? `...${r.card_last4}` : (r.details || r.error || 'Check')),
        r.status || 'UNKNOWN', r.status === 'SUCCESS' ? colors.success : colors.danger, fmt(r.timestamp))
    );
  }, [carfactsResults]);
  const cfPassRows = useMemo(() => cfAllRows.filter(r => r.status === 'SUCCESS'), [cfAllRows]);
  const cfFailRows = useMemo(() => cfAllRows.filter(r => r.status !== 'SUCCESS'), [cfAllRows]);

  // ─── Summary
  const totalResults = ccAllRows.length + waHitRows.length + waAllRows.length + cfAllRows.length;
  const totalPass = ccPassRows.length + waHitRows.length + waPassRows.length + cfPassRows.length;
  const totalFail = ccFailRows.length + waFailRows.length + cfFailRows.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh}
            tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {/* ─── Header ─────────────────────────── */}
        <AnimatedCard index={0}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.eyebrow}>DATA LOG</Text>
              <Text style={styles.headerTitle}>Results</Text>
            </View>
            <AnimatedPressable
              onPress={handleClearAll}
              disabled={actionLoading}
              style={styles.clearBtn}
            >
              <MaterialIcons name="delete-outline" size={16} color={colors.danger} />
              <Text style={styles.clearBtnText}>CLEAR</Text>
            </AnimatedPressable>
          </View>
        </AnimatedCard>

        {/* ─── Summary Cards ─────────────────── */}
        <AnimatedCard index={1}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{totalResults}</Text>
              <Text style={styles.summaryLabel}>TOTAL</Text>
            </View>
            <View style={[styles.summaryCard, { borderTopColor: colors.success }]}>
              <Text style={[styles.summaryValue, { color: colors.success }]}>{totalPass}</Text>
              <Text style={styles.summaryLabel}>PASS</Text>
            </View>
            <View style={[styles.summaryCard, { borderTopColor: colors.danger }]}>
              <Text style={[styles.summaryValue, { color: colors.danger }]}>{totalFail}</Text>
              <Text style={styles.summaryLabel}>FAIL</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* ─── Per-source breakdown ──────────── */}
        <AnimatedCard index={2}>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <MaterialIcons name="credit-score" size={12} color={colors.info} />
              <Text style={styles.breakdownText}>{ccAllRows.length} PPSR</Text>
            </View>
            <View style={styles.breakdownItem}>
              <MaterialIcons name="gps-fixed" size={12} color={colors.success} />
              <Text style={styles.breakdownText}>{waHitRows.length} HITS</Text>
            </View>
            <View style={styles.breakdownItem}>
              <MaterialIcons name="shopping-cart" size={12} color={colors.accent} />
              <Text style={styles.breakdownText}>{waAllRows.length} WA</Text>
            </View>
            <View style={styles.breakdownItem}>
              <MaterialIcons name="fact-check" size={12} color={colors.warning} />
              <Text style={styles.breakdownText}>{cfAllRows.length} CF</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* ─── PPSR Section ────────────────────── */}
        <AnimatedCard index={3}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: colors.info }]} />
            <Text style={styles.sectionLabel}>PPSR / CC CHECKER</Text>
          </View>
        </AnimatedCard>
        <AnimatedCard index={4}>
          <ResultsTable title="PPSR · PASS" rows={ccPassRows} maxRows={5} emptyText="No passes yet" />
        </AnimatedCard>
        <AnimatedCard index={5}>
          <ResultsTable title="PPSR · FAIL" rows={ccFailRows} maxRows={5} emptyText="No fails yet" />
        </AnimatedCard>

        {/* ─── WA Plate Hits Section ────────────── */}
        <AnimatedCard index={6}>
          <View style={[styles.sectionHeader, { marginTop: spacing['2xl'] }]}>
            <View style={[styles.sectionDot, { backgroundColor: colors.success }]} />
            <Text style={styles.sectionLabel}>WA PLATE HITS</Text>
          </View>
        </AnimatedCard>
        <AnimatedCard index={7}>
          <ResultsTable title="PLATES · HITS" rows={waHitRows} maxRows={10} emptyText="No hits yet" accentColor={colors.success} />
        </AnimatedCard>

        {/* ─── WA Checkout Section ─────────────── */}
        <AnimatedCard index={8}>
          <View style={[styles.sectionHeader, { marginTop: spacing['2xl'] }]}>
            <View style={[styles.sectionDot, { backgroundColor: colors.accent }]} />
            <Text style={styles.sectionLabel}>WA CHECKOUT</Text>
          </View>
        </AnimatedCard>
        <AnimatedCard index={9}>
          <ResultsTable title="WA CHECKOUT · PASS" rows={waPassRows} maxRows={5} emptyText="No passes yet" />
        </AnimatedCard>
        <AnimatedCard index={10}>
          <ResultsTable title="WA CHECKOUT · FAIL" rows={waFailRows} maxRows={5} emptyText="No fails yet" />
        </AnimatedCard>

        {/* ─── CarFacts Section ────────────────── */}
        <AnimatedCard index={11}>
          <View style={[styles.sectionHeader, { marginTop: spacing['2xl'] }]}>
            <View style={[styles.sectionDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.sectionLabel}>CARFACTS</Text>
          </View>
        </AnimatedCard>
        <AnimatedCard index={12}>
          <ResultsTable title="CARFACTS · PASS" rows={cfPassRows} maxRows={5} emptyText="No passes yet" />
        </AnimatedCard>
        <AnimatedCard index={13}>
          <ResultsTable title="CARFACTS · FAIL" rows={cfFailRows} maxRows={5} emptyText="No fails yet" />
        </AnimatedCard>

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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing['2xl'],
    marginTop: spacing.md,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 4,
    fontFamily: 'monospace',
    marginBottom: spacing.sm,
  },
  headerTitle: { fontSize: fontSize['3xl'], fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.danger + '25',
    backgroundColor: colors.dangerMuted,
  },
  clearBtnText: {
    color: colors.danger,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 3,
    borderTopColor: colors.primary,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    fontFamily: 'monospace',
  },
  summaryLabel: {
    fontSize: fontSize['2xs'],
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 2,
    fontFamily: 'monospace',
    marginTop: spacing.xs,
  },
  // Breakdown
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing['2xl'],
    marginBottom: spacing['2xl'],
    paddingVertical: spacing.md,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  breakdownText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    fontFamily: 'monospace',
  },
  // Sections
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 3,
    fontFamily: 'monospace',
  },
  snackbar: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
});
