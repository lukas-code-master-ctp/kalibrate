import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import type { ActivityLevel } from '@/core/constants';
import { useOnboardingStore } from '@/stores/onboarding';
import { BottomBar, Button, Field, Hint, OptionGroup, Screen, Title } from '@/ui/components';
import { spacing } from '@/ui/theme';

export default function BodyScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((s) => s.draft);
  const setDraft = useOnboardingStore((s) => s.setDraft);

  const [weightStr, setWeightStr] = useState(draft.initialWeightKg?.toString() ?? '');
  const [activity, setActivity] = useState<ActivityLevel | undefined>(draft.activityLevel);
  const [bodyFatStr, setBodyFatStr] = useState(draft.bodyFatPct?.toString() ?? '');

  const weightParsed = useMemo(() => {
    const n = parseFloat(weightStr.replace(',', '.'));
    if (Number.isNaN(n) || n < 30 || n > 300) return null;
    return n;
  }, [weightStr]);

  const bodyFatParsed = useMemo(() => {
    if (bodyFatStr.trim() === '') return undefined;
    const n = parseFloat(bodyFatStr.replace(',', '.'));
    if (Number.isNaN(n) || n < 4 || n > 60) return null;
    return n;
  }, [bodyFatStr]);

  const bodyFatHasError = bodyFatStr.trim() !== '' && bodyFatParsed === null;
  const canContinue = weightParsed !== null && activity !== undefined && !bodyFatHasError;

  function next() {
    if (!canContinue) return;
    setDraft({
      initialWeightKg: weightParsed,
      activityLevel: activity,
      bodyFatPct: bodyFatParsed === null ? undefined : bodyFatParsed,
    });

    if (draft.biologicalSex === 'female') {
      router.push('/onboarding/cycle');
    } else {
      router.push('/onboarding/goal');
    }
  }

  return (
    <Screen>
      <Title>Tu cuerpo hoy</Title>
      <Hint>
        El peso de hoy es el punto de partida. Va a fluctuar día a día — eso es normal y la app está
        hecha para entenderlo.
      </Hint>

      <View style={{ height: spacing.lg }} />

      <Field
        label="Peso actual (kg)"
        placeholder="70"
        value={weightStr}
        onChangeText={setWeightStr}
        keyboardType="decimal-pad"
        error={weightStr.length > 0 && !weightParsed ? 'Entre 30 y 300 kg' : undefined}
      />

      <OptionGroup<ActivityLevel>
        label="Nivel de actividad"
        hint="Cuánto te mueves en un día típico, sin contar ejercicio formal."
        options={[
          {
            value: 'sedentary',
            label: 'Sedentario',
            description: 'Trabajo de oficina, casi sin caminar.',
          },
          {
            value: 'light',
            label: 'Ligero',
            description: 'Caminas algo, te paras seguido.',
          },
          {
            value: 'moderate',
            label: 'Moderado',
            description: 'Caminas bastante, ejercicio 2-3×/semana.',
          },
          {
            value: 'high',
            label: 'Alto',
            description: 'Trabajo activo o ejercicio intenso 4-6×/semana.',
          },
          {
            value: 'very_high',
            label: 'Muy alto',
            description: 'Atleta o trabajo físico pesado diario.',
          },
        ]}
        value={activity}
        onChange={setActivity}
      />

      <Field
        label="% de grasa corporal (opcional)"
        placeholder="—"
        value={bodyFatStr}
        onChangeText={setBodyFatStr}
        keyboardType="decimal-pad"
        hint="Si lo sabes (DEXA, BIA, calipers). Si no, déjalo vacío y usamos Mifflin-St Jeor."
        error={bodyFatHasError ? 'Entre 4 y 60%' : undefined}
      />

      <BottomBar>
        <Button label="Continuar" onPress={next} disabled={!canContinue} />
      </BottomBar>
    </Screen>
  );
}
