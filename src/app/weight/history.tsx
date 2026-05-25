import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { StoredWeightLog } from '@/data/repos';
import { useWeightStore } from '@/stores/weight';
import { Body, Button, Field, Hint, Screen, Subtitle, Title } from '@/ui/components';
import { colors, fontSizes, radii, spacing } from '@/ui/theme';

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const ISO_DT_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

function parseCustomDateTime(s: string, now: Date): Date | null {
  if (!ISO_DT_RE.test(s)) return null;
  const date = new Date(s.replace(' ', 'T') + ':00');
  if (Number.isNaN(date.getTime())) return null;
  if (date > now) return null;
  if (now.getTime() - date.getTime() > 365 * 24 * 3600 * 1000) return null;
  return date;
}

export default function WeightHistoryScreen() {
  const router = useRouter();
  const logs = useWeightStore((s) => s.logs);
  const updateLog = useWeightStore((s) => s.updateLog);
  const deleteLog = useWeightStore((s) => s.deleteLog);

  const sorted = useMemo(
    () => [...logs].sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime()),
    [logs],
  );

  const [editing, setEditing] = useState<StoredWeightLog | null>(null);

  function confirmDelete(log: StoredWeightLog) {
    Alert.alert(
      'Eliminar medición',
      `¿Eliminar ${log.weightKg} kg del ${formatDate(log.loggedAt)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void deleteLog(log.id);
          },
        },
      ],
    );
  }

  if (editing) {
    return (
      <>
        <Stack.Screen options={{ title: 'Editar medición' }} />
        <EditWeightForm
          log={editing}
          onSave={async (patch) => {
            await updateLog(editing.id, patch);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Historial de peso' }} />
      <Screen>
        <Title>Historial</Title>
        <Hint>{sorted.length} mediciones. Tap para editar, swipe-no — usa el botón eliminar.</Hint>

        <View style={{ height: spacing.md }} />

        {sorted.length === 0 ? (
          <Body>Sin mediciones todavía.</Body>
        ) : (
          sorted.map((log) => (
            <View key={log.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.weightText}>
                  {log.weightKg.toFixed(1)} kg
                  {log.isOutlier ? ' ⚠️' : ''}
                </Text>
                <Text style={styles.dateText}>
                  {formatDate(log.loggedAt)} · {formatTime(log.loggedAt)}
                </Text>
              </View>
              <Pressable
                onPress={() => setEditing(log)}
                hitSlop={8}
                style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
              >
                <Text style={styles.actionEdit}>Editar</Text>
              </Pressable>
              <Pressable
                onPress={() => confirmDelete(log)}
                hitSlop={8}
                style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
              >
                <Text style={styles.actionDelete}>×</Text>
              </Pressable>
            </View>
          ))
        )}
      </Screen>
    </>
  );
}

interface EditFormProps {
  log: StoredWeightLog;
  onSave: (patch: { loggedAt?: Date; weightKg?: number }) => Promise<void>;
  onCancel: () => void;
}

function EditWeightForm({ log, onSave, onCancel }: EditFormProps) {
  const [weightStr, setWeightStr] = useState(log.weightKg.toString());
  const [whenStr, setWhenStr] = useState(`${formatDate(log.loggedAt)} ${formatTime(log.loggedAt)}`);
  const [saving, setSaving] = useState(false);

  const weightParsed = useMemo(() => {
    const n = parseFloat(weightStr.replace(',', '.'));
    if (Number.isNaN(n) || n < 30 || n > 300) return null;
    return n;
  }, [weightStr]);
  const whenParsed = useMemo(() => parseCustomDateTime(whenStr, new Date()), [whenStr]);
  const canSave = weightParsed !== null && whenParsed !== null && !saving;

  async function save() {
    if (!canSave || !weightParsed || !whenParsed) return;
    setSaving(true);
    try {
      await onSave({ weightKg: weightParsed, loggedAt: whenParsed });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Subtitle>Editar medición</Subtitle>
      <Field
        label="Peso (kg)"
        value={weightStr}
        onChangeText={setWeightStr}
        keyboardType="decimal-pad"
        error={weightStr.length > 0 && !weightParsed ? 'Entre 30 y 300 kg' : undefined}
      />
      <Field
        label="Fecha y hora"
        value={whenStr}
        onChangeText={setWhenStr}
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
        placeholder="AAAA-MM-DD HH:MM"
        error={
          whenStr.length > 0 && !whenParsed
            ? 'Formato AAAA-MM-DD HH:MM, no futura, dentro del último año'
            : undefined
        }
      />
      <Button label={saving ? 'Guardando…' : 'Guardar'} onPress={save} disabled={!canSave} />
      <View style={{ height: spacing.sm }} />
      <Button label="Cancelar" variant="ghost" onPress={onCancel} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  weightText: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.text,
  },
  dateText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  actionPressed: {
    backgroundColor: colors.bgMuted,
  },
  actionEdit: {
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  actionDelete: {
    fontSize: 22,
    color: colors.danger,
    fontWeight: '700',
  },
});
