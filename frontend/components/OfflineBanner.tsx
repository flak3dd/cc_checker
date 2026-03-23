import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { API_BASE_URL } from '@/services/api';
import { colors, spacing, radii, fontSize } from '@/constants/theme';

interface OfflineBannerProps {
  isConnected: boolean | null;
  isChecking: boolean;
  onRetry: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isConnected,
  isChecking,
  onRetry,
}) => {
  const opacity = useSharedValue(0);
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (isConnected === false) {
      opacity.value = withTiming(1, { duration: 300 });
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    } else {
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [isConnected]);

  const bannerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: opacity.value === 0 ? -40 : 0 }],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  if (isConnected !== false) return null;

  return (
    <Animated.View style={[styles.banner, bannerStyle]}>
      <View style={styles.left}>
        <Animated.View style={dotStyle}>
          <MaterialIcons name="cloud-off" size={16} color={colors.warning} />
        </Animated.View>
        <View>
          <Text style={styles.title}>Backend Unreachable</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {API_BASE_URL}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onRetry}
        disabled={isChecking}
        style={[styles.retryBtn, isChecking && { opacity: 0.5 }]}
      >
        <MaterialIcons
          name={isChecking ? 'sync' : 'refresh'}
          size={14}
          color={colors.warning}
        />
        <Text style={styles.retryText}>{isChecking ? 'CHECKING' : 'RETRY'}</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warningMuted,
    borderWidth: 1,
    borderColor: colors.warning + '30',
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: colors.warning,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  title: {
    color: colors.warning,
    fontSize: fontSize.sm,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  subtitle: {
    color: colors.warningDim,
    fontSize: fontSize['2xs'],
    fontFamily: 'monospace',
    marginTop: 1,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.warning + '15',
  },
  retryText: {
    color: colors.warning,
    fontSize: fontSize['2xs'],
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
});
