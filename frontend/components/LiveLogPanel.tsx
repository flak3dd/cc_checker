import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Dimensions } from 'react-native';
import { Modal, Portal, Text } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useLogTailQuery } from '@/hooks/useQueries';
import { colors, radii, spacing, fontSize, shadows } from '@/constants/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface LiveLogPanelProps {
  file: 'wa' | 'cc' | 'results' | 'wa-checkout';
  title?: string;
  height?: number;
}

const getLineColor = useCallback((line: string): string => {
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
}, []);

const LogLines: React.FC<{
  lines: { text: string; color: string }[];
  file: string;
  flatListRef?: React.RefObject<FlatList> | null;
}> = ({ lines, file, flatListRef }) => (
  <FlatList
    ref={flatListRef}
    data={lines}
    keyExtractor={(item, index) => `${file}-${index}`}
    renderItem={({ item, index }) => (
      <View style={styles.logRow}>
        <Text style={styles.lineNum}>{String(index + 1).padStart(3, ' ')}</Text>
        <Text style={[styles.logText, { color: item.color }]} numberOfLines={2}>
          {item.text}
        </Text>
      </View>
    )}
    style={styles.scrollView}
    contentContainerStyle={styles.contentContainer}
    showsVerticalScrollIndicator={false}
    initialNumToRender={20}
    maxToRenderPerBatch={10}
    windowSize={10}
    removeClippedSubviews={true}
  />
);

export const LiveLogPanel: React.FC<LiveLogPanelProps> = ({ file, title, height = 160 }) => {
  const { data } = useLogTailQuery(file);
const scrollRef = useRef<FlatList>(null);
  const fullscreenScrollRef = useRef<FlatList>(null);
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
        <LogLines lines={coloredLines} file={file} flatListRef={scrollRef} />
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
          <LogLines lines={coloredLines} file={`${file}-full`} flatListRef={fullscreenScrollRef} />
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
    paddingVertical: spacing.sm,
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
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  badge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.sm,
  },
  lineCount: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  logRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 1,
  },
  lineNum: {
    color: colors.textMuted,
    fontFamily: 'monospace',
    fontSize: 10,
    lineHeight: 14,
    opacity: 0.4,
    minWidth: 20,
    textAlign: 'right',
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: 10,
    lineHeight: 14,
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
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '700',
    letterSpacing: 0.5,
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
