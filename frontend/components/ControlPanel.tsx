import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, radii } from '@/constants/theme';

interface ControlPanelProps {
  title: string;
  icon: string;
  accentColor: string;
  isRunning: boolean;
  isLoading: boolean;
  onStart: () => void;
  onStop: () => void;
  startDisabled?: boolean;
  children?: React.ReactNode;
}

/**
 * Compact, dense control panel for a single automation.
 * Minimal chrome — just a colored left accent bar, title, status, and controls.
 */
export const ControlPanel: React.FC<ControlPanelProps> = ({
  title,
  icon,
  accentColor,
  isRunning,
  isLoading,
  onStart,
  onStop,
  startDisabled,
  children,
}) => {
  return (
    <View style={[styles.panel, { borderLeftColor: isRunning ? accentColor : colors.border }]}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <MaterialIcons name={icon as any} size={16} color={isRunning ? accentColor : colors.textMuted} />
          <Text style={styles.title}>{title}</Text>
          {isRunning && (
            <View style={[styles.liveDot, { backgroundColor: accentColor }]} />
          )}
        </View>
        <View style={styles.controls}>
          {isLoading ? (
            <ActivityIndicator size={16} color={accentColor} />
          ) : (
            <>
              <Pressable
                onPress={onStart}
                disabled={isRunning || startDisabled}
                style={({ pressed }) => [
                  styles.controlBtn,
                  { backgroundColor: colors.success + (isRunning || startDisabled ? '15' : pressed ? '40' : '25') },
                ]}
              >
                <MaterialIcons
                  name="play-arrow"
                  size={16}
                  color={isRunning || startDisabled ? colors.textMuted : colors.success}
                />
              </Pressable>
              <Pressable
                onPress={onStop}
                disabled={!isRunning}
                style={({ pressed }) => [
                  styles.controlBtn,
                  { backgroundColor: colors.danger + (!isRunning ? '15' : pressed ? '40' : '25') },
                ]}
              >
                <MaterialIcons
                  name="stop"
                  size={16}
                  color={!isRunning ? colors.textMuted : colors.danger}
                />
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Extra content (upload btn, card selection, etc.) */}
      {children && <View style={styles.extra}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  extra: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
