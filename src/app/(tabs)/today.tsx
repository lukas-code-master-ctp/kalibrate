import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { suggestedDailyIntake, suggestedDailyProteinG } from '@/core/model/aggregation';
import { ageInYears } from '@/core/model/user';
import { priorCredibleInterval, priorTDEE } from '@/core/model/priors';
import { useFoodStore, selectTodayEntries, selectTodayTotals } from '@/stores/food';
import { useUserStore } from '@/stores/user';
import { selectLatestRaw, selectLatestSmoothed, useWeightStore } from '@/stores/weight';
import { Body, Button, Field, Hint, Screen, Subtitle, Title } from '@/ui/components';
import { FoodEntryRow, FoodListEmpty } from '@/ui/foodList';
import { goalRepo } from '@/data/repos';
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
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const addLog = useWeightStore((s) => s.addLog);
  const latestSmoothed = useWeightStore(selectLatestSmoothed);
  const latestRaw = useWeightStore(selectLatestRaw);
  const allLogs = useWeightStore((s) => s.logs);
  const todayEntries = useFoodStore(selectTodayEntries);
  const todayTotals = useFoodStore(selectTodayTotals);
  const deleteEntry = useFoodStore((s) => s.deleteEntry);

  const todayLogs = useMemo(
    () => allLogs.filter((log) => sameLocalDay(log.loggedAt, new Date())),
    [allLogs],
  );

  const [weightStr, setWeightStr] = useState('');
  const [saving, setSaving] = useState(false);
  const [targetRate, setTargetRate] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    void goalRepo.getActive(user.id).then((g) => {
      setTargetRate(g?.targetRateKgPerWeek ?? 0);
    });
  }, [user]);

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

  const dailyTargetKcal = useMemo(() => {
    if (!prior || targetRate === null) return null;
    return suggestedDailyIntake(prior.mean, targetRate);
  }, [prior, targetRate]);

  const dailyTargetProteinG = useMemo(() => {
    if (!user || targetRate === null) return null;
    const weight = latestSmoothed ?? user.initialWeightKg;
    return suggestedDailyProteinG(weight, targetRate);
  }, [user, latestSmoothed, targetRate]);

  if (!user) return null;

  async function onSaveWeight() {
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

  function confirmDeleteEntry(id: string) {
    Alert.alert('Eliminar entrada', '¿Eliminar esta comida del registro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void deleteEntry(id);
        },
      },
    ]);
  }

  const ci = prior ? priorCredibleInterval(prior) : null;
  const hasLoggedToday = todayLogs.length > 0;
  const totalLogs = allLogs.length;

  const kcalRemaining =
    dailyTargetKcal !== null ? Math.round(dailyTargetKcal - todayTotals.kcal) : null;
  const proteinRemaining =
    dailyTargetProteinG !== null ? Math.round(dailyTargetProteinG - todayTotals.proteinG) : null;

  return (
    <Screen>
      <Title>Hoy</Title>

      <View style={[styles.card, { marginTop: spacing.md }]}>
        <View style={styles.cardHeader}>
          <Subtitle>Comida</Subtitle>
          <Button
            label="+ Agregar"
            onPress={() => router.push('/food/add')}
            style={styles.smallBtn}
          />
        </View>

        {todayEntries.length === 0 ? (
          <FoodListEmpty />
        ) : (
          <View style={styles.list}>
            {todayEntries.map((entry) => (
              <FoodEntryRow key={entry.id} entry={entry} onDelete={confirmDeleteEntry} />
            ))}
          </View>
        )}

        <View style={styles.totalsRow}>
          <View>
            <Text style={styles.totalsValue}>{Math.round(todayTotals.kcal)}</Text>
            <Text style={styles.totalsLabel}>kcal hoy</Text>
          </View>
          <View>
            <Text style={styles.totalsValue}>{todayTotals.proteinG.toFixed(0)}g</Text>
            <Text style={styles.totalsLabel}>proteína</Text>
          </View>
          {todayTotals.alcoholKcal > 0 ? (
            <View>
              <Text style={styles.totalsValue}>{Math.round(todayTotals.alcoholKcal)}</Text>
              <Text style={styles.totalsLabel}>kcal de alcohol</Text>
            </View>
          ) : null}
        </View>

        {kcalRemaining !== null && proteinRemaining !== null ? (
          <Hint>
            Te quedan ~{Math.max(0, kcalRemaining)} kcal y{' '}
            {proteinRemaining > 0 ? proteinRemaining : 0}g de proteína para tu objetivo del día.
            {kcalRemaining < -100
              ? ` (Hoy te pasaste por ~${-kcalRemaining} kcal — normal, la ventana semanal es lo que importa.)`
              : ''}
          </Hint>
        ) : null}
      </View>

      <View style={styles.card}>
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
          onPress={onSaveWeight}
          disabled={!weightParsed || saving}
        />
        {hasLoggedToday ? (
          <Hint>
            Ya registraste{' '}
            {todayLogs.length === 1 ? 'una medición' : `${todayLogs.length} mediciones`} hoy (última
            a las {formatTime(todayLogs[todayLogs.length - 1]!.loggedAt)}).
          </Hint>
        ) : (
          <Hint>
            Ideal: a la misma hora cada día, en ayunas, después del baño. La consistencia importa
            más que la hora exacta.
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
              La tendencia es la señal. El número de hoy es ruido — agua, glucógeno, sodio, comida
              en el intestino.
            </Hint>
          </>
        ) : (
          <Body>Registra tu primer peso para empezar a ver tu tendencia.</Body>
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
                ? ` Calibrando: ${totalLogs}/14 días.`
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smallBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 0,
  },
  list: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  totalsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  totalsValue: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.text,
  },
  totalsLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  bold: {
    fontWeight: '700',
    fontSize: fontSizes.lg,
  },
});
