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
import { colors, spacing, radii, fontSize, shadows } from '@/constants/theme';

interface StatusIslandProps {
  activeCount: number;
  labels: string[];
}

export const StatusIsland: React.FC<StatusIslandProps> = ({ activeCount, labels }) => {
  const pulse = useSharedValue(1);
  const glowScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (activeCount > 0) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        ),
        -1, true,
      );
      glowScale.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1, true,
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.15, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1, true,
      );
    } else {
      pulse.value = withTiming(0.25, { duration: 400 });
      glowScale.value = withTiming(1, { duration: 400 });
      ringOpacity.value = withTiming(0, { duration: 400 });
    }
  }, [activeCount]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
  }));

  const isActive = activeCount > 0;
  const dotColor = isActive ? colors.success : colors.textMuted;
  const borderColor = isActive ? colors.success + '25' : colors.border;

  return (
    <Animated.View style={containerStyle}>
      <View style={[
        styles.island,
        { borderColor },
        isActive && shadows.glow(colors.success, 10),
      ]}>
        {/* Outer glow ring */}
        {isActive && (
          <Animated.View style={[styles.glowRing, ringStyle]} />
        )}

        <Animated.View style={[styles.dot, { backgroundColor: dotColor }, dotStyle]} />

        <Text style={[styles.statusText, isActive && { color: colors.success }]}>
          {isActive ? `${activeCount} ACTIVE` : 'ALL IDLE'}
        </Text>

        {labels.length > 0 && (
          <>
            <View style={styles.separator} />
            <Text style={styles.labels}>{labels.join(' · ')}</Text>
          </>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  island: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 3,
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
    ...shadows.md,
  },
  glowRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.successGlow,
    backgroundColor: colors.successMuted,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  separator: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  labels: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
});
