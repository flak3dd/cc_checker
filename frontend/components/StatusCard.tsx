import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, ActivityIndicator } from 'react-native-paper';
import { ProcessingStatus } from '@/types';

interface StatusCardProps {
  status: ProcessingStatus;
}

export const StatusCard: React.FC<StatusCardProps> = ({ status }) => {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.headerRow}>
          <Text variant="titleMedium" style={styles.title}>
            Processing Status
          </Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: status.is_running ? '#10B981' : '#9CA3AF' },
            ]}
          >
            <Text style={styles.badgeText}>{status.is_running ? '●' : '○'}</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text variant="labelSmall" style={styles.label}>
              Status
            </Text>
            <Text
              variant="titleLarge"
              style={[
                styles.statusText,
                { color: status.is_running ? '#10B981' : '#6B7280' },
              ]}
            >
              {status.is_running ? 'Running' : 'Idle'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statusItem}>
            <Text variant="labelSmall" style={styles.label}>
              Cards Remaining
            </Text>
            <Text variant="titleLarge" style={styles.statusText}>
              {status.remaining_cards}
            </Text>
          </View>
        </View>

        {status.is_running && (
          <View style={styles.processingIndicator}>
            <ActivityIndicator size="small" color="#3B82F6" />
            <Text variant="bodySmall" style={styles.processingText}>
              Processing card...
            </Text>
          </View>
        )}

        <View style={styles.totalCount}>
          <Text variant="labelSmall" style={styles.label}>
            Total Processed
          </Text>
          <Text variant="headlineSmall" style={styles.totalNumber}>
            {status.total_processed}
          </Text>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#111827',
  },
  badge: {
    height: 24,
    width: 24,
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusItem: {
    flex: 1,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  label: {
    color: '#6B7280',
    marginBottom: 4,
  },
  statusText: {
    color: '#111827',
    fontWeight: '600',
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  processingText: {
    marginLeft: 8,
    color: '#3B82F6',
    fontWeight: '500',
  },
  totalCount: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalNumber: {
    color: '#111827',
    marginTop: 4,
    fontWeight: '600',
  },
});
