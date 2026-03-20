import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, radii } from '@/constants/theme';

interface StatusIslandProps {
  activeCount: number;
  labels: string[];
}

/**
 * Floating HUD pill showing how many automations are currently active.
 */
export const StatusIsland: React.FC<StatusIslandProps> = ({ activeCount, labels }) => {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (activeCount > 0) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    } else {
      pulse.value = withTiming(0.3, { duration: 300 });
    }
  }, [activeCount]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  const isActive = activeCount > 0;
  const dotColor = isActive ? colors.success : colors.textMuted;
  const statusText = isActive
    ? `${activeCount} ACTIVE`
    : 'ALL IDLE';

  return (
    <View style={styles.island}>
      <Animated.View style={[styles.dot, { backgroundColor: dotColor }, dotStyle]} />
      <Text style={[styles.statusText, isActive && { color: colors.success }]}>
        {statusText}
      </Text>
      {labels.length > 0 && (
        <Text style={styles.labels}>
          {labels.join(' · ')}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  island: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontVariant: ['tabular-nums'],
  },
  labels: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
