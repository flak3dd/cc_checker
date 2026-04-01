/**
 * Shimmer/pulse loading placeholder — replaces static spinners.
 * Animated gradient sweep effect on a rounded bar.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, radii, spacing } from '@/constants/theme';

interface ShimmerLoaderProps {
  width?: number | string;
  height?: number;
  style?: StyleProp<ViewStyle>;
  color?: string;
}

export const ShimmerLoader: React.FC<ShimmerLoaderProps> = ({
  width = '100%',
  height = 12,
  style,
  color = colors.surfaceHighlight,
}) => {
  const shimmerOpacity = useSharedValue(0.3);

  useEffect(() => {
    shimmerOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        { width: width as any, height, backgroundColor: color },
        animatedStyle,
        style,
      ]}
    />
  );
};

/** Multi-line shimmer placeholder for content areas */
export const ShimmerBlock: React.FC<{ lines?: number; style?: StyleProp<ViewStyle> }> = ({
  lines = 3,
  style,
}) => (
  <View style={[styles.block, style]}>
    {Array.from({ length: lines }).map((_, i) => (
      <ShimmerLoader
        key={i}
        width={i === lines - 1 ? '60%' : '100%'}
        height={10}
        style={{ marginBottom: spacing.sm }}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  bar: {
    borderRadius: radii.xs,
  },
  block: {
    padding: spacing.lg,
  },
});
