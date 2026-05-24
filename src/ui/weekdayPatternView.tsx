/**
 * Visualización del patrón individual de ingesta por día de la semana.
 *
 * Bar chart simple: cada día muestra el promedio observado vs el promedio
 * general del usuario. Permite ver si tiene patrón L-V/S-D clásico o uno
 * propio.
 */

import { StyleSheet, Text, View } from 'react-native';
import { DAY_SHORT, type DayOfWeek, type WeekdayPattern } from '@/core/model/weekdayPattern';
import { Body, Hint, Subtitle } from './components';
import { colors, fontSizes, radii, spacing } from './theme';

interface Props {
  pattern: WeekdayPattern;
  weekendDeltaKcal: number | null;
}

const BAR_MAX_HEIGHT = 100;
const DAYS: ReadonlyArray<DayOfWeek> = [1, 2, 3, 4, 5, 6, 0]; // L-D

export function WeekdayPatternView({ pattern, weekendDeltaKcal }: Props) {
  if (pattern.totalDaysWithData === 0) {
    return (
      <View style={styles.card}>
        <Subtitle>Tu patrón semanal</Subtitle>
        <Body>
          Cuando empieces a registrar comida con consistencia, acá vas a ver tu patrón L-V vs S-D
          individual.
        </Body>
      </View>
    );
  }

  const maxKcal = Math.max(...pattern.byDay.map((d) => d.avgKcal), 1);
  const allDaysHaveData = pattern.byDay.every((d) => d.count > 0);

  return (
    <View style={styles.card}>
      <Subtitle>Tu patrón semanal</Subtitle>
      {!pattern.hasEnoughData ? (
        <Hint>
          Llevamos {pattern.totalDaysWithData} días con datos. Después de ~16 días el patrón se
          vuelve confiable.
        </Hint>
      ) : null}

      <View style={styles.barRow}>
        {DAYS.map((day) => {
          const stats = pattern.byDay[day]!;
          const hasData = stats.count > 0;
          const heightPct = hasData ? (stats.avgKcal / maxKcal) * 100 : 0;
          return (
            <View key={day} style={styles.col}>
              <View style={styles.barContainer}>
                {hasData ? (
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${heightPct}%`,
                        backgroundColor: day === 0 || day === 6 ? colors.warning : colors.primary,
                      },
                    ]}
                  />
                ) : (
                  <View style={styles.barEmpty} />
                )}
              </View>
              <Text style={styles.dayLabel}>{DAY_SHORT[day]}</Text>
              <Text style={styles.dayValue}>{hasData ? Math.round(stats.avgKcal) : '—'}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>L-V</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.warning }]} />
          <Text style={styles.legendText}>S-D</Text>
        </View>
      </View>

      <Body>
        Promedio general:{' '}
        <Text style={styles.bold}>{Math.round(pattern.overallAvgKcal)} kcal/día</Text>
      </Body>
      {weekendDeltaKcal !== null && allDaysHaveData ? (
        <Hint>
          {weekendDeltaKcal > 50
            ? `Tu fin de semana es ~${Math.round(weekendDeltaKcal)} kcal/día más alto que tus días laborales. Es el patrón típico — la app pronto va a redistribuir tu meta semanal para que no sientas que "fallaste" el lunes.`
            : weekendDeltaKcal < -50
              ? `Tu fin de semana es ~${Math.round(-weekendDeltaKcal)} kcal/día más bajo que tus días laborales. Patrón atípico — probablemente entrenas o ayunas el weekend.`
              : 'Tu ingesta es bastante pareja entre L-V y S-D. Bien por la consistencia.'}
        </Hint>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  barRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.md,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  barContainer: {
    height: BAR_MAX_HEIGHT,
    width: 24,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  barEmpty: {
    height: 4,
    width: '100%',
    backgroundColor: colors.border,
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: '600',
  },
  dayValue: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  legendRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  bold: {
    fontWeight: '700',
  },
});
