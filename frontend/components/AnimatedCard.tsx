/**
 * Card wrapper with staggered spring entrance animation.
 * opacity 0→1, y offset 20→0, with per-index stagger delay.
 */
import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '@/constants/theme';

interface AnimatedCardProps {
  index?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  index = 0,
  children,
  style,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    const delay = index * motion.staggerDelay;
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(delay, withSpring(0, motion.springGentle));
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};
