import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import type { LifePhase } from '@/core/model/types';
import type { HormonalMethod } from '@/core/model/user';
import { useOnboardingStore } from '@/stores/onboarding';
import { BottomBar, Button, Hint, OptionGroup, Screen, Title } from '@/ui/components';
import { spacing } from '@/ui/theme';

export default function CycleScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((s) => s.draft);
  const setDraft = useOnboardingStore((s) => s.setDraft);

  const [lifePhase, setLifePhase] = useState<LifePhase | undefined>(draft.lifePhase);
  const [hormonalMethod, setHormonalMethod] = useState<HormonalMethod | undefined>(
    draft.hormonalMethod,
  );

  const canContinue = lifePhase !== undefined && hormonalMethod !== undefined;

  function next() {
    if (!canContinue) return;
    setDraft({ lifePhase, hormonalMethod });
    router.push('/onboarding/goal');
  }

  return (
    <Screen>
      <Title>Ciclo y hormonal</Title>
      <Hint>
        El ciclo menstrual modifica el metabolismo y la retención de líquidos. La app compara fases
        comparables y nunca alarma por subidas de peso premenstruales — pero para eso necesita saber
        dónde estás.
      </Hint>

      <View style={{ height: spacing.lg }} />

      <OptionGroup<LifePhase>
        label="Fase de vida"
        options={[
          {
            value: 'fertile_regular',
            label: 'Edad fértil, ciclo regular',
            description: 'Te llega cada 21-35 días con poca variación.',
          },
          {
            value: 'fertile_irregular',
            label: 'Edad fértil, ciclo irregular',
            description: 'Variaciones grandes o sin patrón claro.',
          },
          {
            value: 'hormonal_contraception',
            label: 'Anticoncepción hormonal',
            description: 'Pastilla, DIU hormonal, implante, etc.',
          },
          {
            value: 'perimenopause',
            label: 'Perimenopausia',
            description: 'Síntomas o ciclos cambiantes hacia la menopausia.',
          },
          {
            value: 'menopause',
            label: 'Menopausia',
            description: 'Más de 12 meses sin menstruación.',
          },
        ]}
        value={lifePhase}
        onChange={setLifePhase}
      />

      <OptionGroup<HormonalMethod>
        label="Método anticonceptivo"
        options={[
          { value: 'none', label: 'Ninguno' },
          { value: 'combined_pill', label: 'Pastilla combinada' },
          { value: 'progestin_only', label: 'Pastilla solo progestina' },
          { value: 'iud_hormonal', label: 'DIU hormonal' },
          { value: 'iud_copper', label: 'DIU de cobre' },
          { value: 'implant', label: 'Implante' },
          { value: 'injection', label: 'Inyección' },
          { value: 'patch', label: 'Parche' },
        ]}
        value={hormonalMethod}
        onChange={setHormonalMethod}
      />

      <BottomBar>
        <Button label="Continuar" onPress={next} disabled={!canContinue} />
      </BottomBar>
    </Screen>
  );
}
