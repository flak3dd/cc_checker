import React, { useState, useMemo } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useResultsQuery,
  useWaRegoHitsQuery,
  useWaCheckoutResultsQuery,
} from '@/hooks/useQueries';
import {
  Text,
  ActivityIndicator,
  Chip,
  Button,
  Snackbar,
  SegmentedButtons,
} from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { CardResult, CardStatus } from '@/types';
import { api } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';
import { useActionHandler } from '@/hooks/useActionHandler';
import { colors, spacing, radii } from '@/constants/theme';

const API_BASE_URL = 'http://localhost:8000';

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: colors.success,
  PASS: colors.primary,
  FAIL: colors.danger,
  FAILED: colors.danger,
  ERROR_PREPAYMENT: colors.warning,
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? colors.textMuted;
}

export default function ResultsScreen() {
  const [tab, setTab] = useState('cc');
  const [filterStatus, setFilterStatus] = useState<CardStatus | 'ALL'>('ALL');
  const queryClient = useQueryClient();
  const { isLoading: actionLoading, snackMessage, showSnack, dismissSnack, execute } = useActionHandler();

  const { data: resultsData, isLoading: ccLoading, refetch: refetchCC } = useResultsQuery();
  const { data: waHits, isLoading: waHitsLoading, refetch: refetchWaHits } = useWaRegoHitsQuery();
  const { data: waCheckoutResults, isLoading: waCheckoutLoading, refetch: refetchWaCheckout } = useWaCheckoutResultsQuery();

  const handleRefresh = () => {
    if (tab === 'cc') refetchCC();
    else {
      refetchWaHits();
      refetchWaCheckout();
    }
  };

  const handleClearResults = () => {
    const label = tab === 'cc' ? 'CC' : 'WA';
    const doClear = () => {
      execute(
        async () => {
          if (tab === 'cc') {
            await api.clearResults();
            queryClient.invalidateQueries({ queryKey: ['results'] });
          } else {
            await api.clearPlateResults();
            await api.clearWaCheckoutLogs();
            queryClient.invalidateQueries({ queryKey: ['waRegoHits'] });
            queryClient.invalidateQueries({ queryKey: ['waCheckoutResults'] });
          }
        },
        'Results cleared',
        'Failed to clear results',
      );
    };

    Alert.alert(
      'Clear Results',
      `Clear all ${label} results?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: doClear },
      ],
    );
  };

  const handleRerun = (run: CardResult[], runIndex: number) => {
    const cards = run.map(({ card_number, mm, yy, cvv }) => ({ card_number, mm, yy, cvv }));
    execute(
      () => api.rerunCards(cards),
      `Re-queued ${cards.length} cards`,
      'Failed to re-queue cards',
      () => queryClient.invalidateQueries({ queryKey: ['status'] }),
    );
  };

  const openScreenshot = (path?: string) => {
    if (!path) return;
    const url = `${API_BASE_URL}/screenshots/hits/${path}`;
    Linking.openURL(url);
  };

  // ─── CC Results ────────────────────────────
  const renderCCResults = () => {
    const runs = resultsData?.runs || [];

    const filterRun = (run: CardResult[]) =>
      filterStatus === 'ALL' ? run : run.filter((r) => r.status === filterStatus);

    if (ccLoading && !resultsData) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;

    return (
      <View>
        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {(['ALL', 'SUCCESS', 'FAIL'] as const).map((key) => {
            const active = filterStatus === key;
            const chipColor = key === 'ALL' ? colors.primary : key === 'SUCCESS' ? colors.success : colors.danger;
            return (
              <Chip
                key={key}
                selected={active}
                onPress={() => setFilterStatus(key)}
                style={[styles.filterChip, active && { backgroundColor: `${chipColor}25`, borderColor: chipColor }]}
                textStyle={[styles.filterChipText, active && { color: chipColor }]}
                selectedColor={chipColor}
              >
                {key === 'ALL' ? 'All' : key === 'SUCCESS' ? 'Pass' : 'Fail'}
              </Chip>
            );
          })}
        </View>

        {runs.length > 0 ? (
          runs.map((run, runIndex) => {
            const filtered = filterRun(run);
            if (filtered.length === 0) return null;
            const successCount = run.filter((r) => r.status === 'SUCCESS').length;
            const failCount = run.length - successCount;

            return (
              <View key={`run-${runIndex}`} style={styles.runContainer}>
                {/* Run Header */}
                <View style={styles.runHeader}>
                  <Text style={styles.runTitle}>Run #{runs.length - runIndex}</Text>
                  <View style={styles.runMeta}>
                    <Text style={styles.runStats}>
                      {run.length} cards · {successCount}✓ {failCount}✗
                    </Text>
                    <Button
                      icon="refresh"
                      mode="text"
                      compact
                      onPress={() => handleRerun(run, runIndex)}
                      disabled={actionLoading}
                      textColor={colors.primary}
                      labelStyle={styles.rerunLabel}
                    >
                      Re-run
                    </Button>
                  </View>
                </View>
                {/* Card Rows */}
                <View style={styles.cardsList}>
                  {filtered.map((result, i) => (
                    <View key={`${result.card_number}-${i}`} style={styles.cardRow}>
                      <Text style={styles.cardNumber}>{result.card_number}</Text>
                      <Text style={styles.cardExpiry}>{result.mm}/{result.yy}</Text>
                      <Text style={styles.cardCvv}>{result.cvv}</Text>
                      <Text style={[styles.cardStatus, { color: getStatusColor(result.status) }]}>
                        {result.status}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="credit-card-off" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No CC results found</Text>
          </View>
        )}
      </View>
    );
  };

  // ─── WA Results ────────────────────────────
  const renderWAResults = () => {
    if (waHitsLoading || waCheckoutLoading)
      return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;

    const combinedCheckout = [...(waCheckoutResults || [])].reverse();
    const combinedHits = [...(waHits || [])].reverse();

    return (
      <View>
        {/* Checkout Outcomes */}
        <Text style={styles.sectionTitle}>Checkout Outcomes</Text>
        {combinedCheckout.length > 0 ? (
          combinedCheckout.map((res: any, i: number) => (
            <View key={`checkout-${i}`} style={styles.waItem}>
              <View style={[styles.waIcon, { backgroundColor: `${getStatusColor(res.status)}20` }]}>
                <MaterialIcons
                  name={res.status === 'SUCCESS' ? 'check-circle' : 'cancel'}
                  size={20}
                  color={getStatusColor(res.status)}
                />
              </View>
              <View style={styles.waInfo}>
                <Text style={styles.waPlate}>{res.plate}</Text>
                <Text style={styles.waTimestamp}>
                  {new Date(res.timestamp).toLocaleTimeString()} · {res.status}
                </Text>
              </View>
              <Button compact icon="image" onPress={() => openScreenshot(res.screenshot)} textColor={colors.textSecondary}>
                View
              </Button>
            </View>
          ))
        ) : (
          <Text style={styles.emptyInner}>No checkout results yet</Text>
        )}

        {/* Discovery Hits */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Discovery Hits</Text>
        {combinedHits.length > 0 ? (
          combinedHits.map((hit: any, i: number) => (
            <View key={`hit-${i}`} style={styles.waItem}>
              <View style={[styles.waIcon, { backgroundColor: colors.infoMuted }]}>
                <MaterialIcons name="directions-car" size={20} color={colors.info} />
              </View>
              <View style={styles.waInfo}>
                <Text style={styles.waPlate}>{hit.plate}</Text>
                <Text style={styles.waTimestamp}>
                  {new Date(hit.timestamp).toLocaleTimeString()} · {hit.details}
                </Text>
              </View>
              <Button compact icon="image" onPress={() => openScreenshot(hit.screenshot)} textColor={colors.textSecondary}>
                Hit
              </Button>
            </View>
          ))
        ) : (
          <Text style={styles.emptyInner}>No rego hits found yet</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={ccLoading || waHitsLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Results</Text>
            <Text style={styles.headerSub}>
              {tab === 'cc'
                ? `${resultsData?.total || 0} cards processed`
                : `${waHits?.length || 0} hits found`}
            </Text>
          </View>
          <Button
            icon="delete-outline"
            mode="outlined"
            onPress={handleClearResults}
            disabled={actionLoading}
            textColor={colors.danger}
            style={styles.clearBtn}
            labelStyle={{ fontSize: 12 }}
          >
            Clear
          </Button>
        </View>

        {/* Tab Selector */}
        <SegmentedButtons
          value={tab}
          onValueChange={setTab}
          buttons={[
            { value: 'cc', label: 'CC Checker', icon: 'credit-card' },
            { value: 'wa', label: 'WA Rego', icon: 'car' },
          ]}
          style={styles.segmented}
          theme={{
            colors: {
              secondaryContainer: colors.primaryMuted,
              onSecondaryContainer: colors.primary,
              onSurface: colors.textSecondary,
              outline: colors.border,
            },
          }}
        />

        {tab === 'cc' ? renderCCResults() : renderWAResults()}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Snackbar visible={showSnack} onDismiss={dismissSnack} duration={3000} style={styles.snackbar}>
        {snackMessage}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  clearBtn: {
    borderColor: colors.border,
    borderRadius: radii.sm,
  },
  segmented: {
    marginBottom: spacing.xl,
  },
  // ── Filters ──
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  // ── CC Run ──
  runContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  runHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  runTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  runMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  runStats: {
    color: colors.textMuted,
    fontSize: 11,
  },
  rerunLabel: {
    fontSize: 11,
  },
  cardsList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceElevated,
    gap: spacing.md,
  },
  cardNumber: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.textPrimary,
  },
  cardExpiry: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.textSecondary,
    width: 45,
  },
  cardCvv: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.textSecondary,
    width: 30,
  },
  cardStatus: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    width: 60,
    textAlign: 'right',
  },
  // ── WA Results ──
  sectionTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    letterSpacing: 0.3,
  },
  waItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  waIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waInfo: {
    flex: 1,
  },
  waPlate: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  waTimestamp: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  // ── Empty ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  emptyInner: {
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.md,
    fontSize: 13,
  },
  snackbar: {
    backgroundColor: colors.surfaceElevated,
  },
});
