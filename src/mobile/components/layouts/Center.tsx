import React from 'react';
import { View, ViewStyle, StyleProp, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CenterProps {
  children: React.ReactNode;
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
  intrinsic?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Center - Every Layout centering primitive
 * Centers content both horizontally and vertically
 * Supports max/min dimensions and intrinsic sizing
 */
export const Center: React.FC<CenterProps> = ({
  children,
  maxWidth,
  maxHeight,
  minWidth,
  minHeight,
  intrinsic = false,
  style
}) => {
  return (
    <View
      style={[
        {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          ...(maxWidth && { maxWidth }),
          ...(maxHeight && { maxHeight }),
          ...(minWidth && { minWidth }),
          ...(minHeight && { minHeight }),
        },
        style
      ]}
    >
      {intrinsic ? (
        <View style={{ flexShrink: 0 }}>
          {children}
        </View>
      ) : (
        children
      )}
    </View>
  );
};