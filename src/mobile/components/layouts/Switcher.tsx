import React from 'react';
import { View, ViewStyle, StyleProp, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SwitcherProps {
  children: React.ReactNode;
  threshold?: number;
  space?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Switcher - Every Layout responsive switching primitive
 * Stacks children vertically on small screens, horizontal on larger screens
 * Automatically switches layout based on available space and threshold
 */
export const Switcher: React.FC<SwitcherProps> = ({
  children,
  threshold = SCREEN_WIDTH * 0.5,
  space = 16,
  style
}) => {
  const childrenArray = React.Children.toArray(children);

  // For mobile, we'll always stack vertically since we're in a constrained space
  // In a real implementation, you'd check available width and switch accordingly
  const shouldStack = true; // Always stack on mobile for now

  if (shouldStack) {
    return (
      <View style={style}>
        {childrenArray.map((child, index) => (
          <View
            key={index}
            style={[
              index > 0 && { marginTop: space }
            ]}
          >
            {child}
          </View>
        ))}
      </View>
    );
  }

  // Horizontal layout (would be used on wider screens)
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          flexWrap: 'wrap',
        },
        style
      ]}
    >
      {childrenArray.map((child, index) => (
        <View
          key={index}
          style={[
            { minWidth: threshold },
            index > 0 && { marginLeft: space }
          ]}
        >
          {child}
        </View>
      ))}
    </View>
  );
};