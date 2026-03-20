import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
  withSequence,
  withDelay,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Text } from 'react-native-paper';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SplashAnimationProps {
  onFinish: () => void;
}

export const SplashAnimation: React.FC<SplashAnimationProps> = ({ onFinish }) => {
  // Animation values
  const logoScale = useSharedValue(1);
  const logoOpacity = useSharedValue(1);
  const plateOpacity = useSharedValue(0);
  const plateScale = useSharedValue(0.08); // Unified scale for isotropic metal plate reveal
  const textReveal = useSharedValue(0);     // 0 → 1 for punched text opacity + glow
  const vignetteOpacity = useSharedValue(0); // subtle edge vignette during plate phase
  const finalFade = useSharedValue(1);

  // Unified plate style (scale + opacity)
  const plateAnimatedStyle = useAnimatedStyle(() => ({
    opacity: plateOpacity.value,
    transform: [{ scale: plateScale.value }],
  }));

  // Logo style
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  // Text style with glow + punch effect
  const textAnimatedStyle = useAnimatedStyle(() => {
    const glow = interpolate(textReveal.value, [0, 0.6, 1], [0, 8, 3], Extrapolate.CLAMP);
    return {
      opacity: textReveal.value,
      textShadowRadius: glow,
      textShadowOpacity: textReveal.value * 0.7,
    };
  });

  // Vignette overlay
  const vignetteStyle = useAnimatedStyle(() => ({
    opacity: vignetteOpacity.value,
  }));

  useEffect(() => {
    // Sequence timeline (total ~5.5–6s for premium feel)
    // 0.0s – 1.0s: Logo shrink + subtle spin
    logoScale.value = withTiming(0.75, {
      duration: 1000,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    logoOpacity.value = withTiming(0.92, { duration: 1000 }); // slight fade-in realism

    // 0.8s – 2.2s: Plate reveal (expand + metallic pop)
    plateOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
    plateScale.value = withDelay(800, withSequence(
      withTiming(1.08, { duration: 600, easing: Easing.out(Easing.exp) }), // slight overshoot
      withTiming(1.0, { duration: 400, easing: Easing.out(Easing.back(2)) })
    ));

    // 1.8s – 3.0s: Punched text + glow reveal
    textReveal.value = withDelay(1800, withTiming(1, {
      duration: 1200,
      easing: Easing.bezier(0.4, 0, 0.2, 1.2),
    }));

    // 2.5s+: Vignette darkens edges for cinematic depth
    vignetteOpacity.value = withDelay(2500, withTiming(0.35, { duration: 800 }));

    // 4.8s – 5.5s: Full fade to black + callback
    const fadeTimer = setTimeout(() => {
      finalFade.value = withTiming(0, {
        duration: 700,
        easing: Easing.in(Easing.quad),
      }, () => {
        runOnJS(onFinish)();
      });
    }, 4800);

    return () => {
      clearTimeout(fadeTimer);
    };
  }, [onFinish]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: finalFade.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Subtle full-screen vignette */}
      <Animated.View style={[styles.vignette, vignetteStyle]} />

      {/* Shrinking logo */}
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          contentFit="contain"
          transition={300}
        />
      </Animated.View>

      {/* Premium metal plate with realistic brushed texture simulation */}
      <Animated.View style={[styles.plate, plateAnimatedStyle]}>
        {/* Brushed metal gradient + noise overlay */}
        <View style={styles.plateGradient} />

        {/* Punched text area with glow */}
        <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
          <Text style={styles.punchedMain}>WA REGO CHECK</Text>
          <Text style={styles.punchedSub}>PPSR AUTO</Text>

          {/* Fine perforated grid for industrial authenticity */}
          <View style={styles.perforationGrid}>
            {Array.from({ length: 48 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.perforationHole,
                  { transform: [{ rotate: `${(i % 12) * 30}deg` }] },
                ]}
              />
            ))}
          </View>
        </Animated.View>

        {/* Bevel highlights */}
        <View style={styles.bevelTop} />
        <View style={styles.bevelLeft} />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  logoContainer: {
    width: SCREEN_WIDTH * 0.58,
    height: SCREEN_WIDTH * 0.58,
    position: 'absolute',
    zIndex: 10,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  plate: {
    width: SCREEN_WIDTH * 0.88,
    height: SCREEN_HEIGHT * 0.28,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#B0B0B0',
    // Realistic metallic bevel + elevation
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.55,
        shadowRadius: 22,
      },
      android: {
        elevation: 28,
      },
    }),
  },
  plateGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#C8C8C8',
    opacity: 0.92,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  punchedMain: {
    fontSize: 34,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: 5.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    textShadowColor: '#FFFFFF88',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    includeFontPadding: false,
  },
  punchedSub: {
    fontSize: 26,
    fontWeight: '900',
    color: '#222222',
    letterSpacing: 10,
    marginTop: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    textShadowColor: '#FFFFFF99',
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 3,
  },
  perforationGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    alignContent: 'space-evenly',
    padding: 8,
  },
  perforationHole: {
    width: 3.2,
    height: 3.2,
    backgroundColor: '#000000',
    borderRadius: 2,
    margin: 5,
  },
  bevelTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  bevelLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
});