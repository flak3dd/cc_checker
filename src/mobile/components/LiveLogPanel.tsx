import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useSSELogs } from '@/hooks/useSSELogs';
import { colors, spacing, fontSize, radii } from '@/constants/theme';

interface LiveLogPanelProps {
  tabs?: { file: string; title: string; icon?: string }[];
  file?: string;
  title?: string;
  height?: number;
}

const LogLines: React.FC<{
  lines: { text: string; color: string; timestamp: string }[];
  file: string;
}> = ({ lines, file }) => (
  <FlatList
    data={lines}
    keyExtractor={(_, i) => `${file}-${i}`}
    renderItem={({ item, index }) => (
      <View style={styles.logRow}>
        <Text style={styles.lineNum}>{item.timestamp || String(index + 1).padStart(3, ' ')}</Text>
        <Text style={[styles.logText, { color: item.color }]} numberOfLines={2}>{item.text}</Text>
      </View>
    )}
    style={styles.scrollView}
    contentContainerStyle={styles.contentContainer}
    showsVerticalScrollIndicator={false}
    initialNumToRender={15}
    maxToRenderPerBatch={8}
  />
);

export const LiveLogPanel: React.FC<LiveLogPanelProps> = ({
  tabs,
  file,
  title,
  height = 160
}) => {
  const logTabs = tabs || (file ? [{ file, title: title || file }] : []);
  if (logTabs.length === 0) return null;

  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const activeTab = logTabs[activeTabIndex] || { file: 'wa', title: 'wa' };

  const sseData = useSSELogs({ file: activeTab.file as any });
  const scrollRef = useRef<FlatList>(null);
  const [expanded, setExpanded] = useState(false);

  const coloredLines = useMemo(
    () => sseData.lines
      .filter((l: any) => l?.text?.content)
      .map((l: any) => ({
        text: l.text.content || '',
        color: colors.terminalText,
        timestamp: l.text.timestamp || '',
      })),
    [sseData.lines]
  );

  useEffect(() => {
    if (coloredLines.length > 0 && scrollRef.current) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [coloredLines.length]);

  const toggleExpand = () => setExpanded(prev => !prev);

  if (coloredLines.length === 0) return null;

  return (
    <View style={[styles.container, { height }]}>
      <TouchableOpacity onPress={toggleExpand} style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <Text style={styles.title}>Live Activity</Text>
        </View>
        <View style={styles.titleRight}>
          <View style={styles.badge}>
            <Text style={styles.lineCount}>{coloredLines.length}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {logTabs.length > 1 && (
        <View style={styles.tabsRow}>
          {logTabs.map((tab, i) => (
            <TouchableOpacity
              key={tab.file}
              onPress={() => setActiveTabIndex(i)}
              style={[styles.tab, i === activeTabIndex && styles.tabActive]}
            >
              <Text style={[styles.tabText, i === activeTabIndex && styles.tabTextActive]}>{tab.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <LogLines lines={coloredLines} file={activeTab.file} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.terminalBg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  titleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing['2xs'],
    borderRadius: radii.sm,
  },
  lineCount: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.terminalBg,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.sm,
  },
  logRow: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  lineNum: {
    fontSize: fontSize.xs,
    color: colors.terminalDim,
    minWidth: 45,
    textAlign: 'right',
    marginRight: spacing.sm,
    fontFamily: 'monospace',
  },
  logText: {
    fontSize: fontSize.sm,
    fontFamily: 'monospace',
    flex: 1,
  },
});