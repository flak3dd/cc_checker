import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { spacing } from '@/constants/theme';

interface StackProps {
  children: React.ReactNode;
  space?: keyof typeof spacing;
  style?: StyleProp<ViewStyle>;
}

/**
 * Stack - Vertical rhythm layout primitive
 * Creates consistent vertical spacing between child elements
 */
export const Stack: React.FC<StackProps> = ({
  children,
  space = 'md',
  style
}) => {
  const childrenArray = React.Children.toArray(children);

  return (
    <View style={style}>
      {childrenArray.map((child, index) => (
        <View
          key={index}
          style={[
            index > 0 && { marginTop: spacing[space] }
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  );
};