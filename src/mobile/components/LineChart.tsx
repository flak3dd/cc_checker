import React, { useMemo } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
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
const CHART_WIDTH = SCREEN_WIDTH - (spacing.xl * 4); // Account for padding
const CHART_HEIGHT = 60;

interface DataPoint {
  x: number;
  y: number;
  label?: string;
}

interface LineChartProps {
  data: DataPoint[];
  color: string;
  showDots?: boolean;
  animate?: boolean;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  color,
  showDots = false,
  animate = true,
}) => {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    if (animate) {
      progress.value = withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progress.value = 1;
    }
  }, [data, animate]);

  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    const minY = Math.min(...data.map(d => d.y));
    const maxY = Math.max(...data.map(d => d.y));
    const rangeY = maxY - minY || 1;

    return data.map((point, index) => {
      const x = (index / Math.max(1, data.length - 1)) * CHART_WIDTH;
      const normalizedY = (point.y - minY) / rangeY;
      const y = CHART_HEIGHT - (normalizedY * CHART_HEIGHT);

      return {
        x,
        y,
        height: normalizedY * CHART_HEIGHT,
        value: point.y,
        label: point.label,
      };
    });
  }, [data]);

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartArea}>
        {chartData.map((point, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dataPoint,
              {
                left: point.x,
                bottom: 0,
                width: CHART_WIDTH / Math.max(1, chartData.length - 1),
                height: interpolate(progress.value, [0, 1], [0, point.height]),
                backgroundColor: color,
              }
            ]}
          />
        ))}

        {/* Connecting line effect */}
        <View style={styles.lineContainer}>
          {chartData.map((point, index) => {
            if (index === 0) return null;

            const prevPoint = chartData[index - 1];
            const distance = point.x - prevPoint.x;
            const angle = Math.atan2(point.y - prevPoint.y, distance) * (180 / Math.PI);

            return (
              <Animated.View
                key={`line-${index}`}
                style={[
                  styles.lineSegment,
                  {
                    left: prevPoint.x,
                    bottom: Math.min(prevPoint.y, point.y),
                    width: distance,
                    height: Math.abs(point.y - prevPoint.y) || 1,
                    backgroundColor: color,
                    opacity: interpolate(progress.value, [0, 1], [0, 0.6]),
                    transform: [{ rotate: `${angle}deg` }],
                  }
                ]}
              />
            );
          })}
        </View>

        {/* Dots */}
        {showDots && chartData.map((point, index) => (
          <Animated.View
            key={`dot-${index}`}
            style={[
              styles.dot,
              {
                left: point.x - 3,
                bottom: interpolate(progress.value, [0, 1], [0, point.y - 3]),
                backgroundColor: color,
                opacity: progress.value,
              }
            ]}
          />
        ))}
      </View>
    </View>
  );
};

interface TrendChartProps {
  passCount: number;
  failCount: number;
  totalChecked: number;
  successRate: number;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  passCount,
  failCount,
  totalChecked,
  successRate,
}) => {
  // Generate some sample trend data (in a real app, this would come from stored history)
  const trendData = useMemo(() => {
    const points = [];
    const baseRate = successRate;
    for (let i = 0; i < 10; i++) {
      const variation = (Math.random() - 0.5) * 20; // ±10% variation
      const rate = Math.max(0, Math.min(100, baseRate + variation));
      points.push({
        x: i,
        y: rate,
        label: `${Math.round(rate)}%`,
      });
    }
    return points;
  }, [successRate]);

  const liveData = useMemo(() => {
    const points = [];
    for (let i = 0; i < 10; i++) {
      const variation = (Math.random() - 0.3) * passCount * 0.2;
      const live = Math.max(0, passCount + variation);
      points.push({
        x: i,
        y: live,
        label: Math.round(live).toString(),
      });
    }
    return points;
  }, [passCount]);

  return (
    <View style={styles.trendContainer}>
      <View style={styles.chartRow}>
        <View style={styles.chartLabel}>
          <Text style={[styles.chartTitle, { color: colors.success }]}>SUCCESS TREND</Text>
          <Text style={styles.chartValue}>{successRate}%</Text>
        </View>
        <View style={styles.chartWrapper}>
          <LineChart
            data={trendData}
            color={colors.success}
            showDots={false}
            animate={true}
          />
        </View>
      </View>

      <View style={styles.chartRow}>
        <View style={styles.chartLabel}>
          <Text style={[styles.chartTitle, { color: colors.danger }]}>LIVE COUNT TREND</Text>
          <Text style={styles.chartValue}>{passCount}</Text>
        </View>
        <View style={styles.chartWrapper}>
          <LineChart
            data={liveData}
            color={colors.danger}
            showDots={false}
            animate={true}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    position: 'relative',
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
  },
  chartArea: {
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    position: 'relative',
  },
  dataPoint: {
    position: 'absolute',
    borderRadius: 2,
    opacity: 0.8,
  },
  lineContainer: {
    position: 'absolute',
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
  },
  lineSegment: {
    position: 'absolute',
    borderRadius: 1,
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.2,
  },
  gridLabel: {
    position: 'absolute',
    right: spacing.sm,
    top: -8,
    fontSize: fontSize['2xs'],
    color: colors.textMuted,
    fontWeight: '500',
  },
  trendContainer: {
    gap: spacing.md,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  chartLabel: {
    minWidth: 100,
  },
  chartTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing['2xs'],
  },
  chartValue: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  chartWrapper: {
    flex: 1,
  },
});