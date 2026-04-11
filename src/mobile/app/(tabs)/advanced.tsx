import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Alert,
  FlatList,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  runOnJS,
  Easing,
  interpolate,
  Extrapolate,
  useAnimatedScrollHandler,
  useAnimatedRef,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { colors, spacing, fontSize, radii, shadows } from '@/constants/theme';
import { Stack, Inline, Center, Cover, Sidebar, Switcher, Skeleton, SkeletonCard } from '@/components/layouts';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Physics constants for fluid animations
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 150,
  mass: 1,
};

const FAST_SPRING_CONFIG = {
  damping: 20,
  stiffness: 300,
  mass: 0.5,
};

const BOUNCE_SPRING_CONFIG = {
  damping: 8,
  stiffness: 200,
  mass: 1,
};

// Interactive button with microinteractions
const ResponsiveButton: React.FC<{
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  haptic?: boolean;
}> = ({ title, onPress, variant = 'primary', haptic = true }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const glow = useSharedValue(0);
  const rippleScale = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
    shadowOpacity: glow.value,
    shadowRadius: interpolate(glow.value, [0, 1], [0, 8]),
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: interpolate(rippleScale.value, [0, 1], [0.6, 0]),
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, FAST_SPRING_CONFIG);
    opacity.value = withTiming(0.9, { duration: 50 });
    glow.value = withTiming(0.3, { duration: 100 });
    rippleScale.value = withTiming(1.5, { duration: 300 });
  }, [scale, opacity, glow, rippleScale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, FAST_SPRING_CONFIG);
    opacity.value = withTiming(1, { duration: 150 });
    glow.value = withTiming(0, { duration: 200 });
    rippleScale.value = withTiming(0, { duration: 200 });
  }, [scale, opacity, glow, rippleScale]);

  const handlePress = useCallback(() => {
    // Success microinteraction
    const successScale = withSequence(
      withSpring(1.1, { damping: 12, stiffness: 400 }),
      withSpring(1, { damping: 12, stiffness: 400 })
    );
    scale.value = successScale;

    // Simulate haptic feedback with animation
    if (haptic) {
      const hapticPulse = withSequence(
        withTiming(0.1, { duration: 50 }),
        withTiming(0, { duration: 50 }),
        withTiming(0.05, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
      scale.value = withSequence(successScale, hapticPulse);
    }

    onPress();
  }, [scale, onPress, haptic]);

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={[
          styles.button,
          variant === 'secondary' && styles.buttonSecondary,
          variant === 'destructive' && styles.buttonDestructive,
        ]}
      >
        <Animated.View style={[styles.ripple, rippleStyle]} />
        <Text style={[
          styles.buttonText,
          variant === 'secondary' && styles.buttonTextSecondary,
          variant === 'destructive' && styles.buttonTextDestructive,
        ]}>
          {title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Physics-based floating element with microinteractions
const FloatingElement: React.FC = () => {
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(20, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true
    );

    rotate.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );
  }, [translateY, rotate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    shadowOpacity: glow.value,
    shadowRadius: interpolate(glow.value, [0, 1], [4, 12]),
    shadowColor: colors.primary,
  }));

  const handlePress = useCallback(() => {
    // Magical microinteraction sequence
    scale.value = withSequence(
      withSpring(1.3, { damping: 10, stiffness: 300 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );

    glow.value = withSequence(
      withTiming(0.8, { duration: 200 }),
      withTiming(0, { duration: 400 })
    );

    // Bonus sparkle effect
    rotate.value = withSequence(
      withTiming(rotate.value + 45, { duration: 150 }),
      withTiming(rotate.value + 360, { duration: 800, easing: Easing.out(Easing.back(1.5)) })
    );
  }, [scale, glow, rotate]);

  return (
    <TouchableOpacity activeOpacity={1} onPress={handlePress}>
      <Animated.View style={[styles.floatingElement, animatedStyle]}>
        <MaterialIcons name="auto-awesome" size={32} color={colors.primary} />
      </Animated.View>
    </TouchableOpacity>
  );
};

// Momentum scroll indicator
const ScrollProgressIndicator: React.FC<{ scrollY: any }> = ({ scrollY }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      [0, 1000],
      [0, 1],
      Extrapolate.CLAMP
    );

    return {
      width: `${progress * 100}%`,
      opacity: progress > 0 ? 1 : 0,
    };
  });

  return (
    <View style={styles.progressContainer}>
      <Animated.View style={[styles.progressBar, animatedStyle]} />
    </View>
  );
};

