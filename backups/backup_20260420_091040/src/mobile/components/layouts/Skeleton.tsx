import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Skeleton - Zero layout shift loading placeholder
 * Reserves space and shows animated shimmer while content loads
 * Prevents layout shifts when content arrives
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 4,
  style
}) => {
  const shimmer = useSharedValue(0);

  React.useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, {
        duration: 1500,
        easing: Easing.inOut(Easing.ease)
      }),
      -1,
      true
    );
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value * 0.5 + 0.5,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: colors.surfaceElevated,
        },
        animatedStyle,
        style
      ]}
    />
  );
};

// Skeleton text with multiple lines
interface SkeletonTextProps {
  lines?: number;
  lineHeight?: number;
  spacing?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  lineHeight = 16,
  spacing = 8,
  style
}) => {
  return (
    <View style={style}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          height={lineHeight}
          width={index === lines - 1 ? '60%' : '100%'} // Last line shorter
          style={index > 0 ? { marginTop: spacing } : undefined}
        />
      ))}
    </View>
  );
};

// Skeleton card
export const SkeletonCard: React.FC = () => {
  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    }}>
      <Skeleton height={20} width="70%" style={{ marginBottom: 12 }} />
      <SkeletonText lines={2} lineHeight={14} spacing={6} />
      <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
        <Skeleton height={32} width={80} borderRadius={16} />
        <Skeleton height={32} width={60} borderRadius={16} />
      </View>
    </View>
  );
};