import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { SmoothedWeightPoint } from '@/core/model/types';
import { learnWeekdayPattern, weekendDelta } from '@/core/model/weekdayPattern';
import { useFoodStore } from '@/stores/food';
import { useWeightStore } from '@/stores/weight';
import { Body, Hint, Screen, Subtitle, Title } from '@/ui/components';
import { WeightTrendChart } from '@/ui/charts/WeightTrendChart';
import { WeekdayPatternView } from '@/ui/weekdayPatternView';
import { colors, fontSizes, radii, spacing } from '@/ui/theme';

type WindowDays = 30 | 60 | 90 | 'all';

const WINDOW_OPTIONS: { value: WindowDays; label: string }[] = [
  { value: 30, label: '30d' },
  { value: 60, label: '60d' },
  { value: 90, label: '90d' },
  { value: 'all', label: 'Todo' },
];

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function filterPoints(
  points: readonly SmoothedWeightPoint[],
  window: WindowDays,
): readonly SmoothedWeightPoint[] {
  if (window === 'all' || points.length === 0) return points;
  const last = points[points.length - 1]!;
  const cutoff = last.date.getTime() - window * MS_PER_DAY;
  return points.filter((p) => p.date.getTime() >= cutoff);
}

function describeTrend(points: readonly SmoothedWeightPoint[]): { label: string; detail: string } {
  if (points.length < 7) {
    return {
      label: 'Sin tendencia clara aún',
      detail: 'Necesitamos al menos una semana de datos para hablar de tendencia.',
    };
  }
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const days = (last.date.getTime() - first.date.getTime()) / MS_PER_DAY || 1;
  const deltaKg = last.smoothedKg - first.smoothedKg;
  const kgPerWeek = (deltaKg / days) * 7;
  const direction = Math.abs(kgPerWeek) < 0.1 ? 'estable' : kgPerWeek < 0 ? 'a la baja' : 'al alza';
  return {
    label: `Tendencia ${direction}: ${kgPerWeek >= 0 ? '+' : ''}${kgPerWeek.toFixed(2)} kg/semana`,
    detail: `Entre ${first.smoothedKg.toFixed(1)} y ${last.smoothedKg.toFixed(1)} kg en ${Math.round(days)} días.`,
  };
}

export default function TrendScreen() {
  const { width } = useWindowDimensions();
  const allPoints = useWeightStore((s) => s.smoothing.points);
  const bandKg = useWeightStore((s) => s.smoothing.historicalSdKg);
  const entries = useFoodStore((s) => s.entries);

  const [window, setWindow] = useState<WindowDays>(60);
  const points = useMemo(() => filterPoints(allPoints, window), [allPoints, window]);
  const trend = useMemo(() => describeTrend(points), [points]);
  const weekdayPattern = useMemo(() => learnWeekdayPattern(entries), [entries]);
  const wkndDelta = useMemo(() => weekendDelta(weekdayPattern), [weekdayPattern]);

  const chartWidth = width - spacing.lg * 2;
  const chartHeight = 240;

  return (
    <Screen>
      <Title>Tendencia</Title>
      <Hint>
        La línea azul es tu peso suavizado (EMA, half-life 10 días). La banda gris alrededor es tu
        rango de fluctuación normal. Los puntos son las mediciones crudas.
      </Hint>

      <View style={styles.windowRow}>
        {WINDOW_OPTIONS.map((opt) => {
          const selected = opt.value === window;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setWindow(opt.value)}
              style={({ pressed }) => [
                styles.windowChip,
                selected && styles.windowChipSelected,
                pressed && !selected && styles.windowChipPressed,
              ]}
            >
              <Text style={[styles.windowLabel, selected && styles.windowLabelSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.chartContainer}>
        {allPoints.length === 0 ? (
          <View style={styles.chartEmpty}>
            <Body>Sin datos todavía.</Body>
            <Hint>Registra tu peso en la pestaña Hoy para empezar a ver la tendencia.</Hint>
          </View>
        ) : (
          <WeightTrendChart
            points={points}
            bandKg={bandKg}
            width={chartWidth}
            height={chartHeight}
          />
        )}
      </View>

      <View style={styles.card}>
        <Subtitle>{trend.label}</Subtitle>
        <Hint>{trend.detail}</Hint>
        <View style={{ height: spacing.sm }} />
        <Hint>
          Banda de no preocupación: ±{bandKg.toFixed(2)} kg alrededor de la tendencia. Si tu peso de
          hoy cae dentro de la banda, es fluctuación normal — sin acción necesaria.
        </Hint>
      </View>

      <WeekdayPatternView pattern={weekdayPattern} weekendDeltaKcal={wkndDelta} />

      <View style={styles.card}>
        <Subtitle>Por qué la tendencia importa más que el día</Subtitle>
        <Body>
          1 g de glucógeno arrastra 3-4 g de agua. Subidas de 1-3 kg en pocos días son casi siempre
          agua y glucógeno, no grasa.
        </Body>
        <Body>
          La comida en el intestino, el sodio, la inflamación leve y el ciclo menstrual mueven el
          peso varios cientos de gramos sin que tu composición real cambie.
        </Body>
        <Hint>
          Por eso la app evalúa progreso en ventanas semanales, no en mediciones diarias. La
          tendencia suavizada es la señal.
        </Hint>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  windowRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  windowChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  windowChipPressed: {
    backgroundColor: colors.bgMuted,
  },
  windowChipSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  windowLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
  },
  windowLabelSelected: {
    color: colors.primary,
  },
  chartContainer: {
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  chartEmpty: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
});
