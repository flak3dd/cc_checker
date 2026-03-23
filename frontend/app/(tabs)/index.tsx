import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useStatusQuery,
  useAnalyticsQuery,
  useWaCheckoutStatusQuery,
  useCarfactsStatusQuery,
  useResultsQuery,
} from '@/hooks/useQueries';
import { StatusIsland } from '@/components/StatusIsland';
import { HeroStats } from '@/components/HeroStats';
import { ControlPanel } from '@/components/ControlPanel';
import { LiveLogPanel } from '@/components/LiveLogPanel';
import { FilePickerButton } from '@/components/FilePickerButton';
import { CardSelectionModal } from '@/components/CardSelectionModal';
import { AnimatedCard } from '@/components/AnimatedCard';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { impactHeavy } from '@/utils/haptics';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, Button, Snackbar, SegmentedButtons } from 'react-native-paper';
import { api } from '@/services/api';
import { useActionHandler } from '@/hooks/useActionHandler';
import { colors, spacing, radii, fontSize, shadows } from '@/constants/theme';

export default function DashboardScreen() {
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useStatusQuery();
  const { data: checkoutStatus, isLoading: checkoutLoading, refetch: refetchCheckout } = useWaCheckoutStatusQuery();
  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useAnalyticsQuery();
  const { data: carfactsStatus, isLoading: carfactsLoading, refetch: refetchCarfacts } = useCarfactsStatusQuery();
  const { data: ccResults } = useResultsQuery();

  const { isLoading: actionLoading, snackMessage, showSnack, dismissSnack, execute } = useActionHandler();
  const [showCardModal, setShowCardModal] = useState(false);
  const [checkoutTerm, setCheckoutTerm] = useState<string>('12');

  const isRefreshing = statusLoading || analyticsLoading || checkoutLoading || carfactsLoading;

  useEffect(() => {
    setShowCardModal(!!checkoutStatus?.pending_payment);
  }, [checkoutStatus?.pending_payment]);

  useEffect(() => {
    api.getCheckoutTerm().then(({ term }) => setCheckoutTerm(String(term))).catch(() => {});
  }, []);

  const handleTermChange = (value: string) => {
    setCheckoutTerm(value);
    api.setCheckoutTerm(Number(value) as 3 | 6 | 12).catch(() => {});
  };

  const handleRefresh = () => {
    refetchStatus();
    refetchAnalytics();
    refetchCheckout();
    refetchCarfacts();
  };

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

  const { passCount, failCount, totalChecked, successRate } = useMemo(() => {
    const flat = ccResults?.runs.flat() || [];
    const passes = flat.filter(r => r.status === 'SUCCESS' || r.status === 'PASS' || r.status === 'UNKNOWN').length;
    const fails = flat.length - passes;
    const total = flat.length;
    const rate = total > 0 ? Math.round((passes / total) * 100) : 0;
    return { passCount: passes, failCount: fails, totalChecked: total, successRate: rate };
  }, [ccResults]);

  const heroData = useMemo(() => ({
    passCount,
    failCount,
    successRate,
    queueCount: status?.remaining_cards || 0,
    totalChecked,
    waPlates: checkoutStatus?.hits_to_process || 0,
    cfReports: carfactsStatus?.results_count || 0,
    cfPending: carfactsStatus?.pending_plates || 0,
  }), [passCount, failCount, successRate, totalChecked, status, checkoutStatus, carfactsStatus]);

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
        {/* ─── Header ─────────────────────────── */}
        <AnimatedCard index={0}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>AUTOMATION SUITE</Text>
            <Text style={styles.title}>Card{'\n'}Checker</Text>
          </View>
        </AnimatedCard>

        <AnimatedCard index={1}>
          <StatusIsland activeCount={activeCount} labels={activeLabels} />
        </AnimatedCard>

        <AnimatedCard index={2}>
          <HeroStats {...heroData} />
        </AnimatedCard>

        {/* ─── Upload ──────────────────────────── */}
        <AnimatedCard index={3}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionLabel}>UPLOAD DATA</Text>
          </View>
          <View style={styles.uploadSection}>
            <FilePickerButton
              label="Upload Cards (.txt)"
              icon="upload-file"
              disabled={actionLoading}
              onFilePicked={handleFilePicked}
            />
            <Text style={styles.helpHint}>Format: CC|MM|YY|CVV — one card per line</Text>
          </View>
        </AnimatedCard>

        {/* ─── Controls ────────────────────────── */}
        <AnimatedCard index={4}>
          <View style={[styles.sectionHeader, { marginTop: spacing['2xl'] }]}>
            <View style={[styles.sectionDot, { backgroundColor: colors.info }]} />
            <Text style={styles.sectionLabel}>CONTROLS</Text>
          </View>
        </AnimatedCard>

        <AnimatedCard index={5}>
          <ControlPanel
            title="CC / PPSR Checker"
            icon="credit-score"
            accentColor={colors.info}
            isRunning={ccRunning}
            onStart={() => execute(() => api.startProcessing(), 'CC Checker started', 'Failed to start', handleRefresh)}
            onStop={() => execute(() => api.stopProcessing(), 'CC Checker stopped', 'Failed to stop', handleRefresh)}
          >
            <Text style={styles.helpHint}>Validates cards via PPSR payment gateway</Text>
          </ControlPanel>
        </AnimatedCard>

        <AnimatedCard index={6}>
          <ControlPanel
            title="CarFacts Report"
            icon="fact-check"
            accentColor={colors.warning}
            isRunning={cfRunning}
            onStart={() => execute(() => api.startCarfacts(), 'CarFacts started', 'Failed to start', handleRefresh)}
            onStop={() => execute(() => api.stopCarfacts(), 'CarFacts stopped', 'Failed to stop', handleRefresh)}
            startDisabled={false}
          >
            <Text style={styles.helpHint}>Purchases CarFacts reports using PASS cards</Text>
          </ControlPanel>
        </AnimatedCard>

        <AnimatedCard index={7}>
          <ControlPanel
            title="WA Checkout"
            icon="shopping-cart-checkout"
            accentColor={colors.accent}
            isRunning={coRunning}
            onStart={() => execute(() => api.startWaCheckout(), 'Checkout started', 'Failed to start', handleRefresh)}
            onStop={() => execute(() => api.stopWaCheckout(), 'Checkout stopped', 'Failed to stop', handleRefresh)}
            startDisabled={checkoutStatus?.hits_to_process === 0}
          >
            <View style={styles.termRow}>
              <Text style={styles.termLabel}>TERM</Text>
              <SegmentedButtons
                value={checkoutTerm}
                onValueChange={handleTermChange}
                density="small"
                style={styles.termButtons}
                buttons={[
                  { value: '3', label: '3 mo', style: styles.termBtn, labelStyle: styles.termBtnLabel },
                  { value: '6', label: '6 mo', style: styles.termBtn, labelStyle: styles.termBtnLabel },
                  { value: '12', label: '12 mo', style: styles.termBtn, labelStyle: styles.termBtnLabel },
                ]}
              />
            </View>

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
              <Text style={styles.helpHint}>Automates WA rego payments · {checkoutTerm} month term</Text>
            )}
          </ControlPanel>
        </AnimatedCard>

        {/* ─── Live Activity ───────────────────── */}
        <AnimatedCard index={8}>
          <View style={[styles.sectionHeader, { marginTop: spacing['2xl'] }]}>
            <View style={[styles.sectionDot, { backgroundColor: colors.success }]} />
            <Text style={styles.sectionLabel}>LIVE ACTIVITY</Text>
          </View>
        </AnimatedCard>

        <AnimatedCard index={9}>
          <LiveLogPanel file="cc" title="CC Checker" height={150} />
        </AnimatedCard>
        <AnimatedCard index={10}>
          <LiveLogPanel file="carfacts" title="CarFacts" height={150} />
        </AnimatedCard>
        <AnimatedCard index={11}>
          <LiveLogPanel file="wa-checkout" title="WA Checkout" height={150} />
        </AnimatedCard>

        {/* ─── Footer ──────────────────────────── */}
        <AnimatedCard index={12}>
          <View style={styles.footerRow}>
            <AnimatedPressable
              onPress={() => {
                impactHeavy();
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
                );
              }}
              style={styles.clearAllBtn}
            >
              <MaterialIcons name="delete-sweep" size={16} color={colors.danger} />
              <Text style={styles.clearAllText}>CLEAR ALL DATA</Text>
            </AnimatedPressable>
          </View>
        </AnimatedCard>
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
              () => { setShowCardModal(false); handleRefresh(); },
            )
          }
          onDismiss={() => setShowCardModal(false)}
        />
      )}

      <Snackbar visible={showSnack} onDismiss={dismissSnack} duration={3000} style={styles.snackbar}>
        {snackMessage}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing['5xl'] },
  header: { marginBottom: spacing['3xl'], marginTop: spacing.md },
  eyebrow: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 4,
    fontFamily: 'monospace',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize['5xl'],
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -1.5,
    lineHeight: 46,
  },
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
    backgroundColor: colors.primary,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 3,
    fontFamily: 'monospace',
  },
  uploadSection: {
    marginBottom: spacing.lg,
  },
  helpHint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
    lineHeight: 14,
    paddingLeft: spacing.xs,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  termLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  termButtons: {
    flex: 1,
  },
  termBtn: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  termBtnLabel: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  compactLabel: { fontSize: fontSize.md, fontWeight: '600' },
  urgentBtn: { backgroundColor: colors.danger, borderRadius: radii.md },
  footerRow: {
    alignItems: 'center',
    marginTop: spacing['3xl'],
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: colors.danger + '20',
  },
  clearAllText: {
    color: colors.danger,
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  snackbar: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
});
