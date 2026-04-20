import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, Easing, withTiming } from 'react-native-reanimated';
import { colors, spacing, shadows } from '@/constants/theme';

export function HeroShimmer() {
  const shimmer = useSharedValue(0);

  React.useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [shimmer]);

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
});

export default { HeroShimmer, CardShimmer };

