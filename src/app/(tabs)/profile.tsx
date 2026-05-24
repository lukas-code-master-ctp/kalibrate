import { Alert, View } from 'react-native';
import { useUserStore } from '@/stores/user';
import { useWeightStore } from '@/stores/weight';
import { ageInYears } from '@/core/model/user';
import { Body, Button, Hint, Screen, Subtitle, Title } from '@/ui/components';
import { spacing } from '@/ui/theme';
import { weightLogRepo } from '@/data/repos';

const SEX_LABELS = { male: 'Hombre', female: 'Mujer' } as const;
const ACTIVITY_LABELS = {
  sedentary: 'Sedentario',
  light: 'Ligero',
  moderate: 'Moderado',
  high: 'Alto',
  very_high: 'Muy alto',
} as const;
const LIFE_PHASE_LABELS = {
  fertile_regular: 'Edad fértil, ciclo regular',
  fertile_irregular: 'Edad fértil, ciclo irregular',
  hormonal_contraception: 'Anticoncepción hormonal',
  perimenopause: 'Perimenopausia',
  menopause: 'Menopausia',
} as const;

export default function ProfileScreen() {
  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clearUser);
  const reloadWeights = useWeightStore((s) => s.loadLogs);
  const totalLogs = useWeightStore((s) => s.logs.length);

  if (!user) return null;

  function confirmClear() {
    Alert.alert(
      'Borrar todo',
      'Esto elimina tu perfil y todos tus registros locales. No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            await clearUser();
            for (const log of await weightLogRepo.listAll()) {
              await weightLogRepo.delete(log.id);
            }
            await reloadWeights();
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <Title>Perfil</Title>

      <View style={{ height: spacing.md }} />

      <Subtitle>Datos básicos</Subtitle>
      <Body>Sexo biológico: {SEX_LABELS[user.biologicalSex]}</Body>
      <Body>Edad: {Math.floor(ageInYears(user.birthDate))} años</Body>
      <Body>Altura: {user.heightCm} cm</Body>
      <Body>Peso inicial: {user.initialWeightKg} kg</Body>
      <Body>Actividad: {ACTIVITY_LABELS[user.activityLevel]}</Body>
      {user.bodyFatPct != null ? <Body>% grasa: {user.bodyFatPct}%</Body> : null}

      {user.biologicalSex === 'female' && user.lifePhase ? (
        <>
          <View style={{ height: spacing.lg }} />
          <Subtitle>Ciclo</Subtitle>
          <Body>Fase de vida: {LIFE_PHASE_LABELS[user.lifePhase]}</Body>
        </>
      ) : null}

      <View style={{ height: spacing.lg }} />
      <Subtitle>Datos guardados</Subtitle>
      <Body>{totalLogs} mediciones de peso</Body>
      <Hint>
        Toda tu información vive solo en este teléfono. En S6 vamos a sincronizar a la nube.
      </Hint>

      <View style={{ height: spacing.xxl }} />

      <Button label="Borrar todo (dev)" variant="ghost" onPress={confirmClear} />
    </Screen>
  );
}
