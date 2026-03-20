import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useStatusQuery,
  useAnalyticsQuery,
  useWaCheckoutStatusQuery,
  useCarfactsStatusQuery,
  useResultsQuery,
  useWaCheckoutResultsQuery,
  useCarfactsResultsQuery,
} from '@/hooks/useQueries';
import { StatusIsland } from '@/components/StatusIsland';
import { HeroStats } from '@/components/HeroStats';
import { ControlPanel } from '@/components/ControlPanel';
import { LiveLogPanel } from '@/components/LiveLogPanel';
import { ResultsTable } from '@/components/ResultsTable';
import { FilePickerButton } from '@/components/FilePickerButton';
import { CardSelectionModal } from '@/components/CardSelectionModal';
import { Text, Button, Snackbar } from 'react-native-paper';
import { api } from '@/services/api';
import { useActionHandler } from '@/hooks/useActionHandler';
import { colors, spacing, radii } from '@/constants/theme';

export default function DashboardScreen() {
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useStatusQuery();
  const { data: checkoutStatus, isLoading: checkoutLoading, refetch: refetchCheckout } = useWaCheckoutStatusQuery();
  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useAnalyticsQuery();
  const { data: carfactsStatus, isLoading: carfactsLoading, refetch: refetchCarfacts } = useCarfactsStatusQuery();
  const { data: ccResults } = useResultsQuery();
  const { data: waCheckoutResults } = useWaCheckoutResultsQuery();
  const { data: carfactsResults } = useCarfactsResultsQuery();

  const { isLoading: actionLoading, snackMessage, showSnack, dismissSnack, execute } = useActionHandler();
  const [showCardModal, setShowCardModal] = useState(false);

  const isRefreshing = statusLoading || analyticsLoading || checkoutLoading || carfactsLoading;

  useEffect(() => {
    setShowCardModal(!!checkoutStatus?.pending_payment);
  }, [checkoutStatus?.pending_payment]);

  const handleRefresh = () => {
    refetchStatus();
    refetchAnalytics();
    refetchCheckout();
    refetchCarfacts();
  };

  // ─── Derived Data ──────────────────────────
  const ccRunning = !!status?.is_running;
  const coRunning = !!checkoutStatus?.is_running;
  const cfRunning = !!carfactsStatus?.is_running;
  const activeCount = [ccRunning, coRunning, cfRunning].filter(Boolean).length;

  const activeLabels = useMemo(() => {
    const labels: string[] = [];
    if (ccRunning) labels.push('CC');
    if (coRunning) labels.push('Checkout');
    if (cfRunning) labels.push('CarFacts');
    return labels;
  }, [ccRunning, coRunning, cfRunning]);

  const heroStats = useMemo(() => [
    { value: status?.total_processed || 0, label: 'LIVE CARDS · PPSR', color: colors.primary },
    { value: status?.remaining_cards || 0, label: 'QUEUED · PPSR', color: colors.textPrimary },
    { value: checkoutStatus?.hits_to_process || 0, label: 'LIVE · WA REGO', color: colors.accent },
    { value: carfactsStatus?.results_count || 0, label: 'CHECKED · CARFACTS', color: colors.warning },
  ], [status, checkoutStatus, carfactsStatus]);

  // ─── Results Data ───────────────────────
  const ccResultRows = useMemo(() => {
    const flat = ccResults?.runs.flat() || [];
    return [...flat].reverse().map((r, i) => ({
      id: `cc-${r.card_number}-${i}`,
      primary: `•••• ${r.card_number.slice(-4)}`,
      secondary: `${r.mm}/${r.yy} · CVV ${r.cvv}`,
      status: r.status,
      statusColor: r.status === 'SUCCESS' ? colors.success
        : r.status === 'PASS' ? colors.primary
        : r.status === 'FAIL' ? colors.danger
        : colors.warning,
      timestamp: r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
    }));
  }, [ccResults]);

  const waResultRows = useMemo(() => {
    const checkouts = [...(waCheckoutResults || [])].reverse();
    return checkouts.map((r: any, i: number) => ({
      id: `co-${i}`,
      primary: r.plate,
      secondary: `Card ...${r.card_last4 || '????'} · ${r.mm || '??'}/${r.yy || '??'}`,
      status: r.status || 'UNKNOWN',
      statusColor: r.status === 'SUCCESS' ? colors.success
        : r.status === 'FAILED' ? colors.danger
        : colors.warning,
      timestamp: r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
    }));
  }, [waCheckoutResults]);

  const cfResultRows = useMemo(() => {
    const results = [...(carfactsResults || [])].reverse();
    return results.map((r: any, i: number) => ({
      id: `cf-${i}`,
      primary: r.plate,
      secondary: r.card_last4 ? `Card ...${r.card_last4}` : (r.details || r.error || 'Report check'),
      status: r.status || 'UNKNOWN',
      statusColor: r.status === 'SUCCESS' ? colors.success
        : r.status === 'FAILED' ? colors.danger
        : r.status === 'NO_REPORT' ? colors.textMuted
        : r.status === 'CRASH' ? colors.danger
        : colors.warning,
      timestamp: r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
    }));
  }, [carfactsResults]);

  const handleFilePicked = async (uri: string, name: string) => {
    await execute(
      () => api.uploadFile(uri, 'cc', name),
      'Cards uploaded',
      'Upload failed',
      handleRefresh,
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
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ─── Header ──────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.title}>COMMAND{'\n'}CENTER</Text>
        </View>

        {/* ─── Status Island ───────────────────── */}
        <StatusIsland activeCount={activeCount} labels={activeLabels} />

        {/* ─── Hero Stats Bento Grid ───────────── */}
        <HeroStats stats={heroStats} />

        {/* ─── Upload Section ───────────────────── */}
        <Text style={styles.sectionLabel}>UPLOAD DATA</Text>
        <View style={styles.uploadSection}>
          <FilePickerButton
            label="Upload Cards (.txt)"
            icon="credit-card"
            disabled={actionLoading}
            onFilePicked={handleFilePicked}
          />
          <Text style={styles.helpHint}>
            Format: CC|MM|YY|CVV per line
          </Text>
        </View>

        {/* ─── Section Label ───────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>CONTROLS</Text>

        {/* ─── CC Checker Panel ────────────────── */}
        <ControlPanel
          title="CC / PPSR Checker"
          icon="credit-score"
          accentColor={colors.info}
          isRunning={ccRunning}
          isLoading={actionLoading}
          onStart={() => execute(() => api.startProcessing(), 'CC Checker started', 'Failed to start', handleRefresh)}
          onStop={() => execute(() => api.stopProcessing(), 'CC Checker stopped', 'Failed to stop', handleRefresh)}
        >
          <Text style={styles.helpHint}>Validates cards via PPSR payment gateway. Uses cards from upload.</Text>
        </ControlPanel>

        <ResultsTable title="PPSR Results" rows={ccResultRows} maxRows={5} emptyText="No cards checked yet" />

        {/* ─── CarFacts Panel ───────────────────── */}
        <ControlPanel
          title="CarFacts Report"
          icon="fact-check"
          accentColor={colors.warning}
          isRunning={cfRunning}
          isLoading={actionLoading}
          onStart={() => execute(() => api.startCarfacts(), 'CarFacts started', 'Failed to start', handleRefresh)}
          onStop={() => execute(() => api.stopCarfacts(), 'CarFacts stopped', 'Failed to stop', handleRefresh)}
          startDisabled={(carfactsStatus?.pending_plates || 0) === 0}
        >
          <Text style={styles.helpHint}>
            Purchases CarFacts vehicle reports using PASS/SUCCESS cards. Uses plates from upload.
          </Text>
        </ControlPanel>

        <ResultsTable title="CarFacts Results" rows={cfResultRows} maxRows={5} emptyText="No reports yet" />

        {/* ─── WA Checkout Panel ───────────────── */}
        <ControlPanel
          title="WA Checkout"
          icon="shopping-cart-checkout"
          accentColor={colors.accent}
          isRunning={coRunning}
          isLoading={actionLoading}
          onStart={() => execute(() => api.startWaCheckout(), 'Checkout started', 'Failed to start', handleRefresh)}
          onStop={() => execute(() => api.stopWaCheckout(), 'Checkout stopped', 'Failed to stop', handleRefresh)}
          startDisabled={checkoutStatus?.hits_to_process === 0}
        >
          {checkoutStatus?.pending_payment ? (
            <Button
              mode="contained"
              onPress={() => setShowCardModal(true)}
              icon="credit-card-plus"
              style={styles.urgentBtn}
              labelStyle={styles.compactLabel}
            >
              Select Card — {checkoutStatus.pending_payment.plate}
            </Button>
          ) : (
            <Text style={styles.helpHint}>
              Automates WA rego payments for discovered hits. Prompts for card selection.
            </Text>
          )}
        </ControlPanel>

        <ResultsTable title="WA Rego Results" rows={waResultRows} maxRows={5} emptyText="No hits or checkouts yet" />

        {/* ─── Live Activity Terminal ──────────── */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>LIVE ACTIVITY</Text>
        <LiveLogPanel file="cc" title="CC Checker" height={150} />
        <LiveLogPanel file="carfacts" title="CarFacts" height={150} />
        <LiveLogPanel file="wa-checkout" title="WA Checkout" height={150} />

        {/* ─── Footer Actions ──────────────────── */}
        <View style={styles.footerRow}>
          <Button
            icon="delete-sweep"
            mode="text"
            compact
            onPress={() =>
              execute(
                async () => {
                  await api.clearResults();
                  await api.clearPlateResults();
                  await api.clearWaCheckoutLogs();
                  await api.clearCarfactsLogs();
                },
                'All data cleared',
                'Failed to clear',
                handleRefresh,
              )
            }
            textColor={colors.textMuted}
            labelStyle={styles.footerLabel}
          >
            Clear All
          </Button>
        </View>
      </ScrollView>

      {checkoutStatus?.pending_payment && (
        <CardSelectionModal
          visible={showCardModal}
          plate={checkoutStatus.pending_payment.plate}
          onSelect={(card) =>
            execute(
              () => api.selectCard(card),
              'Card selected',
              'Failed to select card',
              () => {
                setShowCardModal(false);
                handleRefresh();
              },
            )
          }
          onDismiss={() => setShowCardModal(false)}
        />
      )}

      <Snackbar
        visible={showSnack}
        onDismiss={dismissSnack}
        duration={3000}
        style={styles.snackbar}
      >
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
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  header: {
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -1,
    lineHeight: 40,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginBottom: spacing.md,
  },
  uploadSection: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  helpHint: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: spacing.sm,
    lineHeight: 14,
  },
  compactBtn: {
    borderColor: colors.border,
    borderRadius: radii.sm,
  },
  compactLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  urgentBtn: {
    backgroundColor: colors.danger,
    borderRadius: radii.sm,
  },
  footerRow: {
    alignItems: 'center',
    marginTop: spacing['2xl'],
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  snackbar: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
