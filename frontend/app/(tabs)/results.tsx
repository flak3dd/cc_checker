import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { useResultsQuery } from '@/hooks/useQueries';
import { Text, ActivityIndicator, Chip, Button, Snackbar } from 'react-native-paper';
import { CardResult, CardStatus } from '@/types';
import { api } from '@/services/api';
import { useQueryClient } from '@tanstack/react-query';

export default function ResultsScreen() {
  const [filterStatus, setFilterStatus] = useState<CardStatus | 'ALL'>('ALL');
  const [isClearing, setIsClearing] = useState(false);
  const [rerunningIndex, setRerunningIndex] = useState<number | null>(null);
  const [snackMessage, setSnackMessage] = useState('');
  const [showSnack, setShowSnack] = useState(false);

  const { data: resultsData, isLoading, refetch } = useResultsQuery();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    refetch();
  };

  const handleClearResults = () => {
    // Simple confirm for web
    if (typeof window !== 'undefined' && !window.confirm('Clear all results?')) return;
    performClear();
  };

  const performClear = async () => {
    setIsClearing(true);
    try {
      await api.clearResults();
      setSnackMessage('✓ Results cleared');
      setShowSnack(true);
      queryClient.invalidateQueries({ queryKey: ['results'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['status'] });
    } catch {
      setSnackMessage('✗ Failed to clear results');
      setShowSnack(true);
    } finally {
      setIsClearing(false);
    }
  };

  const handleRerun = async (run: CardResult[], runIndex: number) => {
    const cards = run.map(({ card_number, mm, yy, cvv }) => ({ card_number, mm, yy, cvv }));
    setRerunningIndex(runIndex);
    try {
      const result = await api.rerunCards(cards);
      setSnackMessage(`✓ Re-queued ${result.count} cards`);
      setShowSnack(true);
      queryClient.invalidateQueries({ queryKey: ['status'] });
    } catch {
      setSnackMessage('✗ Failed to re-queue cards');
      setShowSnack(true);
    } finally {
      setRerunningIndex(null);
    }
  };

  const getStatusColor = (status: CardStatus) => {
    switch (status) {
      case 'SUCCESS':
        return '#10B981';
      case 'FAIL':
        return '#EF4444';
      case 'ERROR_PREPAYMENT':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const filterRun = (run: CardResult[]) => {
    if (filterStatus === 'ALL') return run;
    return run.filter((r) => r.status === filterStatus);
  };

  if (isLoading && !resultsData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading results...
        </Text>
      </View>
    );
  }

  const runs = resultsData?.runs || [];

  return (
    <>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text variant="headlineMedium" style={styles.title}>
                Results
              </Text>
              <Text variant="bodySmall" style={styles.subtitle}>
                {resultsData?.total || 0} cards across {runs.length} runs
              </Text>
            </View>
            <Button
              icon="delete-outline"
              mode="outlined"
              onPress={handleClearResults}
              loading={isClearing}
              disabled={isClearing || runs.length === 0}
              textColor="#EF4444"
              style={styles.clearButton}
            >
              Clear
            </Button>
          </View>
        </View>

        <View style={styles.filterContainer}>
          <Chip
            selected={filterStatus === 'ALL'}
            onPress={() => setFilterStatus('ALL')}
            style={[styles.filterChip, filterStatus === 'ALL' && styles.filterChipActive]}
            selectedColor={filterStatus === 'ALL' ? 'white' : '#3B82F6'}
          >
            All
          </Chip>
          <Chip
            selected={filterStatus === 'SUCCESS'}
            onPress={() => setFilterStatus('SUCCESS')}
            style={[styles.filterChip, filterStatus === 'SUCCESS' && styles.filterChipActive]}
            selectedColor={filterStatus === 'SUCCESS' ? 'white' : '#10B981'}
          >
            Success
          </Chip>
          <Chip
            selected={filterStatus === 'FAIL'}
            onPress={() => setFilterStatus('FAIL')}
            style={[styles.filterChip, filterStatus === 'FAIL' && styles.filterChipActive]}
            selectedColor={filterStatus === 'FAIL' ? 'white' : '#EF4444'}
          >
            Failed
          </Chip>
        </View>

        {runs.length > 0 ? (
          runs.map((run, runIndex) => {
            const filtered = filterRun(run);
            if (filtered.length === 0) return null;
            const successCount = run.filter((r) => r.status === 'SUCCESS').length;
            const failCount = run.length - successCount;

            return (
              <View key={`run-${runIndex}`} style={styles.runContainer}>
                <View style={styles.runHeader}>
                  <Text variant="titleSmall" style={styles.runTitle}>
                    Run #{runs.length - runIndex}
                  </Text>
                  <View style={styles.runHeaderRight}>
                    <Text variant="labelSmall" style={styles.runStats}>
                      {run.length} cards • {successCount}✓ {failCount}✗
                    </Text>
                    <Button
                      icon="refresh"
                      mode="text"
                      compact
                      onPress={() => handleRerun(run, runIndex)}
                      loading={rerunningIndex === runIndex}
                      disabled={rerunningIndex !== null}
                      textColor="#3B82F6"
                      style={styles.rerunButton}
                      labelStyle={styles.rerunLabel}
                    >
                      Re-run
                    </Button>
                  </View>
                </View>
                <View style={styles.cardsList}>
                  {filtered.map((result, i) => (
                    <View key={`${result.card_number}-${i}`} style={styles.cardRow}>
                      <Text style={styles.cardNumber}>
                        {result.card_number}
                      </Text>
                      <Text style={styles.cardExpiry}>
                        {result.mm}/{result.yy}
                      </Text>
                      <Text style={styles.cardCvv}>
                        {result.cvv}
                      </Text>
                      <Text
                        style={[
                          styles.cardStatus,
                          { color: getStatusColor(result.status) },
                        ]}
                      >
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
            <Text variant="bodyLarge" style={styles.emptyText}>
              No results found
            </Text>
          </View>
        )}

        <View style={styles.spacer} />
      </ScrollView>

      <Snackbar
        visible={showSnack}
        onDismiss={() => setShowSnack(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {snackMessage}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  header: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    color: '#111827',
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#6B7280',
  },
  clearButton: {
    borderColor: '#FCA5A5',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  runContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  runHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  runTitle: {
    color: '#111827',
    fontWeight: '600',
  },
  runHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  runStats: {
    color: '#6B7280',
  },
  rerunButton: {
    marginVertical: -4,
  },
  rerunLabel: {
    fontSize: 12,
  },
  cardsList: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  cardNumber: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#111827',
  },
  cardExpiry: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#6B7280',
    width: 45,
  },
  cardCvv: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#6B7280',
    width: 30,
  },
  cardStatus: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '600',
    width: 60,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#6B7280',
  },
  spacer: {
    height: 24,
  },
  snackbar: {
    position: 'absolute',
    bottom: 0,
  },
});
