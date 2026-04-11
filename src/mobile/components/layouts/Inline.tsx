import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { spacing } from '@/constants/theme';

interface InlineProps {
  children: React.ReactNode;
  space?: keyof typeof spacing;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Inline / Cluster - Horizontal grouping layout primitive
 * Creates consistent horizontal spacing and alignment between child elements
 */
export const Inline: React.FC<InlineProps> = ({
  children,
  space = 'md',
  align = 'center',
  justify = 'start',
  wrap = false,
  style
}) => {
  const getAlignItems = () => {
    switch (align) {
      case 'start': return 'flex-start';
      case 'center': return 'center';
      case 'end': return 'flex-end';
      case 'stretch': return 'stretch';
      default: return 'center';
    }
  };

  const getJustifyContent = () => {
    switch (justify) {
      case 'start': return 'flex-start';
      case 'center': return 'center';
      case 'end': return 'flex-end';
      case 'between': return 'space-between';
      case 'around': return 'space-around';
      case 'evenly': return 'space-evenly';
      default: return 'flex-start';
    }
  };

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: getAlignItems(),
          justifyContent: getJustifyContent(),
          flexWrap: wrap ? 'wrap' : 'nowrap',
        },
        style
      ]}
    >
      {React.Children.map(children, (child, index) => (
        <View
          key={index}
          style={[
            index > 0 && { marginLeft: spacing[space] }
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  );
};

// Alias for backward compatibility
export const Cluster = Inline;