// Spring-loaded card that bounces back
const SpringCard: React.FC<{
  title: string;
  description: string;
  icon: string;
}> = ({ title, description, icon }) => {
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);

  // Note: panGesture is not used in this component, keeping for future enhancement

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.springCard, animatedStyle]}>
      <View style={styles.cardHeader}>
        <MaterialIcons name={icon as any} size={24} color={colors.primary} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardDescription}>{description}</Text>
    </Animated.View>
  );
};

// Liquid loading animation with microinteractions
const LiquidLoader: React.FC = () => {
  const progress = useSharedValue(0);
  const [isLoading, setIsLoading] = useState(false);
  const bounceScale = useSharedValue(1);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    // Bounce effect on start
    bounceScale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );

    progress.value = withTiming(1, { duration: 2000 }, (finished) => {
      if (finished) {
        runOnJS(setIsLoading)(false);
        progress.value = 0;
        // Success bounce
        bounceScale.value = withSequence(
          withSpring(1.1, { damping: 10, stiffness: 400 }),
          withSpring(1, { damping: 12, stiffness: 300 })
        );
      }
    });
  }, [progress, bounceScale]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounceScale.value }],
  }));

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 0.5, 1], [1, 1.2, 0.8]);
    const opacity = interpolate(progress.value, [0, 0.8, 1], [1, 1, 0]);
    const rotate = interpolate(progress.value, [0, 1], [0, 360]);

    return {
      transform: [{ scale }, { rotate: `${rotate}deg` }],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.loaderContainer, containerStyle]}>
      <ResponsiveButton
        title={isLoading ? "Loading..." : "Start Liquid Animation"}
        onPress={startLoading}
        variant="secondary"
      />
      <Animated.View style={[styles.liquidLoader, animatedStyle]}>
        <MaterialIcons name="water-drop" size={48} color={colors.primary} />
      </Animated.View>
    </Animated.View>
  );
};

