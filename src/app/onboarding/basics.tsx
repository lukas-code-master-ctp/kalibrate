import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import type { BiologicalSex } from '@/core/model/types';
import { useOnboardingStore } from '@/stores/onboarding';
import { BottomBar, Button, Field, Hint, OptionGroup, Screen, Title } from '@/ui/components';
import { spacing } from '@/ui/theme';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseBirthDate(input: string): Date | null {
  if (!ISO_DATE_RE.test(input)) return null;
  const date = new Date(input + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  if (date > now) return null;
  const ageYears = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (ageYears < 13 || ageYears > 110) return null;
  return date;
}

export default function BasicsScreen() {
  const router = useRouter();
  const draft = useOnboardingStore((s) => s.draft);
  const setDraft = useOnboardingStore((s) => s.setDraft);

  const [sex, setSex] = useState<BiologicalSex | undefined>(draft.biologicalSex);
  const [birthDateStr, setBirthDateStr] = useState(
    draft.birthDate ? draft.birthDate.toISOString().slice(0, 10) : '',
  );
  const [heightStr, setHeightStr] = useState(draft.heightCm?.toString() ?? '');

  const birthDateParsed = useMemo(() => parseBirthDate(birthDateStr), [birthDateStr]);
  const heightParsed = useMemo(() => {
    const n = parseFloat(heightStr.replace(',', '.'));
    if (Number.isNaN(n) || n < 80 || n > 230) return null;
    return n;
  }, [heightStr]);

  const canContinue = sex !== undefined && birthDateParsed !== null && heightParsed !== null;

  function next() {
    if (!canContinue) return;
    setDraft({
      biologicalSex: sex,
      birthDate: birthDateParsed,
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

      <Field
        label="Fecha de nacimiento"
        placeholder="AAAA-MM-DD"
        value={birthDateStr}
        onChangeText={setBirthDateStr}
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        hint="Formato AAAA-MM-DD, por ejemplo 1992-03-15."
        error={birthDateStr.length > 0 && !birthDateParsed ? 'Fecha inválida' : undefined}
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
