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
import { Text } from 'react-native-paper';
import { colors, fontSize } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const LOGO_SIZE = SCREEN_WIDTH * 0.55;

interface SplashAnimationProps {
  onFinish: () => void;
}

export const SplashAnimation: React.FC<SplashAnimationProps> = ({ onFinish }) => {
  // Logo
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const logoRotateX = useSharedValue(25);
  const logoRotateY = useSharedValue(-25);

  // Glows
  const glowOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.6);
  const ring2Scale = useSharedValue(0.5);

  // Scan line
  const scanLinePos = useSharedValue(-100);

  // Text
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);

  // Glitch
  const glitchX = useSharedValue(0);
  const glitchClipLeft = useSharedValue(0);
  const glitchClipRight = useSharedValue(0);

  // Particles (orbital dots)
  const particleAngle = useSharedValue(0);

  // Final
  const finalFade = useSharedValue(1);
  const finalScale = useSharedValue(1);

  // ─── Animated Styles ───────────────────────
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      { scale: logoScale.value },
      { rotateX: `${logoRotateX.value}deg` },
      { rotateY: `${logoRotateY.value}deg` },
    ],
    opacity: logoOpacity.value,
  }));

  const innerGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const outerGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * 0.35,
    transform: [{ scale: ring2Scale.value }],
  }));

  const ring1Style = useAnimatedStyle(() => ({
    opacity: interpolate(glowOpacity.value, [0, 0.8], [0, 0.5]),
    transform: [{ scale: ringScale.value * 1.3 }, { rotate: `${particleAngle.value}deg` }],
  }));

  const ring2Style = useAnimatedStyle(() => ({
    opacity: interpolate(glowOpacity.value, [0, 0.8], [0, 0.3]),
    transform: [{ scale: ring2Scale.value * 1.6 }, { rotate: `${-particleAngle.value * 0.7}deg` }],
  }));

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLinePos.value }],
    opacity: interpolate(logoOpacity.value, [0, 1], [0, 0.7]),
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const glitchStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: glitchX.value }],
  }));

  const glitchLayerRedStyle = useAnimatedStyle(() => ({
    opacity: Math.abs(glitchX.value) > 0 ? 0.7 : 0,
    transform: [{ translateX: glitchClipLeft.value }],
  }));

  const glitchLayerCyanStyle = useAnimatedStyle(() => ({
    opacity: Math.abs(glitchX.value) > 0 ? 0.7 : 0,
    transform: [{ translateX: glitchClipRight.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: finalFade.value,
    transform: [{ scale: finalScale.value }],
  }));

  // ─── Animation Sequence ────────────────────
  useEffect(() => {
    // Phase 1: Logo entrance (0-1.5s)
    logoOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });
    logoScale.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.back(1.4)) });
    logoRotateX.value = withTiming(0, { duration: 1600, easing: Easing.out(Easing.cubic) });
    logoRotateY.value = withTiming(0, { duration: 1600, easing: Easing.out(Easing.cubic) });

    // Phase 2: Glows expand (0.5s+)
    glowOpacity.value = withDelay(500, withRepeat(
      withSequence(
        withTiming(0.9, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true,
    ));

    ringScale.value = withDelay(500, withRepeat(
      withSequence(
        withTiming(1.15, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true,
    ));

    ring2Scale.value = withDelay(700, withRepeat(
      withSequence(
        withTiming(1.2, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.95, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true,
    ));

    // Orbital rotation
    particleAngle.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1, false,
    );

    // Phase 3: Logo breathing (1.5s+)
    const breathingTimer = setTimeout(() => {
      logoRotateX.value = withRepeat(
        withSequence(
          withTiming(5, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
          withTiming(-5, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1, true,
      );
      logoRotateY.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
          withTiming(5, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1, true,
      );
    }, 1600);

    // Scan line sweep
    scanLinePos.value = withDelay(400, withRepeat(
      withSequence(
        withTiming(LOGO_SIZE, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
        withTiming(-100, { duration: 0 }),
      ),
      -1, false,
    ));

    // Phase 4: Title entrance (1.8s+)
    titleOpacity.value = withDelay(1800, withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }));
    titleTranslateY.value = withDelay(1800, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));
    subtitleOpacity.value = withDelay(2400, withTiming(0.6, { duration: 800 }));

    // Glitch twitch on title (2.5s+, repeating)
    const glitchTimer = setTimeout(() => {
      const runGlitch = () => {
        glitchX.value = withSequence(
          withTiming(6, { duration: 50 }),
          withTiming(-4, { duration: 40 }),
          withTiming(3, { duration: 30 }),
          withTiming(0, { duration: 50 }),
        );
        glitchClipLeft.value = withSequence(
          withTiming(-8, { duration: 50 }),
          withTiming(5, { duration: 40 }),
          withTiming(0, { duration: 50 }),
        );
        glitchClipRight.value = withSequence(
          withTiming(8, { duration: 50 }),
          withTiming(-3, { duration: 40 }),
          withTiming(0, { duration: 50 }),
        );
      };
      runGlitch();
      const glitchInterval = setInterval(runGlitch, 1800 + Math.random() * 1200);
      setTimeout(() => clearInterval(glitchInterval), 5000);
    }, 2500);

    // Phase 5: Exit (5s) — scale up + fade out
    const fadeTimer = setTimeout(() => {
      finalScale.value = withTiming(1.15, { duration: 900, easing: Easing.in(Easing.quad) });
      finalFade.value = withTiming(0, { duration: 900, easing: Easing.in(Easing.cubic) }, () => {
        runOnJS(onFinish)();
      });
    }, 5000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(breathingTimer);
      clearTimeout(glitchTimer);
    };
  }, [onFinish]);

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Outer ambient glow */}
      <Animated.View style={[styles.outerGlow, outerGlowStyle]} />

      {/* Orbital ring 2 (slow, counter-rotating) */}
      <Animated.View style={[styles.orbitalRing, styles.ring2, ring2Style]}>
        <View style={[styles.orbitalDot, styles.dot1]} />
        <View style={[styles.orbitalDot, styles.dot2]} />
        <View style={[styles.orbitalDot, styles.dot3]} />
      </Animated.View>

      {/* Orbital ring 1 */}
      <Animated.View style={[styles.orbitalRing, styles.ring1, ring1Style]}>
        <View style={[styles.orbitalDot, styles.dot4]} />
        <View style={[styles.orbitalDot, styles.dot5]} />
      </Animated.View>

      {/* Inner glow */}
      <Animated.View style={[styles.innerGlow, innerGlowStyle]} />

      {/* Logo with scan line */}
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          contentFit="contain"
        />
        <Animated.View style={[styles.scanLineWrap, scanLineStyle]}>
          <View style={styles.scanLine} />
          <View style={styles.scanLineGlow} />
        </Animated.View>
      </Animated.View>

      {/* Title text with glitch layers */}
      <Animated.View style={[styles.textContainer, titleStyle]}>
        <View style={styles.glitchWrap}>
          <Animated.Text style={[styles.title, styles.glitchRed, glitchLayerRedStyle]}>CARD CHECKER</Animated.Text>
          <Animated.Text style={[styles.title, styles.glitchCyan, glitchLayerCyanStyle]}>CARD CHECKER</Animated.Text>
          <Animated.Text style={[styles.title, glitchStyle]}>CARD CHECKER</Animated.Text>
        </View>
      </Animated.View>
      <Animated.View style={subtitleStyle}>
        <Text style={styles.subtitle}>AUTOMATION SUITE v1.0</Text>
      </Animated.View>

      {/* CRT scanlines overlay — limited to ~40 lines for device perf */}
      <View style={styles.crtOverlay} pointerEvents="none">
        {Array.from({ length: Math.min(Math.floor(SCREEN_HEIGHT / 20), 50) }).map((_, i) => (
          <View key={i} style={styles.crtLine} />
        ))}
      </View>

      {/* Corner brackets */}
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />
    </Animated.View>
  );
};

const CORNER_SIZE = 30;
const CORNER_THICKNESS = 2;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  // Logo
  logoContainer: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    zIndex: 10,
    overflow: 'hidden',
    borderRadius: 20,
  },
  logo: { width: '100%', height: '100%' },
  // Scan line
  scanLineWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 11,
  },
  scanLine: {
    height: 2,
    width: '100%',
    backgroundColor: colors.primary,
  },
  scanLineGlow: {
    height: 30,
    width: '100%',
    backgroundColor: colors.primary,
    opacity: 0.08,
  },
  // Glows
  innerGlow: {
    position: 'absolute',
    width: LOGO_SIZE * 1.3,
    height: LOGO_SIZE * 1.3,
    borderRadius: LOGO_SIZE * 0.65,
    backgroundColor: `${colors.primary}30`,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 60,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  outerGlow: {
    position: 'absolute',
    width: LOGO_SIZE * 2,
    height: LOGO_SIZE * 2,
    borderRadius: LOGO_SIZE,
    backgroundColor: `${colors.primary}12`,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 120,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  // Orbital rings with dots
  orbitalRing: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ring1: {
    width: LOGO_SIZE * 1.5,
    height: LOGO_SIZE * 1.5,
    borderRadius: LOGO_SIZE * 0.75,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
  },
  ring2: {
    width: LOGO_SIZE * 2,
    height: LOGO_SIZE * 2,
    borderRadius: LOGO_SIZE,
    borderWidth: 1,
    borderColor: `${colors.primary}10`,
  },
  orbitalDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  dot1: { top: 0, left: '50%' },
  dot2: { bottom: '15%', right: 0 },
  dot3: { bottom: 0, left: '30%' },
  dot4: { top: '10%', right: 0 },
  dot5: { bottom: '10%', left: 0 },
  // Title
  textContainer: {
    marginTop: 32,
    zIndex: 10,
  },
  glitchWrap: {
    position: 'relative',
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
  },
  glitchRed: {
    position: 'absolute',
    color: '#FF3B5C',
  },
  glitchCyan: {
    position: 'absolute',
    color: '#00CCCC',
  },
  subtitle: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    marginTop: 8,
  },
  // CRT overlay
  crtOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.025,
    zIndex: 20,
  },
  crtLine: {
    height: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
    marginBottom: 3,
  },
  // Corner brackets (HUD aesthetic)
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    zIndex: 15,
  },
  cornerTL: {
    top: 60,
    left: 24,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: `${colors.primary}40`,
  },
  cornerTR: {
    top: 60,
    right: 24,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: `${colors.primary}40`,
  },
  cornerBL: {
    bottom: 60,
    left: 24,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: `${colors.primary}40`,
  },
  cornerBR: {
    bottom: 60,
    right: 24,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: `${colors.primary}40`,
  },
});
