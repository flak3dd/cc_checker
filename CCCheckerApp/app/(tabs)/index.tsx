import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { useStatusQuery, useAnalyticsQuery } from '@/hooks/useQueries';
import { StatusCard } from '@/components/StatusCard';
import { AnalyticsWidget } from '@/components/AnalyticsWidget';
import { FileUploadWidget } from '@/components/FileUploadWidget';
import { Text, ActivityIndicator, Button, Snackbar } from 'react-native-paper';
import { api } from '@/services/api';

export default function DashboardScreen() {
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useStatusQuery();
  const {
    data: analytics,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useAnalyticsQuery();

  const [isProcessing, setIsProcessing] = useState(status?.is_running || false);
  const [isControlLoading, setIsControlLoading] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [showSnack, setShowSnack] = useState(false);

  const isLoading = statusLoading || analyticsLoading;

  const handleRefresh = () => {
    refetchStatus();
    refetchAnalytics();
  };

  const handleStartProcessing = async () => {
    setIsControlLoading(true);
    try {
      const response = await api.startProcessing();
      setIsProcessing(true);
      setSnackMessage('✓ Processing started');
      setShowSnack(true);
      handleRefresh();
    } catch (error) {
      setSnackMessage('✗ Failed to start processing');
      setShowSnack(true);
    } finally {
      setIsControlLoading(false);
    }
  };

  const handleStopProcessing = async () => {
    setIsControlLoading(true);
    try {
      const response = await api.stopProcessing();
      setIsProcessing(false);
      setSnackMessage('✓ Processing stopped');
      setShowSnack(true);
      handleRefresh();
    } catch (error) {
      setSnackMessage('✗ Failed to stop processing');
      setShowSnack(true);
    } finally {
      setIsControlLoading(false);
    }
  };

  const handleUploadSuccess = (count: number) => {
    setSnackMessage(`✓ Uploaded ${count} cards`);
    setShowSnack(true);
    handleRefresh();
  };

  const handleUploadError = (error: string) => {
    setSnackMessage(`✗ Upload failed: ${error}`);
    setShowSnack(true);
  };

  if (isLoading && !status && !analytics) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            CC Checker Monitor
          </Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            Real-time processing dashboard
          </Text>
        </View>

        {status && <StatusCard status={status} />}

        {analytics && <AnalyticsWidget analytics={analytics} />}

        {/* File Upload Section */}
        <FileUploadWidget
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />

        {/* Control Buttons Section */}
        <View style={styles.controlsContainer}>
          <View style={styles.controlHeader}>
            <Text variant="titleMedium" style={styles.controlTitle}>
              🎮 Processing Controls
            </Text>
          </View>
          <View style={styles.buttonRow}>
            <Button
              icon="play"
              mode="contained"
              onPress={handleStartProcessing}
              disabled={isProcessing || isControlLoading}
              loading={isControlLoading && isProcessing}
              style={[styles.controlButton, styles.startButton]}
            >
              Start
            </Button>
            <Button
              icon="stop"
              mode="contained"
              onPress={handleStopProcessing}
              disabled={!isProcessing || isControlLoading}
              loading={isControlLoading && !isProcessing}
              style={[styles.controlButton, styles.stopButton]}
            >
              Stop
            </Button>
          </View>
          <Text variant="bodySmall" style={styles.controlStatus}>
            Status: {isProcessing ? '🟢 Running' : '🔴 Stopped'}
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text variant="labelSmall" style={styles.infoLabel}>
            📊 Tip
          </Text>
          <Text variant="bodySmall" style={styles.infoText}>
            Pull down to refresh data. Navigate to Results tab to view all processed cards and
            Analytics for detailed statistics.
          </Text>
        </View>
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
    paddingBottom: 100,
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
    marginBottom: 20,
  },
  title: {
    color: '#111827',
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#6B7280',
  },
  controlsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  controlHeader: {
    marginBottom: 16,
  },
  controlTitle: {
    color: '#111827',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  controlButton: {
    flex: 1,
  },
  startButton: {
    backgroundColor: '#10B981',
  },
  stopButton: {
    backgroundColor: '#EF4444',
  },
  controlStatus: {
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  infoLabel: {
    color: '#3B82F6',
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    color: '#1E40AF',
    lineHeight: 18,
  },
  snackbar: {
    position: 'absolute',
    bottom: 0,
  },
});
