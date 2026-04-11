import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useStatusQuery,
  useAnalyticsQuery,
  useGateway2StatusQuery,
  useWaCheckoutStatusQuery,
  usePlateCheckStatusQuery,
  useResultsQuery,
  useGateway2ResultsQuery,
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
  const { data: gateway2Status, isLoading: gateway2Loading, refetch: refetchGateway2 } = useGateway2StatusQuery();
  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useAnalyticsQuery();
  const { data: ccResults } = useResultsQuery();
  const { data: gateway2Results } = useGateway2ResultsQuery();

  const gateway2Running = !!gateway2Status?.is_running;

  const { isLoading: actionLoading, snackMessage, showSnack, dismissSnack, execute } = useActionHandler();
  const [showCardModal, setShowCardModal] = useState(false);
  const [checkoutTerm, setCheckoutTerm] = useState<string>('12');

  // RESULTS STATES
  const [activeResultsTab, setActiveResultsTab] = useState<string>('cc');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'timestamp' | 'status' | 'primary'>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { data: paginatedData, isLoading: resultsLoading } = usePaginatedResultsQuery(activeResultsTab as any, 1, 50);
  const results = paginatedData?.results || [];

  const filteredResults = useMemo(() => {
    let filtered = results.filter(r =>
      r.card_number?.includes(search) ||
      r.plate?.includes(search) ||
      r.status?.toLowerCase().includes(search.toLowerCase())
    );

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'timestamp':
          aVal = new Date(a.timestamp || 0).getTime();
          bVal = new Date(b.timestamp || 0).getTime();
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'primary':
          aVal = a.card_number || a.plate || '';
          bVal = b.card_number || b.plate || '';
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [results, search, sortField, sortDirection]);

  const resultsStats = useMemo(() => {
    const total = filteredResults.length;
    const success = filteredResults.filter(r => r.status === 'SUCCESS').length;
    const fail = filteredResults.filter(r => r.status === 'FAIL' || r.status === 'ERROR').length;
    const unknown = filteredResults.filter(r => r.status === 'UNKNOWN').length;
    return { total, success, fail, unknown };
  }, [filteredResults]);

  const isRefreshing = statusLoading || analyticsLoading || checkoutLoading || plateLoading || gateway2Loading;

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

  const handleSort = (field: 'timestamp' | 'status' | 'primary') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleRefresh = () => {
    refetchStatus();
    refetchAnalytics();
    refetchCheckout();
    refetchPlate();
    refetchGateway2();
  };

  const ccRunning = !!status?.is_running;
  const coRunning = !!checkoutStatus?.is_running;
  const plRunning = !!plateStatus?.is_running;
  const gwRunning = !!gateway2Status?.is_running;
  const activeCount = [ccRunning, coRunning, plRunning, gwRunning].filter(Boolean).length;

  const activeLabels = useMemo(() => {
    const labels: string[] = [];
    if (ccRunning) labels.push('CC');
    if (coRunning) labels.push('Checkout');
    if (plRunning) labels.push('Plates');
    if (gwRunning) labels.push('GW2');
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
            {/* ─── Quick Stats Bar ───────────────────────────────────── */}
            <AnimatedCard index={1}>
              {isRefreshing ? (
                <View style={styles.quickStatsRow}>
                  <View style={styles.quickStat}>
                    <ShimmerLoader height={20} style={{ marginBottom: spacing.xs }} />
                    <ShimmerLoader height={16} />
                  </View>
                  <View style={styles.quickStat}>
                    <ShimmerLoader height={20} style={{ marginBottom: spacing.xs }} />
                    <ShimmerLoader height={16} />
                  </View>
                  <View style={styles.quickStat}>
                    <ShimmerLoader height={20} style={{ marginBottom: spacing.xs }} />
                    <ShimmerLoader height={16} />
                  </View>
                </View>
              ) : (
                <View style={styles.quickStatsRow}>
                  <View style={styles.quickStat}>
                    <Text style={styles.quickStatValue}>{activeCount}</Text>
                    <Text style={styles.quickStatLabel}>Active</Text>
                  </View>
                  <View style={styles.quickStat}>
                    <Text style={[styles.quickStatValue, { color: colors.success }]}>{passCount}</Text>
                    <Text style={styles.quickStatLabel}>Passed</Text>
                  </View>
                  <View style={styles.quickStat}>
                    <Text style={[styles.quickStatValue, { color: colors.danger }]}>{failCount}</Text>
                    <Text style={styles.quickStatLabel}>Failed</Text>
                  </View>
                </View>
              )}
            </AnimatedCard>

            {/* ─── Status & Hero ──────────────────────────────────────── */}
            <AnimatedCard index={2}>
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

            {/* ─── Control Row ────────────────────────────────────────── */}
            <View style={styles.controlRow}>
              <AnimatedCard index={3} style={styles.controlCard}>
                <View style={styles.controlCardHeader}>
                  <MaterialIcons name="credit-score" size={18} color={colors.info} />
                  <Text style={styles.controlCardTitle}>CC / PPSR</Text>
                </View>
                <ControlPanel
                  title=""
                  icon=""
                  accentColor={colors.info}
                  isRunning={ccRunning}
                  onStart={() => execute(() => api.startProcessing(), 'CC Checker started', 'Failed to start', handleRefresh)}
                  onStop={() => execute(() => api.stopProcessing(), 'CC Checker stopped', 'Failed to stop', handleRefresh)}
                >
                  <Text style={styles.controlHint}>Validates cards via PPSR payment gateway</Text>
                </ControlPanel>
              </AnimatedCard>

              <AnimatedCard index={4} style={styles.controlCard}>
                <View style={styles.controlCardHeader}>
                  <MaterialIcons name="shopping-cart-checkout" size={18} color={colors.accent} />
                  <Text style={styles.controlCardTitle}>WA Checkout</Text>
                </View>
                <ControlPanel
                  title=""
                  icon=""
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
                    <Text style={styles.controlHint}>Automates WA rego payments · {checkoutTerm} month term</Text>
                  )}
                </ControlPanel>
              </AnimatedCard>

              <AnimatedCard index={5} style={styles.controlCard}>
                <View style={styles.controlCardHeader}>
                  <MaterialIcons name="rotate-right" size={18} color={colors.success} />
                  <Text style={styles.controlCardTitle}>Plate Rotation</Text>
                </View>
                <ControlPanel
                  title=""
                  icon=""
                  accentColor={colors.success}
                  isRunning={plRunning}
                  onStart={() => execute(() => api.startPlateCheck(), 'Plate rotation started', 'Failed to start', handleRefresh)}
                  onStop={() => execute(() => api.stopPlateCheck(), 'Plate rotation stopped', 'Failed to stop', handleRefresh)}
                >
                  <Text style={styles.controlHint}>Automated WA government registration lookup and rotation</Text>
                </ControlPanel>
              </AnimatedCard>

              <AnimatedCard index={6} style={styles.controlCard}>
                <View style={styles.controlCardHeader}>
                  <MaterialIcons name="payment" size={18} color={colors.warning} />
                  <Text style={styles.controlCardTitle}>Gateway2</Text>
                </View>
                <ControlPanel
                  title=""
                  icon=""
                  accentColor={colors.warning}
                  isRunning={gwRunning}
                  onStart={() => execute(() => api.startGateway2(), 'Gateway2 started', 'Failed to start', handleRefresh)}
                  onStop={() => execute(() => api.stopGateway2(), 'Gateway2 stopped', 'Failed to stop', handleRefresh)}
                >
                  <Text style={styles.controlHint}>Validates cards via DonorPerfect donation gateway</Text>
                </ControlPanel>
              </AnimatedCard>
            </View>

            {/* ─── Activity Terminal ─────────────────────────────────── */}
            <AnimatedCard index={7} style={styles.activityCard}>
              {isRefreshing ? (
                <ShimmerLoader height={300} />
              ) : (
                <LiveLogPanel
                  tabs={[
                    { file: 'cc', title: 'CC Checker', icon: 'credit-score' },
                    { file: 'wa-checkout', title: 'WA Checkout', icon: 'shopping-cart-checkout' },
                    { file: 'wa', title: 'Plate Rotation', icon: 'rotate-right' },
                    { file: 'gateway2', title: 'Gateway2', icon: 'payment' },
                  ]}
                  height={350}
                />
              )}
            </AnimatedCard>
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
                    { value: 'gateway2', label: 'GATEWAY2', labelStyle: styles.tabLabel, icon: 'payment' },
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
                  primary: (activeResultsTab === 'cc' || activeResultsTab === 'gateway2')
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
                sortable
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
              />
            </View>
          </View>
        )}

        {/* ─── Footer ──────────────────────────── */}
        <AnimatedCard index={7}>
          <View style={styles.footerRow}>
            <AnimatedPressable
              onPress={() => {
                impactHeavy();
                execute(
                  async () => {
                    await api.clearResults();
                    await api.clearPlateResults();
                    await api.clearWaCheckoutLogs();
                    await api.clearGateway2Results();
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
  // Quick Stats
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  quickStat: {
    alignItems: 'center',
    flex: 1,
  },
  quickStatValue: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  quickStatLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing['2xs'],
  },

  // Control Row Layout
  controlRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  controlCard: {
    width: '48%',
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  controlCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  controlCardTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  controlHint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    lineHeight: 16,
  },

  // Activity Terminal
  activityCard: {
    marginTop: spacing.md,
  },


  // Legacy grid (kept for results tab)
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

