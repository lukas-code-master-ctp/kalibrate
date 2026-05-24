import { Redirect } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { ageInYears } from '@/core/model/user';
import { priorCredibleInterval, priorTDEE } from '@/core/model/priors';
import { useUserStore } from '@/stores/user';
import { Body, BottomBar, Button, Hint, Screen, Subtitle, Title } from '@/ui/components';
import { colors, spacing } from '@/ui/theme';

const SEX_LABELS = { male: 'Hombre', female: 'Mujer' } as const;

const ACTIVITY_LABELS = {
  sedentary: 'Sedentario',
  light: 'Ligero',
  moderate: 'Moderado',
  high: 'Alto',
  very_high: 'Muy alto',
} as const;

export default function HomeScreen() {
  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clearUser);

  const prior = useMemo(() => {
    if (!user) return null;
    return priorTDEE({
      sex: user.biologicalSex,
      weightKg: user.initialWeightKg,
      heightCm: user.heightCm,
      ageYears: ageInYears(user.birthDate),
      activityLevel: user.activityLevel,
      bodyFatPct: user.bodyFatPct,
    });
  }, [user]);

  if (!user) {
    return <Redirect href="/onboarding" />;
  }

  const ci = prior ? priorCredibleInterval(prior) : null;
  const ageYearsRounded = Math.floor(ageInYears(user.birthDate));

  return (
    <Screen>
      <Title>Hola 👋</Title>
      <Body>Tu perfil quedó guardado localmente.</Body>

      <View style={{ height: spacing.xl }} />

      <Subtitle>Tu TDEE inicial</Subtitle>
      {prior && ci ? (
        <View>
          <Body>
            Estimación: <Body>~{Math.round(prior.mean)} kcal/día</Body>
          </Body>
          <Body>
            Rango probable (80%): {Math.round(ci.low)} – {Math.round(ci.high)} kcal/día
          </Body>
          <View style={{ height: spacing.sm }} />
          <Hint>
            Esta es solo una estimación inicial usando{' '}
            {prior.method === 'katch-mcardle' ? 'Katch-McArdle' : 'Mifflin-St Jeor'}. Una vez
            tengamos al menos 14 días de datos de peso e ingesta, vamos a calibrar este número a tu
            cuerpo real. Por ahora: confianza baja, etiqueta &quot;calibrando&quot;.
          </Hint>
        </View>
      ) : null}

      <View style={{ height: spacing.xl }} />

      <Subtitle>Perfil</Subtitle>
      <Body>
        {SEX_LABELS[user.biologicalSex]} · {ageYearsRounded} años · {user.heightCm} cm ·{' '}
        {user.initialWeightKg} kg · actividad {ACTIVITY_LABELS[user.activityLevel]}
      </Body>
      {user.bodyFatPct != null ? <Body>{user.bodyFatPct}% de grasa corporal</Body> : null}

      <View style={{ flex: 1, minHeight: spacing.xxl }} />

      <BottomBar>
        <Button
          label="Borrar perfil (dev)"
          variant="ghost"
          onPress={() => {
            void clearUser();
          }}
        />
        <Hint>
          Próximo sprint (S2): registro de peso diario con suavizado y gráfico de tendencia.
        </Hint>
      </BottomBar>

      <View style={{ height: spacing.md, backgroundColor: colors.bg }} />
    </Screen>
  );
}
