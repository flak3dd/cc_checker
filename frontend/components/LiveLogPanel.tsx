import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Modal, Portal, Text } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useLogTailQuery } from '@/hooks/useQueries';
import { colors, radii, spacing, fontSize, shadows } from '@/constants/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface LiveLogPanelProps {
  file: 'wa' | 'cc' | 'results' | 'wa-checkout' | 'carfacts';
  title?: string;
  height?: number;
}

function getLineColor(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes('[hit') || lower.includes('success') || lower.includes('✓') || lower.includes('pass'))
    return colors.success;
  if (lower.includes('[fail') || lower.includes('error') || lower.includes('✗') || lower.includes('failed') || lower.includes('crash'))
    return colors.terminalError;
  if (lower.includes('warning') || lower.includes('retry') || lower.includes('timeout') || lower.includes('⏳'))
    return colors.terminalHighlight;
  if (lower.includes('start') || lower.includes('running') || lower.includes('session') || lower.includes('==='))
    return colors.info;
  if (lower.includes('paused') || lower.includes('waiting') || lower.includes('selected'))
    return colors.accent;
  return colors.terminalText;
}

const LogLines: React.FC<{
  lines: { text: string; color: string }[];
  file: string;
  scrollRef?: React.RefObject<ScrollView | null>;
}> = ({ lines, file, scrollRef }) => (
  <ScrollView
    ref={scrollRef}
    style={styles.scrollView}
    contentContainerStyle={styles.contentContainer}
    showsVerticalScrollIndicator={false}
  >
    {lines.map((line, i) => (
      <View key={`${file}-${i}`} style={styles.logRow}>
        <Text style={styles.lineNum}>{String(i + 1).padStart(3, ' ')}</Text>
        <Text style={[styles.logText, { color: line.color }]} numberOfLines={2}>
          {line.text}
        </Text>
      </View>
    ))}
  </ScrollView>
);

export const LiveLogPanel: React.FC<LiveLogPanelProps> = ({ file, title, height = 160 }) => {
  const { data } = useLogTailQuery(file);
  const scrollRef = useRef<ScrollView>(null);
  const fullscreenScrollRef = useRef<ScrollView>(null);
  const [expanded, setExpanded] = useState(false);
  const lines = data?.lines || [];

  const coloredLines = useMemo(
    () => lines.filter(l => l.trim()).map((line) => ({ text: line, color: getLineColor(line) })),
    [lines],
  );

  useEffect(() => {
    const ref = expanded ? fullscreenScrollRef : scrollRef;
    if (ref.current && coloredLines.length > 0) {
      ref.current.scrollToEnd({ animated: true });
    }
  }, [coloredLines, expanded]);

  const toggleExpand = useCallback(() => setExpanded(prev => !prev), []);

  if (coloredLines.length === 0) return null;

  return (
    <>
      <View style={[styles.container, { height }]}>
        {title && (
          <AnimatedPressable onPress={toggleExpand} style={styles.titleRow} haptic="light">
            <View style={styles.titleLeft}>
              <MaterialIcons name="terminal" size={12} color={colors.primary} />
              <Text style={styles.title}>{title}</Text>
            </View>
            <View style={styles.titleRight}>
              <View style={styles.badge}>
                <Text style={styles.lineCount}>{coloredLines.length}</Text>
              </View>
              <MaterialIcons name="open-in-full" size={13} color={colors.textMuted} />
            </View>
          </AnimatedPressable>
        )}
        <LogLines lines={coloredLines} file={file} scrollRef={scrollRef} />
      </View>

      <Portal>
        <Modal visible={expanded} onDismiss={toggleExpand} contentContainerStyle={styles.modal}>
          <View style={styles.modalHeader}>
            <View style={styles.titleLeft}>
              <MaterialIcons name="terminal" size={14} color={colors.primary} />
              <Text style={styles.modalTitle}>{title || file}</Text>
            </View>
            <View style={styles.titleRight}>
              <View style={styles.badge}>
                <Text style={styles.lineCount}>{coloredLines.length}</Text>
              </View>
              <AnimatedPressable onPress={toggleExpand} style={styles.closeBtn}>
                <MaterialIcons name="close-fullscreen" size={16} color={colors.textSecondary} />
              </AnimatedPressable>
            </View>
          </View>
          <LogLines lines={coloredLines} file={`${file}-full`} scrollRef={fullscreenScrollRef} />
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.terminalBg,
    borderRadius: radii.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontSize: fontSize.xs,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  badge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  lineCount: {
    color: colors.primary,
    fontSize: fontSize['2xs'],
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontFamily: 'monospace',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  logRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 1,
  },
  lineNum: {
    color: colors.textMuted,
    fontFamily: 'monospace',
    fontSize: fontSize.sm,
    lineHeight: 16,
    opacity: 0.4,
    minWidth: 24,
    textAlign: 'right',
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: fontSize.sm,
    lineHeight: 16,
    flex: 1,
  },
  modal: {
    backgroundColor: colors.terminalBg,
    margin: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    height: SCREEN_HEIGHT * 0.85,
    overflow: 'hidden',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontSize: fontSize.base,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
