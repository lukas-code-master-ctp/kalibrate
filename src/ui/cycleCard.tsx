/**
 * Tarjeta de estado del ciclo menstrual para usuarias femeninas.
 *
 * Si no hay eventos registrados → CTA para registrar primer periodo.
 * Si hay eventos → muestra fase actual, día del ciclo, hint educativo,
 * predicción del próximo periodo y botón para registrar nuevo periodo.
 */

import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { CyclePhase } from '@/core/model/cycle';
import { phaseCopy } from '@/hooks/useCalibration';
import type { CycleAnalysis } from '@/core/model/cycle';
import { Body, Button, Hint, Subtitle } from './components';
import { colors, fontSizes, radii, spacing } from './theme';

const PHASE_LABEL: Record<CyclePhase, string> = {
  menstruation: 'Menstruación',
  follicular: 'Folicular',
  ovulation: 'Ovulación',
  luteal_early: 'Lútea temprana',
  luteal_premenstrual: 'Premenstrual',
  late_or_uncertain: 'Ciclo atrasado',
};

function formatDayMonth(d: Date): string {
  const months = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

interface Props {
  analysis: CycleAnalysis | null;
}

export function CycleCard({ analysis }: Props) {
  const router = useRouter();

  if (!analysis) {
    return (
      <View style={styles.card}>
        <Subtitle>Ciclo menstrual</Subtitle>
        <Body>
          Todavía no tenemos eventos registrados. Con el inicio de tu próximo periodo podemos
          empezar a modelar tu ciclo.
        </Body>
        <Hint>
          La app compara progreso ciclo-a-ciclo y nunca alarma por subidas de peso premenstruales —
          pero necesita saber dónde estás.
        </Hint>
        <Button label="Registrar mi periodo" onPress={() => router.push('/cycle/log')} />
      </View>
    );
  }

  const hint = phaseCopy(analysis);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Subtitle>Ciclo menstrual</Subtitle>
        <Text
          style={[
            styles.phaseBadge,
            analysis.hasWaterRetention ? styles.phaseBadgeRetention : styles.phaseBadgeNormal,
          ]}
        >
          {PHASE_LABEL[analysis.phase]}
        </Text>
      </View>
      <Body>
        Día <Text style={styles.bold}>{analysis.daysIntoCycle}</Text> del ciclo (largo aprendido:{' '}
        {analysis.cycleLengthDays} días).
      </Body>
      <Body>Próximo periodo estimado: {formatDayMonth(analysis.nextPeriodOn)}</Body>
      {hint ? <Hint>{hint}</Hint> : null}
      <Button
        label="Registrar inicio de periodo"
        variant="secondary"
        onPress={() => router.push('/cycle/log')}
      />
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bold: {
    fontWeight: '700',
  },
  phaseBadge: {
    fontSize: fontSizes.xs,
    fontWeight: '700',
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  phaseBadgeNormal: {
    backgroundColor: '#EFF6FF',
    color: colors.primary,
  },
  phaseBadgeRetention: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
});
