import React from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePlateCheckStatusQuery, usePlateCheckResultsQuery } from '@/hooks/useQueries';
import { Text, ActivityIndicator, Button, Snackbar, Badge, Divider } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { api } from '@/services/api';
import { LiveLogPanel } from '@/components/LiveLogPanel';
import { useActionHandler } from '@/hooks/useActionHandler';
import { colors, spacing, radii } from '@/constants/theme';

export default function PlateCheckScreen() {
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = usePlateCheckStatusQuery();
  const { data: resultsData, isLoading: resultsLoading, refetch: refetchResults } = usePlateCheckResultsQuery();
  const { isLoading: actionLoading, snackMessage, showSnack, dismissSnack, execute } = useActionHandler();

  const isLoading = statusLoading || resultsLoading;

  const handleRefresh = () => {
    refetchStatus();
    refetchResults();
  };

  const renderResultItem = (item: string) => {
    const isHit = item.includes('[HIT');
    const isFail = item.includes('[FAIL');
    const badgeColor = isHit ? colors.success : isFail ? colors.danger : colors.textMuted;
    const badgeLabel = isHit ? 'HIT' : isFail ? 'FAIL' : 'LOG';

    return (
      <View style={styles.resultItem}>
        <View style={styles.resultHeader}>
          <Badge style={[styles.badge, { backgroundColor: badgeColor }]}>{badgeLabel}</Badge>
          <Text style={styles.resultTimestamp}>{item.split(' - ').pop()}</Text>
        </View>
        <Text style={[styles.resultText, isHit && { color: colors.success }]}>{item}</Text>
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
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Plate Checker</Text>
          <Text style={styles.subtitle}>WA GOVERNMENT PLATE ROTATION</Text>
        </View>

        {/* Status Panel */}
        <View style={styles.statusPanel}>
          <View style={styles.statusTop}>
            <View>
              <Text style={styles.statusLabel}>STATUS</Text>
              <View style={styles.statusIndicator}>
                <View style={[styles.dot, { backgroundColor: status?.is_running ? colors.success : colors.danger }]} />
                <Text style={[styles.statusValue, { color: status?.is_running ? colors.success : colors.danger }]}>
                  {status?.is_running ? 'RUNNING' : 'STOPPED'}
                </Text>
              </View>
            </View>
            <View style={styles.statRight}>
              <Text style={styles.statusLabel}>HITS</Text>
              <Text style={styles.bigStat}>{status?.hits_count || 0}</Text>
            </View>
          </View>

          <View style={styles.progressRow}>
            <Text style={styles.progressText}>Total Attempts: {status?.total_lines || 0}</Text>
            <Text style={styles.progressText}>Pending: {status?.pending_count || 0}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              onPress={() => execute(() => api.startPlateCheck(), 'Plate check started', 'Failed to start', handleRefresh)}
              disabled={status?.is_running || actionLoading}
              loading={actionLoading && !status?.is_running}
              style={[styles.button, { backgroundColor: colors.success }]}
              labelStyle={styles.btnLabel}
            >
              Start Rotation
            </Button>
            <Button
              mode="contained"
              onPress={() => execute(() => api.stopPlateCheck(), 'Plate check stopped', 'Failed to stop', handleRefresh)}
              disabled={!status?.is_running || actionLoading}
              loading={actionLoading && !!status?.is_running}
              style={[styles.button, { backgroundColor: colors.danger }]}
              labelStyle={styles.btnLabel}
            >
              Stop
            </Button>
          </View>
        </View>

        {/* Live Log */}
        <LiveLogPanel file="wa" title="Live Rotation Stream" height={200} />

        {/* Activity Header */}
        <View style={styles.activityHeader}>
          <Text style={styles.activityTitle}>Recent Activity</Text>
          <View style={styles.activityActions}>
            <Button
              compact
              onPress={() => execute(() => api.generatePlates(100), 'Plates generated', 'Failed to generate', handleRefresh)}
              icon="auto-fix"
              textColor={colors.primary}
              labelStyle={styles.actionLabel}
            >
              Gen
            </Button>
            <Button compact onPress={handleRefresh} icon="refresh" textColor={colors.textSecondary} labelStyle={styles.actionLabel}>
              Refresh
            </Button>
            <Button
              compact
              onPress={() => execute(() => api.clearPlateResults(), 'Logs cleared', 'Failed to clear', handleRefresh)}
              textColor={colors.danger}
              icon="delete-outline"
              labelStyle={styles.actionLabel}
            >
              Clear
            </Button>
          </View>
        </View>

        {status?.is_running && (
          <View style={styles.runningBanner}>
            <ActivityIndicator animating color={colors.success} size="small" />
            <Text style={styles.runningText}>Monitoring live rotation...</Text>
          </View>
        )}

        {resultsData?.results.map((item, index) => (
          <React.Fragment key={index}>{renderResultItem(item)}</React.Fragment>
        ))}

        {resultsData?.results.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No logs found yet.</Text>
          </View>
        )}

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
  header: {
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: spacing.xs,
  },
  // ── Status Panel ──
  statusPanel: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  statusTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statRight: {
    alignItems: 'flex-end',
  },
  bigStat: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    marginTop: spacing.xs,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    borderRadius: radii.sm,
  },
  btnLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  // ── Activity ──
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  activityTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  activityActions: {
    flexDirection: 'row',
    gap: 0,
  },
  actionLabel: {
    fontSize: 11,
  },
  runningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successMuted,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.success,
  },
  runningText: {
    color: colors.success,
    fontWeight: '600',
    fontSize: 12,
  },
  // ── Result Items ──
  resultItem: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  badge: {
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '700',
  },
  resultTimestamp: {
    color: colors.textMuted,
    fontSize: 10,
  },
  resultText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  // ── Empty ──
  emptyState: {
    padding: 48,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  snackbar: {
    backgroundColor: colors.surfaceElevated,
  },
});