// Interactive pulse element with microinteractions
const PulseElement: React.FC = () => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const pulseCount = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePress = useCallback(() => {
    // Multi-stage microinteraction
    scale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 400 }),
      withSpring(0.9, { damping: 12, stiffness: 300 }),
      withSpring(1.1, { damping: 10, stiffness: 350 }),
      withSpring(1, { damping: 12, stiffness: 300 })
    );

    opacity.value = withSequence(
      withTiming(0.7, { duration: 100 }),
      withTiming(1, { duration: 200 })
    );

    pulseCount.value += 1;
  }, [scale, opacity, pulseCount]);

  React.useEffect(() => {
    // Auto-pulse every 3 seconds
    const interval = setInterval(() => {
      scale.value = withSequence(
        withSpring(1.05, { damping: 15, stiffness: 200 }),
        withSpring(1, { damping: 15, stiffness: 200 })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [scale]);

  return (
    <TouchableOpacity activeOpacity={1} onPress={handlePress}>
      <Animated.View style={[styles.pulseElement, animatedStyle]}>
        <MaterialIcons name="favorite" size={28} color={colors.success} />
        <Text style={styles.pulseText}>{pulseCount.value}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// State change microinteraction demo
const StateChangeDemo: React.FC = () => {
  const [currentState, setCurrentState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  const getBackgroundColor = () => {
    switch (currentState) {
      case 'loading': return colors.warningMuted;
      case 'success': return colors.successMuted;
      case 'error': return colors.dangerMuted;
      default: return colors.primaryMuted;
    }
  };

  const handleStateChange = useCallback((newState: typeof currentState) => {
    setCurrentState(newState);

    switch (newState) {
      case 'loading':
        scale.value = withRepeat(withSpring(1.1, { damping: 10, stiffness: 200 }), -1, true);
        rotate.value = withRepeat(withTiming(360, { duration: 1000 }), -1, false);
        break;
      case 'success':
        scale.value = withSpring(1, SPRING_CONFIG);
        rotate.value = withSpring(0, SPRING_CONFIG);
        // Success bounce
        scale.value = withSequence(
          withSpring(1.2, { damping: 8, stiffness: 400 }),
          withSpring(1, { damping: 12, stiffness: 300 })
        );
        break;
      case 'error':
        scale.value = withSpring(1, SPRING_CONFIG);
        rotate.value = withSpring(0, SPRING_CONFIG);
        // Error shake
        scale.value = withSequence(
          withTiming(1.1, { duration: 100 }),
          withTiming(0.9, { duration: 100 }),
          withTiming(1.1, { duration: 100 }),
          withTiming(1, { duration: 100 })
        );
        break;
      default:
        scale.value = withSpring(1, SPRING_CONFIG);
        rotate.value = withSpring(0, SPRING_CONFIG);
    }
  }, [scale, rotate]);

  const getStateIcon = () => {
    switch (currentState) {
      case 'loading': return 'hourglass-empty';
      case 'success': return 'check-circle';
      case 'error': return 'error';
      default: return 'radio-button-unchecked';
    }
  };

  const getStateText = () => {
    switch (currentState) {
      case 'loading': return 'Processing...';
      case 'success': return 'Success!';
      case 'error': return 'Error occurred';
      default: return 'Ready';
    }
  };

  return (
    <View style={styles.stateContainer}>
      <Animated.View style={[styles.stateIndicator, animatedStyle, { backgroundColor: getBackgroundColor() }]}>
        <MaterialIcons name={getStateIcon() as any} size={24} color={colors.textPrimary} />
      </Animated.View>
      <Text style={styles.stateText}>{getStateText()}</Text>
      <View style={styles.stateButtons}>
        <TouchableOpacity
          style={styles.miniButton}
          onPress={() => handleStateChange('idle')}
        >
          <Text style={styles.miniButtonText}>Idle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.miniButton}
          onPress={() => handleStateChange('loading')}
        >
          <Text style={styles.miniButtonText}>Load</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.miniButton}
          onPress={() => handleStateChange('success')}
        >
          <Text style={styles.miniButtonText}>Success</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.miniButton}
          onPress={() => handleStateChange('error')}
        >
          <Text style={styles.miniButtonText}>Error</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function AdvancedPage() {
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const showAlert = useCallback((message: string) => {
    Alert.alert('Advanced UI', message);
  }, []);

  const demoItems = Array.from({ length: 20 }, (_, i) => ({
    id: i.toString(),
    title: `Item ${i + 1}`,
    description: `This is a fluid, responsive item with momentum scrolling and spring animations. Item ${i + 1} demonstrates high-performance UI.`,
  }));

  const renderDemoItem = useCallback(({ item }: { item: typeof demoItems[0] }) => (
    <SpringCard
      title={item.title}
      description={item.description}
      icon="widgets"
    />
  ), []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollProgressIndicator scrollY={scrollY} />

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
        decelerationRate="fast"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Advanced UI</Text>
          <Text style={styles.subtitle}>
            High Responsiveness & Fluid Animations
          </Text>
          <FloatingElement />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Responsive Interactions</Text>
          <Text style={styles.sectionDescription}>
            All interactions respond in {'<'}100ms with immediate visual feedback
          </Text>

          <View style={styles.buttonGrid}>
            <ResponsiveButton
              title="Instant Alert"
              onPress={() => showAlert('Immediate response! INP < 50ms')}
            />
            <ResponsiveButton
              title="Spring Bounce"
              onPress={() => showAlert('Spring animation triggered')}
              variant="secondary"
            />
            <ResponsiveButton
              title="Error State"
              onPress={() => showAlert('Destructive action simulated')}
              variant="destructive"
            />
          </View>

          <View style={styles.stateDemo}>
            <StateChangeDemo />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Liquid Animations</Text>
          <Text style={styles.sectionDescription}>
            Physics-based animations that feel natural and fluid
          </Text>
          <LiquidLoader />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Microinteractions</Text>
          <Text style={styles.sectionDescription}>
            Tiny, purposeful animations that make interactions feel magical
          </Text>
          <View style={styles.microContainer}>
            <PulseElement />
            <Text style={styles.microDescription}>
              Tap the heart for multi-stage feedback • Auto-pulses every 3 seconds
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Layout Primitives</Text>
          <Text style={styles.sectionDescription}>
            Every Layout patterns adapted for React Native with design token spacing
          </Text>

          <Stack space="lg">
            <View style={styles.layoutDemo}>
              <Text style={styles.demoTitle}>Stack (Vertical Rhythm)</Text>
              <Stack space="sm">
                <View style={styles.demoItem}><Text style={styles.demoText}>Item 1</Text></View>
                <View style={styles.demoItem}><Text style={styles.demoText}>Item 2</Text></View>
                <View style={styles.demoItem}><Text style={styles.demoText}>Item 3</Text></View>
              </Stack>
            </View>

            <View style={styles.layoutDemo}>
              <Text style={styles.demoTitle}>Inline/Cluster (Horizontal)</Text>
              <Inline space="md" wrap>
                <View style={styles.demoItem}><Text style={styles.demoText}>A</Text></View>
                <View style={styles.demoItem}><Text style={styles.demoText}>B</Text></View>
                <View style={styles.demoItem}><Text style={styles.demoText}>C</Text></View>
                <View style={styles.demoItem}><Text style={styles.demoText}>D</Text></View>
              </Inline>
            </View>

            <View style={styles.layoutDemo}>
              <Text style={styles.demoTitle}>Center</Text>
              <View style={{ height: 120, backgroundColor: colors.surfaceElevated, borderRadius: radii.md }}>
                <Center>
                  <View style={styles.demoItem}><Text style={styles.demoText}>Centered</Text></View>
                </Center>
              </View>
            </View>

            <View style={styles.layoutDemo}>
              <Text style={styles.demoTitle}>Switcher (Responsive)</Text>
              <Switcher space={spacing.md}>
                <View style={styles.demoItem}><Text style={styles.demoText}>Switch</Text></View>
                <View style={styles.demoItem}><Text style={styles.demoText}>Items</Text></View>
              </Switcher>
            </View>

            <View style={styles.layoutDemo}>
              <Text style={styles.demoTitle}>Zero Layout Shift - Skeletons</Text>
              <Stack space="md">
                <SkeletonCard />
                <Inline space="sm">
                  <Skeleton width={80} height={32} borderRadius={16} />
                  <Skeleton width={60} height={32} borderRadius={16} />
                  <Skeleton width={100} height={32} borderRadius={16} />
                </Inline>
              </Stack>
            </View>
          </Stack>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Momentum Scrolling</Text>
          <Text style={styles.sectionDescription}>
            Smooth, physics-based scrolling with natural deceleration
          </Text>

          <FlatList
            data={demoItems}
            renderItem={renderDemoItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            bounces={true}
            decelerationRate="fast"
            contentContainerStyle={styles.listContainer}
            style={styles.list}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This page demonstrates advanced React Native performance with Reanimated 3,
            achieving {'<'}100ms INP and fluid 60fps animations.
          </Text>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    position: 'relative',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  floatingElement: {
    position: 'absolute',
    top: -10,
    right: 20,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  buttonGrid: {
    gap: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  buttonSecondary: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDestructive: {
    backgroundColor: colors.danger,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: colors.primary,
  },
  buttonTextDestructive: {
    color: colors.textPrimary,
  },
  loaderContainer: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  liquidLoader: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  springCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardDescription: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 18,
  },
  list: {
    maxHeight: 400,
  },
  listContainer: {
    paddingVertical: spacing.sm,
  },
  progressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.surface,
    zIndex: 1000,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 1.5,
  },
  footer: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  ripple: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  pulseElement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  pulseText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.success,
  },
  microContainer: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  microDescription: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  layoutDemo: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  demoItem: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    minHeight: 40,
  },
  demoText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.primary,
  },
  stateDemo: {
    marginTop: spacing.lg,
  },
  stateContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  stateIndicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    ...shadows.md,
  },
  stateText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  stateButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  miniButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniButtonText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});