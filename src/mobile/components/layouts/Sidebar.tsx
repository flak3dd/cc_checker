import React from 'react';
import { View, ViewStyle, StyleProp, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SidebarProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  sidebarWidth?: number;
  side?: 'left' | 'right';
  space?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Sidebar - Every Layout sidebar layout primitive
 * Places content in a sidebar alongside main content
 * Responsive and flexible for different screen sizes
 */
export const Sidebar: React.FC<SidebarProps> = ({
  children,
  sidebar,
  sidebarWidth = SCREEN_WIDTH * 0.3,
  side = 'right',
  space = 16,
  style
}) => {
  const mainContent = children;
  const sidebarContent = sidebar;

  return (
    <View
      style={[
        {
          flexDirection: side === 'left' ? 'row' : 'row-reverse',
          flex: 1,
        },
        style
      ]}
    >
      <View
        style={{
          width: sidebarWidth,
          marginRight: side === 'right' ? space : 0,
          marginLeft: side === 'left' ? space : 0,
        }}
      >
        {sidebarContent}
      </View>
      <View style={{ flex: 1 }}>
        {mainContent}
      </View>
    </View>
  );
};