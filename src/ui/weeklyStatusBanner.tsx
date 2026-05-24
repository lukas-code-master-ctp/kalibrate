/**
 * Banner de status semanal. Color codifica green/yellow/red/deferred,
 * texto resume el progreso de la ventana.
 */

import { StyleSheet, Text, View } from 'react-native';
import type { WeeklyEvaluation, WeekStatus } from '@/core/model/weeklyStatus';
import { colors, fontSizes, radii, spacing } from './theme';

const STATUS_COLORS: Record<WeekStatus, { bg: string; fg: string; label: string }> = {
  green: { bg: '#DCFCE7', fg: '#15803D', label: 'En rumbo' },
  yellow: { bg: '#FEF3C7', fg: '#92400E', label: 'Fuera de rango' },
  red: { bg: '#FEE2E2', fg: '#991B1B', label: 'Muy fuera de rango' },
  deferred: { bg: '#EFF6FF', fg: '#1E40AF', label: 'Evaluación pospuesta' },
  insufficient_data: { bg: '#F1F5F9', fg: '#475569', label: 'Datos insuficientes' },
};

function describeChange(change: number): string {
  if (Math.abs(change) < 0.05) return 'sin cambio significativo';
  const abs = Math.abs(change).toFixed(2);
  return change < 0 ? `bajaste ${abs} kg` : `subiste ${abs} kg`;
}

function describeExpected(expected: number, targetRateKgPerWeek?: number): string {
  if (Math.abs(expected) < 0.05) {
    return 'lo esperado era mantenerte estable';
  }
  const abs = Math.abs(expected).toFixed(2);
  return expected < 0 ? `lo esperado era bajar ~${abs} kg` : `lo esperado era subir ~${abs} kg`;
}

interface Props {
  evaluation: WeeklyEvaluation;
}

export function WeeklyStatusBanner({ evaluation }: Props) {
  const colorScheme = STATUS_COLORS[evaluation.status];

  let summary: string;
  if (evaluation.status === 'insufficient_data') {
    summary = evaluation.notes[0] ?? 'Necesitamos más datos para evaluar la semana.';
  } else if (evaluation.status === 'deferred') {
    summary = evaluation.notes[0] ?? 'Pospuesto por ciclo.';
  } else {
    const actual = describeChange(evaluation.actualWeeklyChangeKg);
    const expected = describeExpected(evaluation.expectedWeeklyChangeKg);
    summary = `Esta semana: ${actual}; ${expected}.`;
  }

  return (
    <View style={[styles.banner, { backgroundColor: colorScheme.bg }]}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colorScheme.fg }]}>{colorScheme.label}</Text>
        <Text style={[styles.summary, { color: colorScheme.fg }]}>{summary}</Text>
      </View>
      {evaluation.notes.length > 0 && evaluation.status !== 'insufficient_data' ? (
        <Text style={[styles.note, { color: colorScheme.fg }]}>{evaluation.notes[0]}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  row: {
    gap: 2,
  },
  label: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summary: {
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  note: {
    fontSize: fontSizes.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
});
