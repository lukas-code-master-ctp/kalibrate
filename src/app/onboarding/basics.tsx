import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import type { BiologicalSex } from '@/core/model/types';
import { useOnboardingStore } from '@/stores/onboarding';
import { BottomBar, Button, Field, Hint, OptionGroup, Screen, Title } from '@/ui/components';
import { DateField } from '@/ui/dateField';
import { spacing } from '@/ui/theme';

const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25;

function isValidBirthDate(d: Date, now: Date = new Date()): boolean {
  if (d > now) return false;
  const ageYears = (now.getTime() - d.getTime()) / MS_PER_YEAR;
  return ageYears >= 13 && ageYears <= 110;
}

export default function BasicsScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((s) => s.draft);
  const setDraft = useOnboardingStore((s) => s.setDraft);

  const [sex, setSex] = useState<BiologicalSex | undefined>(draft.biologicalSex);
  const [birthDate, setBirthDate] = useState<Date | null>(draft.birthDate ?? null);
  const [heightStr, setHeightStr] = useState(draft.heightCm?.toString() ?? '');

  const now = new Date();
  const maxBirthDate = useMemo(() => {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 13);
    return d;
  }, [now.getFullYear()]);
  const minBirthDate = useMemo(() => {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 110);
    return d;
  }, [now.getFullYear()]);

  const birthDateValid = birthDate !== null && isValidBirthDate(birthDate, now);

  const heightParsed = useMemo(() => {
    const n = parseFloat(heightStr.replace(',', '.'));
    if (Number.isNaN(n) || n < 80 || n > 230) return null;
    return n;
  }, [heightStr]);

  const canContinue = sex !== undefined && birthDateValid && heightParsed !== null;

  function next() {
    if (!canContinue || !birthDate) return;
    setDraft({
      biologicalSex: sex,
      birthDate,
      heightCm: heightParsed,
    });
    router.push('/onboarding/body');
  }

  return (
    <Screen>
      <Title>Datos básicos</Title>
      <Hint>
        El sexo biológico cambia la fórmula del metabolismo basal y, si es femenino, activa el
        modelo de ciclo menstrual.
      </Hint>

      <View style={{ height: spacing.lg }} />

      <OptionGroup<BiologicalSex>
        label="Sexo biológico"
        options={[
          { value: 'male', label: 'Hombre' },
          { value: 'female', label: 'Mujer' },
        ]}
        value={sex}
        onChange={setSex}
      />

      <DateField
        label="Fecha de nacimiento"
        value={birthDate}
        onChange={setBirthDate}
        min={minBirthDate}
        max={maxBirthDate}
        hint="Tap para abrir el calendario."
        error={birthDate !== null && !birthDateValid ? 'Edad fuera de rango (13-110)' : undefined}
      />

      <Field
        label="Altura (cm)"
        placeholder="170"
        value={heightStr}
        onChangeText={setHeightStr}
        keyboardType="decimal-pad"
        error={heightStr.length > 0 && !heightParsed ? 'Entre 80 y 230 cm' : undefined}
      />

      <BottomBar>
        <Button label="Continuar" onPress={next} disabled={!canContinue} />
      </BottomBar>
    </Screen>
  );
}
