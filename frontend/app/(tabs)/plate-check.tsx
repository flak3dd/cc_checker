import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { usePlateCheckStatusQuery, usePlateCheckResultsQuery } from '@/hooks/useQueries';
import { Text, ActivityIndicator, Button, Snackbar, Card, Badge, Divider } from 'react-native-paper';
import { api } from '@/services/api';
import { LiveLogPanel } from '@/components/LiveLogPanel';

export default function PlateCheckScreen() {
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = usePlateCheckStatusQuery();
  const { data: resultsData, isLoading: resultsLoading, refetch: refetchResults } = usePlateCheckResultsQuery();

  const [isControlLoading, setIsControlLoading] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [showSnack, setShowSnack] = useState(false);

  const isLoading = statusLoading || resultsLoading;

  const handleRefresh = () => {
    refetchStatus();
    refetchResults();
  };

  const handleStart = async () => {
    setIsControlLoading(true);
    try {
      const res = await api.startPlateCheck();
      if (res.success) {
        setSnackMessage('✓ Plate check started');
      } else {
        setSnackMessage(`✗ ${res.message}`);
      }
      setShowSnack(true);
      handleRefresh();
    } catch {
      setSnackMessage('✗ Failed to connect to server');
      setShowSnack(true);
    } finally {
      setIsControlLoading(false);
    }
  };

  const handleStop = async () => {
    setIsControlLoading(true);
    try {
      const res = await api.stopPlateCheck();
      if (res.success) {
        setSnackMessage('✓ Plate check stopped');
      } else {
        setSnackMessage(`✗ ${res.message}`);
      }
      setShowSnack(true);
      handleRefresh();
    } catch {
      setSnackMessage('✗ Failed to connect to server');
      setShowSnack(true);
    } finally {
      setIsControlLoading(false);
    }
  };

  const handleClear = async () => {
    setIsControlLoading(true);
    try {
      const res = await api.clearPlateResults();
      if (res.success) {
        setSnackMessage('✓ Logs cleared');
      }
      setShowSnack(true);
      handleRefresh();
    } catch {
      setSnackMessage('✗ Failed to clear logs');
      setShowSnack(true);
    } finally {
      setIsControlLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsControlLoading(true);
    try {
      const res = await api.generatePlates(100);
      if (res.success) {
        setSnackMessage(`✓ Generated ${res.count} plates into queue`);
      }
      setShowSnack(true);
      handleRefresh();
    } catch {
      setSnackMessage('✗ Failed to generate plates');
      setShowSnack(true);
    } finally {
      setIsControlLoading(false);
    }
  };

  const renderResultItem = (item: string) => {
    const isHit = item.includes('[HIT');
    const isFail = item.includes('[FAIL');
    
    return (
      <Card style={styles.resultCard}>
        <Card.Content style={styles.resultContent}>
          <View style={styles.resultHeader}>
            <Badge 
              style={[
                styles.badge, 
                isHit ? styles.hitBadge : isFail ? styles.failBadge : styles.missBadge
              ]}
            >
              {isHit ? 'HIT' : isFail ? 'FAIL' : 'LOG'}
            </Badge>
            <Text variant="bodySmall" style={styles.resultTimestamp}>
              {item.split(' - ').pop()}
            </Text>
          </View>
          <Text variant="bodyMedium" style={styles.resultText}>
            {item}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Plate Checker
          </Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            WA Government Plate Rotation
          </Text>
        </View>

        {/* Status Card */}
        <Card style={styles.statusCard}>
          <Card.Content>
            <View style={styles.statusRow}>
              <View>
                <Text variant="labelLarge" style={styles.label}>STATUS</Text>
                <Text variant="titleLarge" style={[styles.statusText, status?.is_running ? styles.running : styles.stopped]}>
                  {status?.is_running ? '🟢 RUNNING' : '🔴 STOPPED'}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text variant="labelLarge" style={styles.label}>HITS</Text>
                <Text variant="headlineSmall" style={styles.statValue}>{status?.hits_count || 0}</Text>
              </View>
            </View>
            
            <View style={styles.progressInfo}>
              <Text variant="bodySmall">Total Attempts: {status?.total_lines || 0}</Text>
              <Text variant="bodySmall">Pending in Queue: {status?.pending_count || 0}</Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.buttonRow}>
              <Button
                mode="contained"
                onPress={handleStart}
                disabled={status?.is_running || isControlLoading}
                loading={isControlLoading && !status?.is_running}
                style={[styles.button, styles.startButton]}
              >
                Start Rotation
              </Button>
              <Button
                mode="contained"
                onPress={handleStop}
                disabled={!status?.is_running || isControlLoading}
                loading={isControlLoading && status?.is_running}
                style={[styles.button, styles.stopButton]}
              >
                Stop
              </Button>
            </View>
          </Card.Content>
        </Card>

        <LiveLogPanel file="wa" title="Live Rotation Stream" height={200} />

        <View style={styles.resultsHeader}>
          <Text variant="titleMedium">Recent Activity</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Button compact onPress={handleGenerate} icon="auto-fix">Auto-gen</Button>
            <Button compact onPress={handleRefresh} icon="refresh">Refresh</Button>
            <Button compact onPress={handleClear} textColor="#EF4444" icon="delete-outline">Clear</Button>
          </View>
        </View>

        {status?.is_running && (
          <View style={styles.runningIndicator}>
            <ActivityIndicator animating={true} color="#10B981" size="small" />
            <Text variant="bodySmall" style={styles.runningLabel}>Monitoring live rotation...</Text>
          </View>
        )}

        {resultsData?.results.map((item, index) => (
          <React.Fragment key={index}>
            {renderResultItem(item)}
          </React.Fragment>
        ))}

        {resultsData?.results.length === 0 && (
          <View style={styles.emptyState}>
            <Text variant="bodyMedium" style={{ color: '#9CA3AF' }}>No logs found yet.</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Snackbar
        visible={showSnack}
        onDismiss={() => setShowSnack(false)}
        duration={3000}
      >
        {snackMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    color: '#6B7280',
  },
  statusCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 24,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#6B7280',
    letterSpacing: 1,
    fontSize: 10,
  },
  statusText: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  running: {
    color: '#10B981',
  },
  stopped: {
    color: '#EF4444',
  },
  statBox: {
    alignItems: 'flex-end',
  },
  statValue: {
    fontWeight: 'bold',
    color: '#111827',
  },
  progressInfo: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  divider: {
    marginVertical: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 8,
  },
  startButton: {
    backgroundColor: '#10B981',
  },
  stopButton: {
    backgroundColor: '#EF4444',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultCard: {
    marginBottom: 8,
    backgroundColor: '#FFF',
    borderRadius: 8,
  },
  resultContent: {
    paddingVertical: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    borderRadius: 4,
  },
  hitBadge: {
    backgroundColor: '#10B981',
  },
  failBadge: {
    backgroundColor: '#EF4444',
  },
  missBadge: {
    backgroundColor: '#6B7280',
  },
  resultTimestamp: {
    color: '#9CA3AF',
    fontSize: 10,
  },
  resultText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#374151',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  runningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  runningLabel: {
    color: '#047857',
    fontWeight: '500',
  },
});
