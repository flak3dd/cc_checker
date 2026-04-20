/**
 * Pressable with scale-down (0.96) + haptic feedback.
 * Every interactive element should use this instead of raw Pressable.
 */
import React, { useCallback } from 'react';
import { StyleProp, ViewStyle, GestureResponderEvent , Pressable, AccessibilityRole } from 'react-native';
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
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  onPress,
  onLongPress,
  disabled,
  style,
  activeScale = motion.pressScale,
  haptic = 'light',
  children,
  accessibilityRole,
  accessibilityLabel,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(activeScale, motion.springSnap);
  }, [activeScale, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, motion.springSnap);
  }, [scale]);

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
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};
