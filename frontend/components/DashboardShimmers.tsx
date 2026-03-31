import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, Easing } from 'react-native-reanimated';
import { colors, spacing, shadows } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const SHIMMER_ANIMATION = {
  duration: 1500,
};

export function HeroShimmer() {
  const shimmer = useSharedValue(0);

  React.useEffect(() => {
    shimmer.value = withRepeat(
      () => {
        'worklet';
        return {
          0: 0,
          0.5: 1,
          1: 0,
        };
      },
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value * 0.15,
  }));

  return (
    <View style={[styles.heroContainer, shadows.glow(colors.primary, 12)]}>
      <Animated.View style={[styles.shimmerBar, styles.heroBar1, animatedStyle]} />
      <Animated.View style={[styles.shimmerBar, styles.heroBar2, animatedStyle]} />
      <Animated.View style={[styles.shimmerBar, styles.heroBar3, animatedStyle]} />
    </View>
  );
}

export function CardShimmer({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.cardGrid}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.shimmerCard, shadows.sm]}>
          <View style={styles.cardHeaderShimmer} />
          <View style={styles.cardContent}>
            <View style={styles.lineShimmer1} />
            <View style={styles.lineShimmer2} />
          </View>
        </View>
      ))}
    </View>
  );
}

function AnimatedShimmerLine({ width }: { width: number }) {
  const shimmer = useSharedValue(0);

  React.useEffect(() => {
    shimmer.value = withRepeat(
      () => {
        'worklet';
        return {
          0: 0,
          1: 1,
        };
      },
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmer.value * width }],
  }));

  return (
    <Animated.View style={[styles.shimmerLine, animatedStyle]} />
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    height: 120,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerBar: {
    position: 'absolute',
    height: 40,
    backgroundColor: colors.shimmer,
    borderRadius: 20,
  },
  heroBar1: {
    width: 80,
    left: -40,
  },
  heroBar2: {
    width: 120,
    left: -60,
  },
  heroBar3: {
    width: 100,
    right: -50,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  shimmerCard: {
    flex: 1,
    minWidth: 140,
    height: 100,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  cardHeaderShimmer: {
    height: 12,
    width: '60%',
    backgroundColor: colors.shimmer,
    borderRadius: 6,
    marginBottom: spacing.md,
  },
  cardContent: {
    gap: 8,
  },
  lineShimmer1: {
    height: 10,
    width: '85%',
    backgroundColor: colors.shimmer,
    borderRadius: 4,
  },
  lineShimmer2: {
    height: 10,
    width: '65%',
    backgroundColor: colors.shimmer,
    borderRadius: 4,
  },
  shimmerLine: {
    height: 12,
    backgroundColor: colors.shimmer,
    borderRadius: 6,
  },
});

export default { HeroShimmer, CardShimmer };

