import React, { useEffect } from 'react';
import { StyleSheet, Dimensions, Platform, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
  withSequence,
  withDelay,
  withRepeat,
  interpolate,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SplashAnimationProps {
  onFinish: () => void;
}

export const SplashAnimation: React.FC<SplashAnimationProps> = ({ onFinish }) => {
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const logoRotateX = useSharedValue(20);
  const logoRotateY = useSharedValue(-20);
  const glowOpacity = useSharedValue(0);
  const scanLinePos = useSharedValue(-150);
  const finalFade = useSharedValue(1);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { scale: logoScale.value },
      { rotateX: `${logoRotateX.value}deg` },
      { rotateY: `${logoRotateY.value}deg` },
    ],
    opacity: logoOpacity.value,
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: logoScale.value * 1.4 }],
  }));

  const outerGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * 0.4,
    transform: [{ scale: logoScale.value * 1.8 }],
  }));

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLinePos.value }],
    opacity: interpolate(logoOpacity.value, [0, 1], [0, 0.6]),
  }));

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 1000 });
    logoScale.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.back(1.2)) });
    logoRotateX.value = withTiming(0, { duration: 1500, easing: Easing.out(Easing.quad) });
    logoRotateY.value = withTiming(0, { duration: 1500, easing: Easing.out(Easing.quad) });

    const breathingTimer = setTimeout(() => {
      logoRotateX.value = withRepeat(withTiming(4, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
      logoRotateY.value = withRepeat(withTiming(-4, { duration: 2500, easing: Easing.inOut(Easing.sin) }), -1, true);
    }, 1500);

    glowOpacity.value = withDelay(800, withRepeat(
      withSequence(withTiming(0.8, { duration: 1000 }), withTiming(0.4, { duration: 1000 })),
      -1, true,
    ));

    scanLinePos.value = withRepeat(
      withTiming(SCREEN_WIDTH * 0.8, { duration: 2500, easing: Easing.linear }),
      -1, false,
    );

    const fadeTimer = setTimeout(() => {
      finalFade.value = withTiming(0, { duration: 800, easing: Easing.in(Easing.cubic) }, () => {
        runOnJS(onFinish)();
      });
    }, 4500);

    return () => { clearTimeout(fadeTimer); clearTimeout(breathingTimer); };
  }, [onFinish]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: finalFade.value }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.View style={[styles.outerGlow, outerGlowStyle]} />
      <Animated.View style={[styles.innerGlow, glowAnimatedStyle]} />
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <Image source={require('@/assets/images/icon.png')} style={styles.logo} contentFit="contain" />
        <Animated.View style={[styles.scanLineContainer, scanLineStyle]}>
          <View style={styles.scanLine} />
        </Animated.View>
      </Animated.View>
      <View style={styles.staticScanlines} pointerEvents="none">
        {Array.from({ length: 40 }).map((_, i) => (
          <View key={i} style={styles.staticScanline} />
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  logoContainer: { width: SCREEN_WIDTH * 0.78, height: SCREEN_WIDTH * 0.78, zIndex: 10, overflow: 'hidden' },
  logo: { width: '100%', height: '100%' },
  innerGlow: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.5, height: SCREEN_WIDTH * 0.5,
    borderRadius: SCREEN_WIDTH * 0.25,
    backgroundColor: `${colors.primary}40`,
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 50 },
      android: { elevation: 15 },
    }),
  },
  outerGlow: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.8, height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    backgroundColor: `${colors.primary}1F`,
    ...Platform.select({
      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 100 },
    }),
  },
  scanLineContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: 100, zIndex: 11 },
  scanLine: { height: 3, width: '100%', backgroundColor: `${colors.primary}B3` },
  staticScanlines: { ...StyleSheet.absoluteFillObject, opacity: 0.03 },
  staticScanline: { height: 2, width: '100%', backgroundColor: '#FFFFFF', marginBottom: 10 },
});
