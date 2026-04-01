import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useStatusQuery,
  useAnalyticsQuery,
  useWaCheckoutStatusQuery,
  usePlateCheckStatusQuery,
  useResultsQuery,
  usePaginatedResultsQuery,
} from '@/hooks/useQueries';
import { StatusIsland } from '@/components/StatusIsland';
import { HeroStats } from '@/components/HeroStats';
import { ControlPanel } from '@/components/ControlPanel';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { LiveLogPanel } from '@/components/LiveLogPanel';
import { FilePickerButton } from '@/components/FilePickerButton';
import { CardSelectionModal } from '@/components/CardSelectionModal';
import { ShimmerLoader, ShimmerBlock } from '@/components/ShimmerLoader';
import { AnimatedCard } from '@/components/AnimatedCard';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ResultsTable } from '@/components/ResultsTable';
import { impactHeavy } from '@/utils/haptics';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, Button, Snackbar, SegmentedButtons, Searchbar } from 'react-native-paper';
import { api } from '@/services/api';
import { useActionHandler } from '@/hooks/useActionHandler';
import { colors, spacing, radii, fontSize, shadows, pageMargins } from '@/constants/theme';

export default function DashboardScreen() {
  const [activeSubTab, setActiveSubTab] = useState<'monitor' | 'results'>('monitor');
  
  // MONITOR STATES
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useStatusQuery();
  const { data: checkoutStatus, isLoading: checkoutLoading, refetch: refetchCheckout } = useWaCheckoutStatusQuery();
  const { data: plateStatus, isLoading: plateLoading, refetch: refetchPlate } = usePlateCheckStatusQuery();
  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useAnalyticsQuery();
  const { data: ccResults } = useResultsQuery();

  const { isLoading: actionLoading, snackMessage, showSnack, dismissSnack, execute } = useActionHandler();
  const [showCardModal, setShowCardModal] = useState(false);
  const [checkoutTerm, setCheckoutTerm] = useState<string>('12');

  // RESULTS STATES
  const [activeResultsTab, setActiveResultsTab] = useState<string>('cc');
  const [search, setSearch] = useState('');
  const { data: paginatedData, isLoading: resultsLoading } = usePaginatedResultsQuery(activeResultsTab as any, 1, 50);
  const results = paginatedData?.results || [];

  const filteredResults = useMemo(() => 
    results.filter(r => 
      r.card_number?.includes(search) || 
      r.plate?.includes(search) || 
      r.status?.toLowerCase().includes(search.toLowerCase())
    ), [results, search]);

  const resultsStats = useMemo(() => {
    const total = filteredResults.length;
    const success = filteredResults.filter(r => r.status === 'SUCCESS').length;
    const fail = filteredResults.filter(r => r.status === 'FAIL' || r.status === 'ERROR').length;
    const unknown = filteredResults.filter(r => r.status === 'UNKNOWN').length;
    return { total, success, fail, unknown };
  }, [filteredResults]);

  const isRefreshing = statusLoading || analyticsLoading || checkoutLoading || plateLoading;

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
    refetchPlate();
  };

  const ccRunning = !!status?.is_running;
  const coRunning = !!checkoutStatus?.is_running;
  const plRunning = !!plateStatus?.is_running;
  const activeCount = [ccRunning, coRunning, plRunning].filter(Boolean).length;

  const activeLabels = useMemo(() => {
    const labels: string[] = [];
    if (ccRunning) labels.push('CC');
    if (coRunning) labels.push('Checkout');
    if (plRunning) labels.push('Plates');
    return labels;
  }, [ccRunning, coRunning, plRunning]);

  const { passCount, failCount, totalChecked, successRate } = useMemo(() => {
    const flat = ccResults?.runs.flat() || [];
    const passes = flat.filter(r => r.status === 'SUCCESS').length;
    const fails = flat.filter(r => r.status === 'FAIL' || r.status === 'ERROR').length;
    const unknown = flat.filter(r => r.status === 'UNKNOWN').length;
    const total = flat.length;
    const rate = total > 0 ? Math.round((passes / total) * 100) : 0;
    return { passCount: passes, failCount: fails, unknownCount: unknown, totalChecked: total, successRate: rate };
  }, [ccResults]);

  const heroData = useMemo(() => ({
    passCount,
    failCount,
    successRate,
    queueCount: status?.remaining_cards || 0,
    totalChecked,
    waPlates: checkoutStatus?.hits_to_process || 0,
  }), [passCount, failCount, successRate, totalChecked, status, checkoutStatus]);

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
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: pageMargins.horizontal }]}
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
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.eyebrow}>AUTOMATION SUITE</Text>
                <Text style={styles.title}>Card Checker</Text>
              </View>
              <SegmentedButtons
                value={activeSubTab}
                onValueChange={setActiveSubTab as any}
                style={styles.subTabSwitcher}
                density="small"
                buttons={[
                  { value: 'monitor', label: 'MONITOR', labelStyle: styles.subTabLabel, icon: 'chart-line' },
                  { value: 'results', label: 'RESULTS', labelStyle: styles.subTabLabel, icon: 'database-search' },
                ]}
              />
            </View>
          </View>
        </AnimatedCard>

        {activeSubTab === 'monitor' ? (
          <View key="monitor-view">
            {/* Monitor Header */}
            <AnimatedCard index={1}>
              {isRefreshing ? (
                <>
                  <StatusIsland activeCount={0} labels={[]} />
                  <HeroStats passCount={0} failCount={0} successRate={0} queueCount={0} totalChecked={0} waPlates={0} />
                </>
              ) : (
                <>
                  <StatusIsland activeCount={activeCount} labels={activeLabels} />
                  <HeroStats {...heroData} />
                </>
              )}
            </AnimatedCard>

            <View style={styles.gridRow}>
              {/* ─── Main Column: Upload & Controls ────── */}
              <View style={styles.mainColumn}>
                <CollapsibleSection title="UPLOAD DATA" icon="cloud-upload" accentColor={colors.primary} defaultOpen>
                  {isRefreshing ? (
                    <ShimmerBlock lines={3} />
                  ) : (
                    <>
                      <FilePickerButton
                        label="Upload Cards (.txt)"
                        icon="upload-file"
                        disabled={actionLoading}
                        onFilePicked={handleFilePicked}
                      />
                      <Text style={styles.helpHint}>Format: CC|MM|YY|CVV — one card per line</Text>
                    </>
                  )}
                </CollapsibleSection>

                <CollapsibleSection title="CONTROLS" icon="tune" accentColor={colors.info} defaultOpen>
                  {isRefreshing ? (
                    <>
                      <ShimmerLoader height={80} style={{ marginBottom: spacing.lg }} />
                      <ShimmerLoader height={80} style={{ marginBottom: spacing.lg }} />
                      <ShimmerLoader height={120} />
                    </>
                  ) : (
                    <>
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

                      <ControlPanel
                        title="Plate Rotation"
                        icon="rotate-right"
                        accentColor={colors.success}
                        isRunning={plRunning}
                        onStart={() => execute(() => api.startPlateCheck(), 'Plate rotation started', 'Failed to start', handleRefresh)}
                        onStop={() => execute(() => api.stopPlateCheck(), 'Plate rotation stopped', 'Failed to stop', handleRefresh)}
                      >
                        <Text style={styles.helpHint}>Automated WA government registration lookup and rotation</Text>
                      </ControlPanel>
                    </>
                  )}
                </CollapsibleSection>
              </View>

              {/* ─── Side Column: Live Activity ─────────── */}
              <View style={styles.sideColumn}>
                <CollapsibleSection title="LIVE ACTIVITY" icon="monitor" accentColor={colors.success} defaultOpen>
                  {isRefreshing ? (
                    <>
                      <ShimmerLoader height={160} style={{ marginBottom: spacing.lg }} />
                      <ShimmerLoader height={160} />
                    </>
                  ) : (
                    <>
                      <LiveLogPanel file="cc" title="CC Checker" height={300} />
                      <LiveLogPanel file="wa" title="Plate Rotation" height={300} />
                      <LiveLogPanel file="wa-checkout" title="WA Checkout" height={300} />
                    </>
                  )}
                </CollapsibleSection>
              </View>
            </View>
          </View>
        ) : (
          <View key="results-view" style={styles.gridRow}>
            {/* ─── Side Column: Filters & Stats ─────── */}
            <View style={styles.sideColumnResults}>
              <View style={styles.block}>
                <Text style={styles.blockTitle}>SEARCH & FILTER</Text>
                <Searchbar
                  placeholder="Search..."
                  value={search}
                  onChangeText={setSearch}
                  style={styles.searchbar}
                  iconColor={colors.textMuted}
                  inputStyle={styles.searchInput}
                  elevation={0}
                />
                <SegmentedButtons
                  value={activeResultsTab}
                  onValueChange={setActiveResultsTab}
                  style={styles.tabs}
                  density="small"
                  buttons={[
                    { value: 'cc', label: 'PPSR/CC', labelStyle: styles.tabLabel, icon: 'credit-card' },
                    { value: 'wa', label: 'WA REGO', labelStyle: styles.tabLabel, icon: 'car' },
                  ]}
                />
              </View>

              <View style={styles.block}>
                <Text style={styles.blockTitle}>SUMMARY</Text>
                <View style={styles.statsRow}>
                  <StatItem label="TOTAL" value={resultsStats.total} color={colors.textPrimary} icon="list" />
                  <StatItem label="SUCCESS" value={resultsStats.success} color={colors.success} icon="check-circle" />
                  <StatItem label="FAILED" value={resultsStats.fail} color={colors.danger} icon="cancel" />
                  <StatItem label="UNKNOWN" value={resultsStats.unknown} color={colors.warning} icon="help-outline" />
                </View>
              </View>
            </View>

            {/* ─── Main Column: Table ────────────────── */}
            <View style={styles.mainColumnResults}>
              <ResultsTable
                title={`${activeResultsTab.toUpperCase()} DATA STREAM`}
                rows={filteredResults.map(r => ({
                  id: r.id || r.timestamp,
                  primary: activeResultsTab === 'cc' 
                    ? `${r.card_number} | ${r.mm}/${r.yy} | ${r.cvv}`
                    : `${r.plate || 'N/A'} — ${r.details || 'Found'}`,
                  secondary: r.timestamp || '',
                  status: r.status || 'UNKNOWN',
                  statusColor: r.status === 'SUCCESS' ? colors.success : 
                               (r.status === 'FAIL' || r.status === 'ERROR' || r.status?.startsWith('ERROR')) ? colors.danger : 
                               colors.warning,
                  imageUrl: r.screenshot_url,
                }))}
                maxRows={20}
                emptyText={resultsLoading ? 'Loading records...' : `No ${activeResultsTab} results found`}
                accentColor={colors.primary}
              />
            </View>
          </View>
        )}

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

