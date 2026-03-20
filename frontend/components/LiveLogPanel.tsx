import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useLogTailQuery } from '@/hooks/useQueries';

interface LiveLogPanelProps {
  file: 'wa' | 'cc' | 'results';
  title?: string;
  height?: number;
}

export const LiveLogPanel: React.FC<LiveLogPanelProps> = ({ file, title, height = 180 }) => {
  const { data } = useLogTailQuery(file);
  const scrollViewRef = useRef<ScrollView>(null);

  const lines = data?.lines || [];

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [lines]);

  if (lines.length === 0) return null;

  return (
    <Surface style={[styles.container, { height }]} elevation={1}>
      {title && <Text variant="labelSmall" style={styles.title}>{title}</Text>}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        {lines.map((line, i) => (
          <Text key={`${file}-log-${i}`} style={styles.logText}>
            {line}
          </Text>
        ))}
      </ScrollView>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    marginVertical: 8,
    padding: 8,
    overflow: 'hidden',
  },
  title: {
    color: '#9CA3AF',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 4,
  },
  logText: {
    color: '#10B981',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 2,
  },
});
