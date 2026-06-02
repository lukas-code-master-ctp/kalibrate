import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { TYPE_LABELS, type TrainingType } from '@/core/model/training';
import { useTrainingStore } from '@/stores/training';
import {
  BottomBar,
  Button,
  Field,
  Hint,
  OptionGroup,
  Screen,
  Subtitle,
  Title,
} from '@/ui/components';
import { colors, fontSizes, radii, spacing } from '@/ui/theme';

const TYPE_OPTIONS: { value: TrainingType; label: string; description: string }[] = [
  { value: 'strength', label: 'Fuerza', description: 'Pesas, calistenia, máquinas.' },
  {
    value: 'cardio_low',
    label: 'Cardio suave',
    description: 'Caminata fuerte, bici suave, trote.',
  },
  { value: 'cardio_high', label: 'Cardio intenso', description: 'Running, HIIT, intervalos.' },
  { value: 'mixed', label: 'Mixto', description: 'Crossfit, circuito.' },
  { value: 'sport', label: 'Deporte', description: 'Pádel, fútbol, tenis, etc.' },
];

type WhenChoice = 'now' | 'today' | 'yesterday';

function todayAtHour(hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}

export default function AddTrainingScreen() {
  const router = useRouter();
  const addSession = useTrainingStore((s) => s.addSession);

  const [type, setType] = useState<TrainingType | undefined>(undefined);
  const [durationStr, setDurationStr] = useState('45');
  const [description, setDescription] = useState('');
  const [rpeStr, setRpeStr] = useState('');
  const [when, setWhen] = useState<WhenChoice>('now');
  const [isNewProgram, setIsNewProgram] = useState(false);
  const [saving, setSaving] = useState(false);

  const duration = useMemo(() => {
    const n = parseFloat(durationStr.replace(',', '.'));
    if (Number.isNaN(n) || n < 1 || n > 600) return null;
    return Math.round(n);
  }, [durationStr]);

  const rpe = useMemo(() => {
    if (rpeStr.trim() === '') return undefined;
    const n = parseFloat(rpeStr.replace(',', '.'));
    if (Number.isNaN(n) || n < 1 || n > 10) return null;
    return Math.round(n);
  }, [rpeStr]);

  const rpeHasError = rpeStr.trim() !== '' && rpe === null;

  const occurredAt = useMemo(() => {
    if (when === 'now') return new Date();
    if (when === 'today') return todayAtHour(new Date().getHours());
    // yesterday at noon
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(12, 0, 0, 0);
    return d;
  }, [when]);

  const canSave = type !== undefined && duration !== null && !rpeHasError && !saving;

  async function save() {
    if (!canSave || !type || duration === null) return;
    setSaving(true);
    try {
      await addSession({
        occurredAt,
        type,
        durationMin: duration,
        description: description.trim() || undefined,
        rpe: rpe === undefined || rpe === null ? undefined : rpe,
        isNewProgram: isNewProgram || undefined,
      });
      router.back();
    } catch (e) {
      Alert.alert('No pudimos guardar', e instanceof Error ? e.message : 'Error desconocido');
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Agregar entrenamiento' }} />
      <Screen>
        <Title>Entrenamiento</Title>

        <OptionGroup<TrainingType>
          label="Tipo"
          options={TYPE_OPTIONS}
          value={type}
          onChange={setType}
        />

        <Field
          label="¿Qué hiciste? (opcional)"
          placeholder="ej: Press banca 5x5, Pádel con Tomás, 5 km running"
          value={description}
          onChangeText={setDescription}
          autoCapitalize="sentences"
        />

        <Field
          label="Duración (min)"
          placeholder="45"
          value={durationStr}
          onChangeText={setDurationStr}
          keyboardType="number-pad"
          error={durationStr.length > 0 && !duration ? 'Entre 1 y 600 minutos' : undefined}
        />

        <Field
          label="Intensidad RPE (1-10, opcional)"
          placeholder="ej: 7"
          value={rpeStr}
          onChangeText={setRpeStr}
          keyboardType="number-pad"
          hint="RPE = qué tan difícil se sintió. 7 = exigente. 9-10 = casi máximo."
          error={rpeHasError ? 'Entre 1 y 10' : undefined}
        />

        <View style={styles.field}>
          <Subtitle>Cuándo</Subtitle>
          <View style={styles.whenRow}>
            <WhenChip label="Ahora" active={when === 'now'} onPress={() => setWhen('now')} />
            <WhenChip label="Hoy" active={when === 'today'} onPress={() => setWhen('today')} />
            <WhenChip
              label="Ayer"
              active={when === 'yesterday'}
              onPress={() => setWhen('yesterday')}
            />
          </View>
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <Text style={styles.switchLabel}>Programa nuevo</Text>
            <Text style={styles.switchHint}>
              Marca si llevas &lt;4 semanas con este programa. Las primeras semanas de fuerza suelen
              sumar 1-2 kg de agua y glucógeno muscular — eso es bueno, no es grasa.
            </Text>
          </View>
          <Switch
            value={isNewProgram}
            onValueChange={setIsNewProgram}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>

        <BottomBar>
          <Button label={saving ? 'Guardando…' : 'Guardar'} onPress={save} disabled={!canSave} />
          {!type ? <Hint>Selecciona un tipo para continuar.</Hint> : null}
        </BottomBar>
      </Screen>
    </>
  );
}

function WhenChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.whenChip,
        active && styles.whenChipActive,
        pressed && styles.whenChipPressed,
      ]}
    >
      <Text style={[styles.whenLabel, active && styles.whenLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  whenRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  whenChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  whenChipPressed: {
    backgroundColor: colors.bgMuted,
  },
  whenChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  whenLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
  },
  whenLabelActive: {
    color: colors.primary,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  switchLabel: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  switchHint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
