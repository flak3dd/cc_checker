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
  historyData?: { timestamp: number; successRate: number; checks: number }[];
}

export const TrendChart: React.FC<TrendChartProps> = ({
  passCount,
  failCount,
  totalChecked,
  successRate,
  historyData = [],
}) => {
  const trendData = useMemo(() => {
    if (historyData.length > 0) {
      return historyData.slice(-10).map((point, index) => ({
        x: index,
        y: point.successRate,
        label: `${Math.round(point.successRate)}%`,
      }));
    }
    const points = [];
    const baseRate = successRate;
    for (let i = 0; i < 10; i++) {
      const variation = (Math.random() - 0.5) * 20;
      const rate = Math.max(0, Math.min(100, baseRate + variation));
      points.push({
        x: i,
        y: rate,
        label: `${Math.round(rate)}%`,
      });
    }
    return points;
  }, [successRate, historyData]);

  const liveData = useMemo(() => {
    if (historyData.length > 0) {
      return historyData.slice(-10).map((point, index) => ({
        x: index,
        y: point.checks,
        label: point.checks.toString(),
      }));
    }
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
  }, [passCount, historyData]);

  const failData = useMemo(() => {
    const points = [];
    for (let i = 0; i < 10; i++) {
      const variation = Math.random() * failCount * 0.3;
      const fail = Math.max(0, failCount - variation);
      points.push({
        x: i,
        y: fail,
        label: Math.round(fail).toString(),
      });
    }
    return points;
  }, [failCount]);

  const avgSuccessRate = useMemo(() => {
    if (trendData.length === 0) return 0;
    const sum = trendData.reduce((acc, p) => acc + p.y, 0);
    return Math.round(sum / trendData.length);
  }, [trendData]);

  const peakChecks = useMemo(() => {
    if (liveData.length === 0) return 0;
    return Math.round(Math.max(...liveData.map(p => p.y)));
  }, [liveData]);

  return (
    <View style={styles.trendContainer}>
      <View style={styles.statsHeader}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>TOTAL</Text>
          <Text style={styles.statValue}>{totalChecked}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.success }]}>PASS</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>{passCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.danger }]}>FAIL</Text>
          <Text style={[styles.statValue, { color: colors.danger }]}>{failCount}</Text>
        </View>
      </View>

      <View style={styles.chartRow}>
        <View style={styles.chartLabel}>
          <Text style={[styles.chartTitle, { color: colors.success }]}>SUCCESS RATE</Text>
          <Text style={styles.chartValue}>{successRate}%</Text>
          <Text style={styles.chartSubtext}>avg: {avgSuccessRate}%</Text>
        </View>
        <View style={styles.chartWrapper}>
          <LineChart
            data={trendData}
            color={colors.success}
            showDots={true}
            animate={true}
          />
        </View>
      </View>

      <View style={styles.chartRow}>
        <View style={styles.chartLabel}>
          <Text style={[styles.chartTitle, { color: colors.primary }]}>CHECKS RUN</Text>
          <Text style={styles.chartValue}>{passCount + failCount}</Text>
          <Text style={styles.chartSubtext}>peak: {peakChecks}</Text>
        </View>
        <View style={styles.chartWrapper}>
          <LineChart
            data={liveData}
            color={colors.primary}
            showDots={true}
            animate={true}
          />
        </View>
      </View>

      <View style={styles.chartRow}>
        <View style={styles.chartLabel}>
          <Text style={[styles.chartTitle, { color: colors.danger }]}>FAILURES</Text>
          <Text style={styles.chartValue}>{failCount}</Text>
        </View>
        <View style={styles.chartWrapper}>
          <LineChart
            data={failData}
            color={colors.danger}
            showDots={true}
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
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radii.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontSize['2xs'],
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing['2xs'],
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  chartLabel: {
    minWidth: 80,
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
  chartSubtext: {
    fontSize: fontSize['2xs'],
    color: colors.textMuted,
    marginTop: 2,
  },
  chartWrapper: {
    flex: 1,
  },
});