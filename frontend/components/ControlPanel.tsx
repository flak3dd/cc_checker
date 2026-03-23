import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ShimmerLoader } from '@/components/ShimmerLoader';
import { impactLight, impactMedium } from '@/utils/haptics';
import { colors, spacing, radii, fontSize, shadows } from '@/constants/theme';

interface ControlPanelProps {
  title: string;
  icon: string;
  accentColor: string;
  isRunning: boolean;
  isLoading?: boolean;
  onStart: () => void;
  onStop: () => void;
  startDisabled?: boolean;
  children?: React.ReactNode;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  title,
  icon,
  accentColor,
  isRunning,
  onStart,
  onStop,
  startDisabled,
  children,
}) => {
  const [localLoading, setLocalLoading] = useState<'start' | 'stop' | null>(null);
  const shimmer = useSharedValue(0);
  const pulseGlow = useSharedValue(0);

  useEffect(() => {
    if (isRunning) {
      shimmer.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
      pulseGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    } else {
      shimmer.value = withTiming(0, { duration: 300 });
      pulseGlow.value = withTiming(0, { duration: 300 });
    }
  }, [isRunning]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value * 0.12,
  }));

  const dotPulseStyle = useAnimatedStyle(() => ({
    opacity: pulseGlow.value,
    transform: [{ scale: 0.8 + pulseGlow.value * 0.4 }],
  }));

  const handleStart = async () => {
    impactLight();
    setLocalLoading('start');
    try { await onStart(); } finally { setLocalLoading(null); }
  };

  const handleStop = async () => {
    impactMedium();
    setLocalLoading('stop');
    try { await onStop(); } finally { setLocalLoading(null); }
  };

  const startBusy = localLoading === 'start';
  const stopBusy = localLoading === 'stop';
  const cantStart = isRunning || !!startDisabled || startBusy;
  const cantStop = !isRunning || stopBusy;

  return (
    <View style={[
      styles.panel,
      isRunning && { borderColor: accentColor + '30' },
      isRunning && shadows.glow(accentColor, 8),
    ]}>
      {/* Running shimmer overlay */}
      {isRunning && (
        <Animated.View
          style={[styles.shimmerOverlay, { backgroundColor: accentColor }, shimmerStyle]}
        />
      )}

      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={[styles.iconContainer, { backgroundColor: (isRunning ? accentColor : colors.textMuted) + '12' }]}>
            <MaterialIcons name={icon as any} size={14} color={isRunning ? accentColor : colors.textMuted} />
          </View>
          <Text style={[styles.title, isRunning && { color: colors.textPrimary }]}>{title}</Text>
          {isRunning && (
            <View style={[styles.liveBadge, { backgroundColor: accentColor + '15' }]}>
              <Animated.View style={[styles.liveDot, { backgroundColor: accentColor }, dotPulseStyle]} />
              <Text style={[styles.liveText, { color: accentColor }]}>LIVE</Text>
            </View>
          )}
        </View>
        <View style={styles.controls}>
          <AnimatedPressable
            onPress={handleStart}
            disabled={cantStart}
            style={[
              styles.controlBtn,
              { backgroundColor: cantStart ? colors.success + '06' : colors.success + '15' },
            ]}
          >
            {startBusy ? (
              <ShimmerLoader width={16} height={16} color={colors.success} />
            ) : (
              <MaterialIcons name="play-arrow" size={18} color={cantStart ? colors.textMuted : colors.success} />
            )}
          </AnimatedPressable>
          <AnimatedPressable
            onPress={handleStop}
            disabled={cantStop}
            style={[
              styles.controlBtn,
              { backgroundColor: cantStop ? colors.danger + '06' : colors.danger + '15' },
            ]}
          >
            {stopBusy ? (
              <ShimmerLoader width={16} height={16} color={colors.danger} />
            ) : (
              <MaterialIcons name="stop" size={18} color={cantStop ? colors.textMuted : colors.danger} />
            )}
          </AnimatedPressable>
        </View>
      </View>

      {children && <View style={styles.extra}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.lg,
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
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: fontSize['2xs'],
    fontWeight: '800',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  controlBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  extra: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
