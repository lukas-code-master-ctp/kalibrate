import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { priorCredibleInterval, priorTDEE } from '@/core/model/priors';
import { ageInYears } from '@/core/model/user';
import { useOnboardingStore } from '@/stores/onboarding';
import { Body, BottomBar, Button, Hint, Screen, Subtitle, Title } from '@/ui/components';
import { spacing } from '@/ui/theme';

export default function SummaryScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((s) => s.draft);
  const commit = useOnboardingStore((s) => s.commit);
  const [saving, setSaving] = useState(false);

  const prior = useMemo(() => {
    if (
      !draft.biologicalSex ||
      !draft.birthDate ||
      draft.heightCm === undefined ||
      draft.initialWeightKg === undefined ||
      !draft.activityLevel
    ) {
      return null;
    }
    return priorTDEE({
      sex: draft.biologicalSex,
      weightKg: draft.initialWeightKg,
      heightCm: draft.heightCm,
      ageYears: ageInYears(draft.birthDate),
      activityLevel: draft.activityLevel,
      bodyFatPct: draft.bodyFatPct,
    });
  }, [draft]);

  if (!prior) {
    return (
      <Screen>
        <Title>Falta algo</Title>
        <Body>Volvé atrás y completá los pasos anteriores.</Body>
        <BottomBar>
          <Button
            label="Volver al inicio"
            variant="secondary"
            onPress={() => router.replace('/onboarding')}
          />
        </BottomBar>
      </Screen>
    );
  }

  const ci = priorCredibleInterval(prior);
  const dailyTarget = Math.round(prior.mean + (draft.targetRateKgPerWeek ?? 0) * 1100);

  async function onConfirm() {
    setSaving(true);
    try {
      await commit();
      router.replace('/');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error desconocido';
      Alert.alert('No pudimos guardar tu perfil', message);
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Title>Tu punto de partida</Title>
      <Hint>
        Estos son los números iniciales. Una vez tengamos al menos 14 días de datos, los vamos a
        re-calibrar con regresión bayesiana sobre tu cuerpo real.
      </Hint>

      <View style={{ height: spacing.xl }} />

      <Subtitle>TDEE estimado</Subtitle>
      <Body>~{Math.round(prior.mean)} kcal/día</Body>
      <Hint>
        Rango probable (80%): {Math.round(ci.low)} – {Math.round(ci.high)} kcal/día. Método:{' '}
        {prior.method === 'katch-mcardle' ? 'Katch-McArdle' : 'Mifflin-St Jeor'}. Confianza:
        calibrando.
      </Hint>

      <View style={{ height: spacing.lg }} />

      <Subtitle>Ingesta sugerida para tu objetivo</Subtitle>
      <Body>~{dailyTarget} kcal/día en promedio</Body>
      <Hint>
        Esto se redistribuye en la semana (L-V más estricto, S-D más permisivo). No es una meta
        diaria rígida.
      </Hint>

      <View style={{ flex: 1, minHeight: spacing.xxl }} />

      <BottomBar>
        <Button
          label={saving ? 'Guardando…' : 'Empezar'}
          onPress={() => void onConfirm()}
          disabled={saving}
        />
        <Button
          label="Editar mis datos"
          variant="ghost"
          onPress={() => router.replace('/onboarding/basics')}
        />
      </BottomBar>
    </Screen>
  );
}
