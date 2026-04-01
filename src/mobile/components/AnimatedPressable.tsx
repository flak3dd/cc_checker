/**
 * Pressable with scale-down (0.96) + haptic feedback.
 * Every interactive element should use this instead of raw Pressable.
 */
import React, { useCallback } from 'react';
import { StyleProp, ViewStyle, GestureResponderEvent , Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { impactLight } from '@/utils/haptics';
import { motion } from '@/constants/theme';

interface AnimatedPressableProps {
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  activeScale?: number;
  haptic?: 'light' | 'none';
  children: React.ReactNode;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  onPress,
  onLongPress,
  disabled,
  style,
  activeScale = motion.pressScale,
  haptic = 'light',
  children,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(activeScale, motion.springSnap);
  }, [activeScale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, motion.springSnap);
  }, []);

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      if (haptic === 'light') impactLight();
      onPress?.(e);
    },
    [onPress, haptic],
  );

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};
