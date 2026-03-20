import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { useStatusQuery, useAnalyticsQuery, usePlateCheckStatusQuery } from '@/hooks/useQueries';
import { StatusCard } from '@/components/StatusCard';
import { LiveLogPanel } from '@/components/LiveLogPanel';
import { Text, ActivityIndicator, Button, Snackbar, Card, Avatar } from 'react-native-paper';
import { api } from '@/services/api';

export default function DashboardScreen() {
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useStatusQuery();
  const { data: plateStatus, isLoading: plateLoading, refetch: refetchPlate } = usePlateCheckStatusQuery();
  const {
    data: analytics,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
    error: analyticsError,
  } = useAnalyticsQuery();

  const [isControlLoading, setIsControlLoading] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [showSnack, setShowSnack] = useState(false);

  const isLoading = statusLoading || analyticsLoading || plateLoading;

  const handleRefresh = () => {
    refetchStatus();
    refetchAnalytics();
    refetchPlate();
  };

  const handleStartCC = async () => {
    setIsControlLoading(true);
    try {
      await api.startProcessing();
      setSnackMessage('✓ CC Checker started');
      setShowSnack(true);
      handleRefresh();
    } catch {
      setSnackMessage('✗ Failed to start CC Checker');
      setShowSnack(true);
    } finally {
      setIsControlLoading(false);
    }
  };

  const handleStopCC = async () => {
    setIsControlLoading(true);
    try {
      await api.stopProcessing();
      setSnackMessage('✓ CC Checker stopped');
      setShowSnack(true);
      handleRefresh();
    } catch {
      setSnackMessage('✗ Failed to stop CC Checker');
      setShowSnack(true);
    } finally {
      setIsControlLoading(false);
    }
  };

  const handleStartPlate = async () => {
    setIsControlLoading(true);
    try {
      await api.startPlateCheck();
      setSnackMessage('✓ WA Rego automation started');
      setShowSnack(true);
      handleRefresh();
    } catch {
      setSnackMessage('✗ Failed to start WA Rego check');
      setShowSnack(true);
    } finally {
      setIsControlLoading(false);
    }
  };

  const handleStopPlate = async () => {
    setIsControlLoading(true);
    try {
      await api.stopPlateCheck();
      setSnackMessage('✓ WA Rego automation stopped');
      setShowSnack(true);
      handleRefresh();
    } catch {
      setSnackMessage('✗ Failed to stop WA Rego check');
      setShowSnack(true);
    } finally {
      setIsControlLoading(false);
    }
  };

  const handleClearAll = async () => {
    setIsControlLoading(true);
    try {
      await api.clearResults();
      await api.clearPlateResults();
      setSnackMessage('✓ All logs cleared');
      setShowSnack(true);
      handleRefresh();
    } catch {
      setSnackMessage('✗ Failed to clear logs');
      setShowSnack(true);
    } finally {
      setIsControlLoading(false);
    }
  };

  const onFileChange = async (e: any, target: 'cc' | 'wa_rego') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsControlLoading(true);
    try {
      const res = await api.uploadFile(file, target);
      setSnackMessage(`✓ Uploaded ${res.count} items to ${target === 'cc' ? 'CC Checker' : 'WA Rego'}`);
      setShowSnack(true);
      handleRefresh();
    } catch (err) {
      setSnackMessage('✗ Upload failed');
      setShowSnack(true);
    } finally {
      setIsControlLoading(false);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Universal Dashboard
          </Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            WA Rego • PPSR • CC Checker
          </Text>
        </View>

        {/* WA Rego & PPSR Section */}
        <Card style={styles.statusSectionCard}>
          <Card.Title 
            title="WA Rego & PPSR" 
            subtitle={plateStatus?.is_running ? "Active" : "Idle"}
            left={(props) => <Avatar.Icon {...props} icon="car-search" backgroundColor={plateStatus?.is_running ? "#10B981" : "#6B7280"} />}
          />
          <Card.Content>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text variant="titleLarge" style={styles.statValue}>{plateStatus?.hits_count || 0}</Text>
                <Text variant="labelSmall" style={styles.statLabel}>HITS</Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="titleLarge" style={styles.statValue}>{plateStatus?.pending_count || 0}</Text>
                <Text variant="labelSmall" style={styles.statLabel}>QUEUED</Text>
              </View>
            </View>
            <View style={styles.buttonRow}>
              <Button 
                mode="contained" 
                onPress={handleStartPlate} 
                disabled={plateStatus?.is_running || isControlLoading}
                style={[styles.actionBtn, styles.startBtn]}
                icon="play"
              >
                Start
              </Button>
              <Button 
                mode="contained" 
                onPress={handleStopPlate} 
                disabled={!plateStatus?.is_running || isControlLoading}
                style={[styles.actionBtn, styles.stopBtn]}
                icon="stop"
              >
                Stop
              </Button>
            </View>
            <View style={styles.uploadRow}>
              <Button
                mode="outlined"
                icon="upload"
                onPress={() => (document.getElementById('upload-rego') as any)?.click()}
                disabled={isControlLoading}
                style={styles.uploadBtn}
              >
                Upload Plates
              </Button>
              <input
                id="upload-rego"
                type="file"
                style={{ display: 'none' }}
                onChange={(e) => onFileChange(e, 'wa_rego')}
                accept=".txt"
              />
            </View>
            <LiveLogPanel file="wa" title="Live WA Activity" height={140} />
          </Card.Content>
        </Card>

        {/* CC Checker Section */}
        <Card style={styles.statusSectionCard}>
          <Card.Title 
            title="CC Checker" 
            subtitle={status?.is_running ? "Active" : "Idle"}
            left={(props) => <Avatar.Icon {...props} icon="credit-card-search" backgroundColor={status?.is_running ? "#3B82F6" : "#6B7280"} />}
          />
          <Card.Content>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text variant="titleLarge" style={styles.statValue}>{status?.total_processed || 0}</Text>
                <Text variant="labelSmall" style={styles.statLabel}>PROCESSED</Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="titleLarge" style={styles.statValue}>{status?.remaining_cards || 0}</Text>
                <Text variant="labelSmall" style={styles.statLabel}>REMAINING</Text>
              </View>
            </View>
            <View style={styles.buttonRow}>
              <Button 
                mode="contained" 
                onPress={handleStartCC} 
                disabled={status?.is_running || isControlLoading}
                style={[styles.actionBtn, styles.startBtn]}
                icon="play"
              >
                Start
              </Button>
              <Button 
                mode="contained" 
                onPress={handleStopCC} 
                disabled={!status?.is_running || isControlLoading}
                style={[styles.actionBtn, styles.stopBtn]}
                icon="stop"
              >
                Stop
              </Button>
            </View>
            <View style={styles.uploadRow}>
              <Button
                mode="outlined"
                icon="upload"
                onPress={() => (document.getElementById('upload-cc') as any)?.click()}
                disabled={isControlLoading}
                style={styles.uploadBtn}
              >
                Upload Cards
              </Button>
              <input
                id="upload-cc"
                type="file"
                style={{ display: 'none' }}
                onChange={(e) => onFileChange(e, 'cc')}
                accept=".txt"
              />
            </View>
            <LiveLogPanel file="cc" title="Live CC Activity" height={140} />
          </Card.Content>
        </Card>

        <Button
          icon="delete-sweep"
          mode="outlined"
          onPress={handleClearAll}
          style={styles.globalClearBtn}
          textColor="#EF4444"
        >
          Clear All Data & Logs
        </Button>

      </ScrollView>

      <Snackbar
        visible={showSnack}
        onDismiss={() => setShowSnack(false)}
        duration={3000}
      >
        {snackMessage}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
  },
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    color: '#6B7280',
    letterSpacing: 1,
  },
  statusSectionCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    color: '#9CA3AF',
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
  },
  uploadRow: {
    marginTop: 12,
  },
  uploadBtn: {
    borderRadius: 8,
    borderColor: '#3B82F6',
  },
  startBtn: {
    backgroundColor: '#10B981',
  },
  stopBtn: {
    backgroundColor: '#EF4444',
  },
  globalClearBtn: {
    marginTop: 8,
    marginBottom: 40,
    borderColor: '#EF4444',
    borderWidth: 1,
  },
});
