import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { spacing } from '@/constants/theme';

interface PageMarginsProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function PageMargins({ style, children }: PageMarginsProps) {
  const bg = useThemeColor({}, 'background');
  return (
    <View style={[{ flex: 1, paddingHorizontal: spacing['2xl'], backgroundColor: bg }, style]}>
      {children}
    </View>
  );
}

