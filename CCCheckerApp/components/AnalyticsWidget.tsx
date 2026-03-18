import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, ProgressBar } from 'react-native-paper';
import { AnalyticsData } from '@/types';

interface AnalyticsWidgetProps {
  analytics: AnalyticsData;
}

export const AnalyticsWidget: React.FC<AnalyticsWidgetProps> = ({ analytics }) => {
  const successPercentage = analytics.success_rate / 100;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.title}>
          Performance Analytics
        </Text>

        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text variant="labelSmall" style={styles.progressLabel}>
              Success Rate
            </Text>
            <Text variant="labelMedium" style={styles.progressValue}>
              {analytics.success_rate.toFixed(1)}%
            </Text>
          </View>
          <ProgressBar
            progress={successPercentage}
            color="#10B981"
            style={styles.progressBar}
          />
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text variant="labelSmall" style={styles.statLabel}>
              Successful
            </Text>
            <Text variant="headlineSmall" style={[styles.statNumber, { color: '#10B981' }]}>
              {analytics.success_count}
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text variant="labelSmall" style={styles.statLabel}>
              Failed
            </Text>
            <Text variant="headlineSmall" style={[styles.statNumber, { color: '#EF4444' }]}>
              {analytics.fail_count}
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text variant="labelSmall" style={styles.statLabel}>
              Total
            </Text>
            <Text variant="headlineSmall" style={[styles.statNumber, { color: '#3B82F6' }]}>
              {analytics.total_count}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  title: {
    marginBottom: 12,
    color: '#111827',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#6B7280',
  },
  progressValue: {
    color: '#10B981',
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#6B7280',
    marginBottom: 4,
  },
  statNumber: {
    fontWeight: '600',
  },
});
