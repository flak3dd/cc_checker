import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { colors, spacing, fontSize, radii } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarData[];
  maxValue?: number;
  showValues?: boolean;
  animate?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  maxValue,
  showValues = true,
  animate = true,
}) => {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    if (animate) {
      progress.value = withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progress.value = 1;
    }
  }, [data, animate]);

  const chartMax = maxValue || Math.max(...data.map(d => d.value), 1);

  return (
    <View style={styles.container}>
      <View style={styles.chartArea}>
        {data.map((item, index) => {
          const barHeight = (item.value / chartMax) * 100;
          const barColor = item.color || colors.primary;

          return (
            <View key={index} style={styles.barWrapper}>
              {showValues && (
                <Text style={styles.barValue}>{Math.round(item.value)}</Text>
              )}
              <Animated.View
                style={[
                  styles.bar,
                  {
                    height: `${barHeight}%`,
                    width: 40,
                    backgroundColor: barColor,
                    opacity: interpolate(progress.value, [0, 1], [0.3, 1]),
                  },
                ]}
              />
              <Text style={styles.barLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

interface TimeSeriesData {
  timestamp: number;
  value: number;
  label?: string;
}

interface TimeBarChartProps {
  data: TimeSeriesData[];
  color?: string;
  maxBars?: number;
  animate?: boolean;
}

export const TimeBarChart: React.FC<TimeBarChartProps> = ({
  data,
  color = colors.primary,
  maxBars = 10,
  animate = true,
}) => {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    if (animate) {
      progress.value = withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progress.value = 1;
    }
  }, [data, animate]);

  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp).slice(-maxBars);
    const maxValue = Math.max(...sorted.map(d => d.value), 1);
    return sorted.map(item => ({
      ...item,
      normalized: item.value / maxValue,
      displayLabel: item.label || new Date(item.timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
    }));
  }, [data, maxBars]);

  const barWidth = useMemo(() => {
    const availableWidth = SCREEN_WIDTH - spacing.xl * 3;
    return Math.min(60, (availableWidth / maxBars) - spacing.xs);
  }, [maxBars]);

  const maxY = useMemo(() => Math.max(...chartData.map(d => d.value), 1), [chartData]);
  const minY = useMemo(() => Math.min(...chartData.map(d => d.value), 0), [chartData]);

  return (
    <View style={styles.timeContainer}>
      <View style={styles.timeChartArea}>
        {chartData.map((item, index) => {
          const barHeight = Math.max(4, (item.value / maxY) * 80);
          
          return (
            <View key={index} style={styles.timeBarWrapper}>
              <Text style={styles.timeValue}>{Math.round(item.value)}</Text>
              <Animated.View
                style={[
                  styles.timeBar,
                  {
                    height: barHeight,
                    width: barWidth,
                    backgroundColor: color,
                    opacity: interpolate(progress.value, [0, 1], [0.3, 1]),
                  },
                ]}
              />
              <Text style={styles.timeLabel}>{item.displayLabel}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.timeAxis}>
        <Text style={styles.timeAxisLabel}>min: {Math.round(minY)}</Text>
        <Text style={styles.timeAxisLabel}>max: {Math.round(maxY)}</Text>
      </View>
    </View>
  );
};

interface PieChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  showLegend?: boolean;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  size = 120,
  showLegend = true,
}) => {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  const slices = useMemo(() => {
    let currentAngle = 0;
    return data.map(item => {
      const percentage = total > 0 ? (item.value / total) * 100 : 0;
      const angle = (percentage / 100) * 360;
      const slice = {
        ...item,
        percentage,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
      };
      currentAngle += angle;
      return slice;
    });
  }, [data, total]);

  return (
    <View style={styles.pieContainer}>
      <View style={[styles.pieChart, { width: size, height: size, borderRadius: size / 2 }]}>
        {slices.map((slice, index) => {
          const rotation = slice.startAngle;
          return (
            <Animated.View
              key={index}
              style={[
                styles.pieSlice,
                {
                  backgroundColor: slice.color,
                  transform: [{ rotate: `${rotation}deg` }],
                },
              ]}
            />
          );
        })}
        <View style={styles.pieCenter}>
          <Text style={styles.pieCenterValue}>{total}</Text>
          <Text style={styles.pieCenterLabel}>Total</Text>
        </View>
      </View>

      {showLegend && (
        <View style={styles.legend}>
          {data.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
              <Text style={styles.legendValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

interface GaugeChartProps {
  value: number;
  max: number;
  label?: string;
  color?: string;
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  max = 100,
  label,
  color = colors.success,
}) => {
  const percentage = Math.min(100, (value / max) * 100);
  const rotation = useSharedValue(-90);

  React.useEffect(() => {
    rotation.value = withTiming(-90 + (percentage / 100) * 180, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, max]);

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={styles.gaugeContainer}>
      <View style={styles.gaugeChart}>
        <View style={styles.gaugeArc} />
        <Animated.View style={[styles.gaugeNeedle, needleStyle]} />
        <View style={styles.gaugeCenter} />
      </View>
      <Text style={[styles.gaugeValue, { color }]}>{Math.round(percentage)}%</Text>
      {label && <Text style={styles.gaugeLabel}>{label}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 100,
  },
  barWrapper: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  bar: {
    borderRadius: radii.sm,
    minHeight: 4,
  },
  barValue: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  barLabel: {
    fontSize: fontSize['2xs'],
    color: colors.textMuted,
  },
  timeContainer: {
    gap: spacing.sm,
  },
  timeChartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    paddingHorizontal: spacing.sm,
  },
  timeBarWrapper: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeBar: {
    borderTopLeftRadius: radii.sm,
    borderTopRightRadius: radii.sm,
  },
  timeValue: {
    fontSize: fontSize['2xs'],
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timeLabel: {
    fontSize: fontSize['2xs'],
    color: colors.textMuted,
  },
  timeAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  timeAxisLabel: {
    fontSize: fontSize['2xs'],
    color: colors.textMuted,
  },
  pieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  pieChart: {
    position: 'relative',
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  pieSlice: {
    position: 'absolute',
    width: '50%',
    height: '50%',
    top: 0,
    left: '50%',
    transformOrigin: 'left center',
  },
  pieCenter: {
    position: 'absolute',
    top: '25%',
    left: '25%',
    width: '50%',
    height: '50%',
    backgroundColor: colors.background,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterValue: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  pieCenterLabel: {
    fontSize: fontSize['2xs'],
    color: colors.textMuted,
  },
  legend: {
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  legendValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  gaugeContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  gaugeChart: {
    width: 120,
    height: 60,
    overflow: 'hidden',
    alignItems: 'center',
  },
  gaugeArc: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 12,
    borderColor: colors.border,
    position: 'absolute',
  },
  gaugeNeedle: {
    width: 50,
    height: 4,
    backgroundColor: colors.danger,
    position: 'absolute',
    top: 56,
    left: 58,
    transformOrigin: 'right center',
  },
  gaugeCenter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.textPrimary,
    position: 'absolute',
    top: 52,
  },
  gaugeValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  gaugeLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});