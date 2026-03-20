import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { useLogTailQuery } from '@/hooks/useQueries';
import { colors, radii, spacing } from '@/constants/theme';

interface LiveLogPanelProps {
  file: 'wa' | 'cc' | 'results' | 'wa-checkout' | 'carfacts';
  title?: string;
  height?: number;
}

function getLineColor(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes('[hit') || lower.includes('success') || lower.includes('✓') || lower.includes('pass')) {
    return colors.success;
  }
  if (lower.includes('[fail') || lower.includes('error') || lower.includes('✗') || lower.includes('failed') || lower.includes('crash')) {
    return colors.terminalError;
  }
  if (lower.includes('warning') || lower.includes('retry') || lower.includes('timeout')) {
    return colors.terminalHighlight;
  }
  if (lower.includes('start') || lower.includes('running') || lower.includes('processing') || lower.includes('session')) {
    return colors.info;
  }
  return colors.terminalText;
}

export const LiveLogPanel: React.FC<LiveLogPanelProps> = ({ file, title, height = 180 }) => {
  const { data } = useLogTailQuery(file);
  const scrollViewRef = useRef<ScrollView>(null);
  const lines = data?.lines || [];

  useEffect(() => {
    if (scrollViewRef.current && lines.length > 0) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [lines]);

  const coloredLines = useMemo(
    () => lines.map((line) => ({ text: line, color: getLineColor(line) })),
    [lines],
  );

  if (lines.length === 0) return null;

  return (
    <View style={[styles.container, { height }]}>
      {title && (
        <View style={styles.titleRow}>
          <View style={styles.dot} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.lineCount}>{lines.length} lines</Text>
        </View>
      )}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {coloredLines.map((line, i) => (
          <Text key={`${file}-log-${i}`} style={[styles.logText, { color: line.color }]}>
            {line.text}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.terminalBg,
    borderRadius: radii.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  title: {
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    flex: 1,
  },
  lineCount: {
    color: colors.textMuted,
    fontSize: 9,
    fontVariant: ['tabular-nums'],
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xs,
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: 10.5,
    lineHeight: 16,
    marginBottom: 1,
  },
});
