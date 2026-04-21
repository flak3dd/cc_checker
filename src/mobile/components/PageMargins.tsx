import React from 'react';
import { View, StyleProp, ViewStyle, Platform } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { spacing } from '@/constants/theme';
import { black } from 'react-native-paper/lib/typescript/styles/themes/v2/colors';

type PageMarginsProps = {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  maxWidth?: number | `${number}%`; // Explicit union for TS safety
};

export function PageMargins({
  style,
  children,
  maxWidth = '90%',
}: PageMarginsProps) {
  const bg = useThemeColor({}, 'background');

  return (
    <View
      style={[
        {
          flex: 1,
          width: '80%',
          maxWidth,                    // Now properly typed
          alignSelf: 'center',         // Centers on mobile
          paddingHorizontal: spacing['2xl'],
          backgroundColor: bg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}