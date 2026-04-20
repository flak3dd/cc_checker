import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

interface CoverProps {
  children: React.ReactNode;
  minHeight?: number;
  space?: 'start' | 'end' | 'between' | 'around' | 'evenly';
  style?: StyleProp<ViewStyle>;
}

/**
 * Cover - Every Layout full-height layout primitive
 * Distributes content vertically across the full available height
 * Perfect for hero sections, landing pages, and full-screen layouts
 */
export const Cover: React.FC<CoverProps> = ({
  children,
  minHeight,
  space = 'between',
  style
}) => {
  const childrenArray = React.Children.toArray(children);

  const getJustifyContent = () => {
    switch (space) {
      case 'start': return 'flex-start';
      case 'end': return 'flex-end';
      case 'between': return 'space-between';
      case 'around': return 'space-around';
      case 'evenly': return 'space-evenly';
      default: return 'space-between';
    }
  };

  return (
    <View
      style={[
        {
          flex: 1,
          justifyContent: getJustifyContent(),
          alignItems: 'center',
          ...(minHeight && { minHeight }),
        },
        style
      ]}
    >
      {childrenArray.map((child, index) => (
        <View key={index} style={{ width: '100%' }}>
          {child}
        </View>
      ))}
    </View>
  );
};