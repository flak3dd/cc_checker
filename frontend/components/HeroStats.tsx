import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { colors, spacing, radii, fontSize, motion, shadows } from '@/constants/theme';

interface HeroStatsProps {
  passCount: number;
  failCount: number;
  successRate: number;
  queueCount: number;
  totalChecked: number;
  waPlates: number;
  cfReports: number;
  cfPending: number;
}

// ─── Animated Ring ─────────────────────────────────────────────
const RING_SIZE = 100;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const AnimatedRing: React.FC<{ percent: number; color: string }> = ({ percent, color }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(300, withSpring(percent / 100, { damping: 20, stiffness: 60 }));
  }, [percent]);

  // We'll use a View-based ring approximation since SVG isn't available
  const ringStyle = useAnimatedStyle(() => ({
    borderColor: color,
    borderWidth: RING_STROKE,
    opacity: 0.15 + progress.value * 0.85,
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [-90, 270])}deg` }],
  }));

  return (
    <View style={styles.ringContainer}>
      {/* Background ring */}
      <View style={[styles.ringTrack, { borderColor: color + '15' }]} />
      {/* Progress — top half mask */}
      <Animated.View style={[styles.ringProgress, { borderColor: color }, ringStyle]} />
      {/* Inner glow */}
      <View style={[styles.ringGlow, shadows.glow(color, 16)]} />
    </View>
  );
};

// ─── Mini Stat Card ────────────────────────────────────────────
const MiniStat: React.FC<{
  value: number | string;
  label: string;
  icon: string;
  color: string;
  index: number;
}> = ({ value, label, icon, color, index }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    const delay = index * motion.staggerDelay;
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(delay, withSpring(0, motion.springGentle));
  }, [index]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.miniCard, animStyle]}>
      <View style={[styles.miniIconWrap, { backgroundColor: color + '12' }]}>
        <MaterialIcons name={icon as any} size={14} color={color} />
      </View>
      <Text style={[styles.miniValue, { color }]}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </Animated.View>
  );
};

// ─── Main Component ────────────────────────────────────────────
export const HeroStats: React.FC<HeroStatsProps> = ({
  passCount,
  failCount,
  successRate,
  queueCount,
  totalChecked,
  waPlates,
  cfReports,
  cfPending,
}) => {
  // Breathing pulse for the hero card
  const heroPulse = useSharedValue(0);
  useEffect(() => {
    heroPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true,
    );
  }, []);

  const heroBorderStyle = useAnimatedStyle(() => {
    const rateColor = successRate > 50 ? colors.success : successRate > 0 ? colors.warning : colors.textMuted;
    return {
      borderColor: rateColor + (Math.round(20 + heroPulse.value * 25)).toString(16).padStart(2, '0'),
    };
  });

  const rateColor = successRate > 50 ? colors.success : successRate > 0 ? colors.warning : colors.textMuted;

  return (
    <View style={styles.wrapper}>
      {/* ─── Hero Card: Hit Rate + Live/Dead ─── */}
      <Animated.View style={[styles.heroCard, heroBorderStyle]}>
        <View style={styles.heroLeft}>
          <View style={styles.heroRingWrap}>
            <AnimatedRing percent={successRate} color={rateColor} />
            <View style={styles.heroRingContent}>
              <Text style={[styles.heroRateValue, { color: rateColor }]}>{successRate}</Text>
              <Text style={styles.heroRateUnit}>%</Text>
            </View>
          </View>
          <Text style={styles.heroRateLabel}>HIT RATE</Text>
        </View>

        <View style={styles.heroDivider} />

        <View style={styles.heroRight}>
          {/* Live */}
          <View style={styles.heroStatRow}>
            <View style={[styles.heroDot, { backgroundColor: colors.success }]} />
            <View style={styles.heroStatText}>
              <Text style={[styles.heroStatValue, { color: colors.success }]}>{passCount}</Text>
              <Text style={styles.heroStatLabel}>LIVE</Text>
            </View>
            <View style={[styles.heroBar, { backgroundColor: colors.success + '15' }]}>
              <View style={[
                styles.heroBarFill,
                {
                  backgroundColor: colors.success,
                  width: totalChecked > 0 ? `${(passCount / totalChecked) * 100}%` : '0%',
                },
              ]} />
            </View>
          </View>

          {/* Dead */}
          <View style={styles.heroStatRow}>
            <View style={[styles.heroDot, { backgroundColor: colors.danger }]} />
            <View style={styles.heroStatText}>
              <Text style={[styles.heroStatValue, { color: colors.danger }]}>{failCount}</Text>
              <Text style={styles.heroStatLabel}>DEAD</Text>
            </View>
            <View style={[styles.heroBar, { backgroundColor: colors.danger + '15' }]}>
              <View style={[
                styles.heroBarFill,
                {
                  backgroundColor: colors.danger,
                  width: totalChecked > 0 ? `${(failCount / totalChecked) * 100}%` : '0%',
                },
              ]} />
            </View>
          </View>

          {/* Divider */}
          <View style={styles.heroMiniDivider} />

          {/* Total */}
          <View style={styles.heroTotalRow}>
            <Text style={styles.heroTotalLabel}>CHECKED</Text>
            <Text style={styles.heroTotalValue}>{totalChecked}</Text>
          </View>
        </View>
      </Animated.View>

      {/* ─── Bottom Grid: 4 Mini Cards ─── */}
      <View style={styles.miniGrid}>
        <MiniStat value={queueCount} label="QUEUE" icon="playlist-play" color={colors.info} index={0} />
        <MiniStat value={waPlates} label="WA PLATES" icon="directions-car" color={colors.accent} index={1} />
        <MiniStat value={cfReports} label="CF DONE" icon="fact-check" color={colors.warning} index={2} />
        <MiniStat value={cfPending} label="CF PENDING" icon="pending-actions" color={colors.textSecondary} index={3} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing['2xl'],
    gap: spacing.md,
  },

  // ─── Hero Card ────────────────────────────
  heroCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.xl,
    overflow: 'hidden',
  },
  heroLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  heroRingWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroRingContent: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroRateValue: {
    fontSize: fontSize['3xl'],
    fontWeight: '900',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  heroRateUnit: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textMuted,
    marginLeft: 1,
  },
  heroRateLabel: {
    fontSize: fontSize['2xs'],
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 2.5,
    fontFamily: 'monospace',
  },

  heroDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },

  heroRight: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  heroStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroStatText: {
    width: 52,
  },
  heroStatValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  heroStatLabel: {
    fontSize: 6,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1.5,
    fontFamily: 'monospace',
    marginTop: -1,
  },
  heroBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  heroBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  heroMiniDivider: {
    height: 1,
    backgroundColor: colors.border,
  },

  heroTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTotalLabel: {
    fontSize: fontSize['2xs'],
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  heroTotalValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },

  // ─── Ring ─────────────────────────────────
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringTrack: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_STROKE,
  },
  ringProgress: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_STROKE,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  ringGlow: {
    position: 'absolute',
    width: RING_SIZE * 0.5,
    height: RING_SIZE * 0.5,
    borderRadius: RING_SIZE * 0.25,
    backgroundColor: 'transparent',
  },

  // ─── Mini Grid ────────────────────────────
  miniGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  miniCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  miniIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  miniValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  miniLabel: {
    fontSize: 6,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
});
