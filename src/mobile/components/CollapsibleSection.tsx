import React, { useState, ReactNode } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, fontSize } from '@/constants/theme';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  icon?: string;
  defaultOpen?: boolean;
  accentColor?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  icon = 'chevron-right',
  defaultOpen = false,
  accentColor = colors.primary,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const heightValue = useSharedValue(defaultOpen ? 1 : 0);

  const toggle = () => {
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    heightValue.value = withTiming(newOpen ? 1 : 0, { duration: 250 });
  };

  const contentStyle = useAnimatedStyle(() => ({
    opacity: heightValue.value,
    maxHeight: heightValue.value === 0 ? 0 : 2000,
  }));

  return (
    <View style={styles.section}>
      <AnimatedPressable 
        onPress={toggle} 
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={`Toggle ${title} section`}
      >
        <MaterialIcons name={icon as any} size={16} color={accentColor} />
        <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
        <MaterialIcons 
          name={isOpen ? 'expand-less' : 'expand-more'} 
          size={20} 
          color={colors.textSecondary} 
        />
      </AnimatedPressable>
      <Animated.View style={[styles.content, contentStyle]}>
        <View style={styles.contentPadding}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.5,
  },
  content: {
    backgroundColor: colors.surfaceElevated,
  },
  contentPadding: {
    padding: 16,
  },
});

