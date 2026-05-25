import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useCycleStore } from '@/stores/cycle';
import { useFoodStore } from '@/stores/food';
import { useUserStore } from '@/stores/user';
import { useWeightStore } from '@/stores/weight';
import { ageInYears } from '@/core/model/user';
import { applySeed } from '@/dev/seed';
import { Body, Button, Hint, Screen, Subtitle, Title } from '@/ui/components';
import { spacing } from '@/ui/theme';
import { foodEntryRepo, menstrualEventRepo, weightLogRepo } from '@/data/repos';

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
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const clearUser = useUserStore((s) => s.clearUser);
  const reloadWeights = useWeightStore((s) => s.loadLogs);
  const reloadFood = useFoodStore((s) => s.loadEntries);
  const reloadCycle = useCycleStore((s) => s.loadEvents);
  const totalLogs = useWeightStore((s) => s.logs.length);
  const totalEntries = useFoodStore((s) => s.entries.length);
  const [seeding, setSeeding] = useState(false);

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
            for (const entry of await foodEntryRepo.listAll()) {
              await foodEntryRepo.delete(entry.id);
            }
            for (const event of await menstrualEventRepo.listAll()) {
              await menstrualEventRepo.delete(event.id);
            }
            await reloadWeights();
            await reloadFood();
            await reloadCycle();
          },
        },
      ],
    );
  }

  function confirmSeed() {
    if (!user) return;
    Alert.alert(
      'Generar datos sintéticos',
      'Esto borra todos tus pesos, comidas y eventos de ciclo actuales, y los reemplaza con 60 días de datos sintéticos (peso bajando, ingesta consistente). Útil para ver el modelo en acción sin esperar semanas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Generar',
          style: 'destructive',
          onPress: async () => {
            setSeeding(true);
            try {
              const summary = await applySeed(user);
              await reloadWeights();
              await reloadFood();
              await reloadCycle();
              Alert.alert(
                'Listo',
                `Se generaron ${summary.weightLogsCreated} pesos, ${summary.foodEntriesCreated} comidas y ${summary.cycleEventsCreated} eventos de ciclo.`,
              );
            } catch (e) {
              Alert.alert('Error al generar', e instanceof Error ? e.message : 'Error desconocido');
            } finally {
              setSeeding(false);
            }
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
      <Body>{totalEntries} entradas de comida</Body>
      <Hint>
        Toda tu información vive solo en este teléfono. En S6 vamos a sincronizar a la nube.
      </Hint>

      <View style={{ height: spacing.lg }} />
      <Subtitle>Ver historial</Subtitle>
      <Button
        label="Historial de peso"
        variant="secondary"
        onPress={() => router.push('/weight/history')}
      />

      <View style={{ height: spacing.xl }} />
      <Subtitle>Dev tools</Subtitle>
      <Hint>
        Solo para desarrollo: genera 60 días de datos sintéticos para probar el modelo bayesiano sin
        esperar semanas de uso real.
      </Hint>
      <Button
        label={seeding ? 'Generando…' : 'Generar datos sintéticos (60 días)'}
        variant="secondary"
        onPress={confirmSeed}
        disabled={seeding}
      />

      <View style={{ height: spacing.lg }} />
      <Button label="Borrar todo (dev)" variant="ghost" onPress={confirmClear} />
    </Screen>
  );
}