function StatItem({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <View style={styles.statItem}>
      <View style={styles.statHeader}>
        <MaterialIcons name={icon as any} size={12} color={color} />
        <Text style={[styles.statLabel, { color }]}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  scrollContent: { paddingBottom: spacing['5xl'] },
  header: { marginBottom: spacing.lg, marginTop: spacing.md },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize['4xl'],
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  subTabSwitcher: {
    width: 260,
  },
  subTabLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  helpHint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    lineHeight: 16,
    paddingLeft: spacing.xs,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  termLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
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
    fontWeight: '600',
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
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: colors.danger + '15',
  },
  clearAllText: {
    color: colors.danger,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  snackbar: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  mainColumn: {
    flex: 1,
    minWidth: 320,
    gap: spacing.md,
  },
  sideColumn: {
    flex: 1.2,
    minWidth: 320,
    gap: spacing.md,
  },
  // Results Specific Styles
  mainColumnResults: {
    flex: 2.2,
    minWidth: 320,
  },
  sideColumnResults: {
    flex: 1,
    minWidth: 300,
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
    marginBottom: spacing.xs,
  },
  searchbar: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    height: 40,
  },
  searchInput: {
    fontSize: fontSize.sm,
    minHeight: 0,
  },
  tabs: {
    height: 36,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  statItem: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    gap: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});

