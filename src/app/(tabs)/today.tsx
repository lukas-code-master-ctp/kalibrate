import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { ageInYears } from '@/core/model/user';
import { priorCredibleInterval, priorTDEE } from '@/core/model/priors';
import { useUserStore } from '@/stores/user';
import { selectLatestRaw, selectLatestSmoothed, useWeightStore } from '@/stores/weight';
import { Body, Button, Field, Hint, Screen, Subtitle, Title } from '@/ui/components';
import { colors, fontSizes, radii, spacing } from '@/ui/theme';

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(d: Date): string {
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function TodayScreen() {
  const user = useUserStore((s) => s.user);
  const addLog = useWeightStore((s) => s.addLog);
  const latestSmoothed = useWeightStore(selectLatestSmoothed);
  const latestRaw = useWeightStore(selectLatestRaw);
  const allLogs = useWeightStore((s) => s.logs);

  const todayLogs = useMemo(
    () => allLogs.filter((log) => sameLocalDay(log.loggedAt, new Date())),
    [allLogs],
  );

  const [weightStr, setWeightStr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (todayLogs.length > 0 && weightStr === '') {
      setWeightStr(todayLogs[todayLogs.length - 1]!.weightKg.toString());
    }
  }, [todayLogs, weightStr]);

  const weightParsed = useMemo(() => {
    if (weightStr.trim() === '') return null;
    const n = parseFloat(weightStr.replace(',', '.'));
    if (Number.isNaN(n) || n < 30 || n > 300) return null;
    return n;
  }, [weightStr]);

  const prior = useMemo(() => {
    if (!user) return null;
    const weightForPrior = latestSmoothed ?? user.initialWeightKg;
    return priorTDEE({
      sex: user.biologicalSex,
      weightKg: weightForPrior,
      heightCm: user.heightCm,
      ageYears: ageInYears(user.birthDate),
      activityLevel: user.activityLevel,
      bodyFatPct: user.bodyFatPct,
    });
  }, [user, latestSmoothed]);

  if (!user) return null;

  async function onSave() {
    if (weightParsed === null) return;
    setSaving(true);
    try {
      await addLog(new Date(), weightParsed);
      setWeightStr('');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error desconocido';
      Alert.alert('No pudimos guardar tu peso', message);
    } finally {
      setSaving(false);
    }
  }

  const ci = prior ? priorCredibleInterval(prior) : null;
  const hasLoggedToday = todayLogs.length > 0;
  const totalLogs = allLogs.length;

  return (
    <Screen>
      <Title>Hoy</Title>

      <View style={[styles.card, { marginTop: spacing.md }]}>
        <Subtitle>Peso de hoy</Subtitle>
        <Field
          label=""
          placeholder="kg"
          value={weightStr}
          onChangeText={setWeightStr}
          keyboardType="decimal-pad"
          error={weightStr.length > 0 && !weightParsed ? 'Entre 30 y 300 kg' : undefined}
        />
        <Button
          label={saving ? 'Guardando…' : hasLoggedToday ? 'Actualizar' : 'Guardar'}
          onPress={onSave}
          disabled={!weightParsed || saving}
        />
        {hasLoggedToday ? (
          <Hint>
            Ya registraste{' '}
            {todayLogs.length === 1 ? 'una medición' : `${todayLogs.length} mediciones`} hoy (última
            a las {formatTime(todayLogs[todayLogs.length - 1]!.loggedAt)}). Puedes sobrescribir si
            te pesaste de nuevo.
          </Hint>
        ) : (
          <Hint>
            Lo ideal es pesarse a la misma hora cada día, idealmente en ayunas y después del baño.
            La hora consistente importa más que la hora exacta.
          </Hint>
        )}
      </View>

      <View style={styles.card}>
        <Subtitle>Tu tendencia</Subtitle>
        {latestSmoothed !== null && latestRaw ? (
          <>
            <Body>
              Tendencia suavizada: <Text style={styles.bold}>{latestSmoothed.toFixed(1)} kg</Text>
            </Body>
            <Body>Última medición cruda: {latestRaw.weightKg.toFixed(1)} kg</Body>
            <Hint>
              La tendencia es la señal. El número de hoy es ruido — fluctúa por agua, glucógeno,
              comida en el intestino, sodio. Mira la tendencia, no el día.
            </Hint>
          </>
        ) : (
          <Body>
            Registra tu primer peso para empezar a ver tu tendencia. Necesitamos unos días para que
            el suavizado tenga sentido.
          </Body>
        )}
      </View>

      <View style={styles.card}>
        <Subtitle>TDEE estimado</Subtitle>
        {prior && ci ? (
          <>
            <Body>
              <Text style={styles.bold}>~{Math.round(prior.mean)} kcal/día</Text>
            </Body>
            <Hint>
              Rango probable (80%): {Math.round(ci.low)} – {Math.round(ci.high)} kcal/día.
              {totalLogs < 14
                ? ` Calibrando: ${totalLogs}/14 días de datos. Aún usamos la fórmula poblacional.`
                : ' Calibrando con tus datos reales.'}
            </Hint>
          </>
        ) : null}
      </View>
    </Screen>
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
  bold: {
    fontWeight: '700',
    fontSize: fontSizes.lg,
  },
});
