import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import type { GoalType } from '@/core/model/user';
import { useOnboardingStore } from '@/stores/onboarding';
import { BottomBar, Button, Hint, OptionGroup, Screen, Title } from '@/ui/components';
import { colors, spacing } from '@/ui/theme';

interface RateOption {
  value: number;
  label: string;
  description: string;
  warning?: string;
}

function ratesFor(goalType: GoalType): RateOption[] {
  if (goalType === 'maintain') {
    return [
      {
        value: 0,
        label: 'Mantener',
        description: 'Objetivo: no perder ni ganar peso de forma significativa.',
      },
    ];
  }
  if (goalType === 'lose') {
    return [
      {
        value: -0.25,
        label: 'Pérdida lenta',
        description: '≈ 0.25 kg/semana. Déficit suave, fácil de sostener.',
      },
      {
        value: -0.5,
        label: 'Pérdida moderada',
        description: '≈ 0.5 kg/semana. Recomendado por defecto.',
      },
      {
        value: -0.75,
        label: 'Pérdida rápida',
        description: '≈ 0.75 kg/semana.',
        warning: 'Déficit alto: más riesgo de adaptación metabólica y pérdida de masa magra.',
      },
      {
        value: -1.0,
        label: 'Pérdida muy rápida',
        description: '≈ 1 kg/semana.',
        warning:
          'Déficit agresivo. Solo recomendable si tienes mucho margen y por tiempo limitado.',
      },
    ];
  }
  return [
    {
      value: 0.25,
      label: 'Ganancia lenta',
      description: '≈ 0.25 kg/semana. Mejor ratio masa magra/grasa.',
    },
    {
      value: 0.5,
      label: 'Ganancia moderada',
      description: '≈ 0.5 kg/semana.',
    },
  ];
}

export default function GoalScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((s) => s.draft);
  const setDraft = useOnboardingStore((s) => s.setDraft);

  const [goalType, setGoalType] = useState<GoalType | undefined>(draft.goalType);
  const [rate, setRate] = useState<number | undefined>(draft.targetRateKgPerWeek);

  const rateOptions = useMemo(() => (goalType ? ratesFor(goalType) : []), [goalType]);

  const selectedRateOption = useMemo(
    () => (rate !== undefined ? rateOptions.find((r) => r.value === rate) : undefined),
    [rate, rateOptions],
  );

  const canContinue = goalType !== undefined && rate !== undefined;

  function next() {
    if (!canContinue) return;
    setDraft({ goalType, targetRateKgPerWeek: rate });
    router.push('/onboarding/summary');
  }

  return (
    <Screen>
      <Title>Tu objetivo</Title>
      <Hint>
        Podemos cambiarlo en cualquier momento. La app prefiere déficits moderados sostenibles por
        sobre déficits agresivos.
      </Hint>

      <View style={{ height: spacing.lg }} />

      <OptionGroup<GoalType>
        label="Quiero..."
        options={[
          { value: 'lose', label: 'Perder peso' },
          { value: 'maintain', label: 'Mantener' },
          { value: 'gain', label: 'Ganar peso' },
        ]}
        value={goalType}
        onChange={(v) => {
          setGoalType(v);
          setRate(undefined);
        }}
      />

      {rateOptions.length > 0 ? (
        <OptionGroup<string>
          label="Ritmo"
          options={rateOptions.map((opt) => ({
            value: opt.value.toString(),
            label: opt.label,
            description: opt.description,
          }))}
          value={rate?.toString()}
          onChange={(v) => setRate(parseFloat(v))}
        />
      ) : null}

      {selectedRateOption?.warning ? (
        <View style={{ paddingVertical: spacing.sm }}>
          <Hint>⚠️ {selectedRateOption.warning}</Hint>
        </View>
      ) : null}

      <BottomBar>
        <Button label="Continuar" onPress={next} disabled={!canContinue} />
        <Hint>
          La app no te bloquea: si elegís un ritmo agresivo, te avisamos pero respetamos tu
          decisión. Color de advertencia: <Hint>{selectedRateOption?.warning ? 'sí' : 'no'}</Hint>
        </Hint>
      </BottomBar>

      <View style={{ height: spacing.md, backgroundColor: colors.bg }} />
    </Screen>
  );
}
