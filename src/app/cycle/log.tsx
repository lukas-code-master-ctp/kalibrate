import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCycleStore } from '@/stores/cycle';
import { Body, BottomBar, Button, Field, Hint, Screen, Title } from '@/ui/components';
import { colors, fontSizes, radii, spacing } from '@/ui/theme';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(input: string, now: Date): Date | null {
  if (!ISO_DATE_RE.test(input)) return null;
  const d = new Date(input + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;
  if (d > now) return null;
  const daysAgo = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  if (daysAgo > 180) return null;
  return d;
}

function isoString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type QuickOption = 'today' | 'yesterday' | 'custom';

export default function CycleLogScreen() {
  const router = useRouter();
  const addEvent = useCycleStore((s) => s.addEvent);

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);

  const [option, setOption] = useState<QuickOption>('today');
  const [customStr, setCustomStr] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedDate = useMemo(() => {
    if (option === 'today') return now;
    if (option === 'yesterday') return yesterday;
    return parseDate(customStr, now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [option, customStr]);

  const canSave = selectedDate !== null && !saving;

  async function save() {
    if (!selectedDate) return;
    setSaving(true);
    try {
      // Normalizamos a 00:00 del día local para consistencia
      const date = new Date(selectedDate);
      date.setHours(0, 0, 0, 0);
      await addEvent({ eventType: 'period_start', occurredOn: date });
      router.back();
    } catch (e) {
      Alert.alert('No pudimos guardar', e instanceof Error ? e.message : 'Error desconocido');
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Inicio de periodo' }} />
      <Screen>
        <Title>¿Cuándo empezó?</Title>
        <Hint>
          Registramos el primer día con flujo. Si no estás segura del día exacto, anota tu mejor
          aproximación — el modelo lo absorbe.
        </Hint>

        <View style={{ height: spacing.lg }} />

        <Pressable
          onPress={() => setOption('today')}
          style={({ pressed }) => [
            styles.option,
            option === 'today' && styles.optionSelected,
            pressed && styles.optionPressed,
          ]}
        >
          <Text style={[styles.optionLabel, option === 'today' && styles.optionLabelSelected]}>
            Hoy
          </Text>
          <Text style={styles.optionMeta}>{isoString(now)}</Text>
        </Pressable>

        <Pressable
          onPress={() => setOption('yesterday')}
          style={({ pressed }) => [
            styles.option,
            option === 'yesterday' && styles.optionSelected,
            pressed && styles.optionPressed,
          ]}
        >
          <Text style={[styles.optionLabel, option === 'yesterday' && styles.optionLabelSelected]}>
            Ayer
          </Text>
          <Text style={styles.optionMeta}>{isoString(yesterday)}</Text>
        </Pressable>

        <Pressable
          onPress={() => setOption('custom')}
          style={({ pressed }) => [
            styles.option,
            option === 'custom' && styles.optionSelected,
            pressed && styles.optionPressed,
          ]}
        >
          <Text style={[styles.optionLabel, option === 'custom' && styles.optionLabelSelected]}>
            Otra fecha
          </Text>
        </Pressable>

        {option === 'custom' ? (
          <View style={{ marginTop: spacing.md }}>
            <Field
              label="Fecha"
              placeholder="AAAA-MM-DD"
              value={customStr}
              onChangeText={setCustomStr}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              error={
                customStr.length > 0 && parseDate(customStr, now) === null
                  ? 'Fecha inválida (no futura y dentro de los últimos 6 meses)'
                  : undefined
              }
            />
          </View>
        ) : null}

        {selectedDate ? (
          <View style={{ marginTop: spacing.md }}>
            <Body>
              Vamos a registrar el inicio del periodo el{' '}
              <Text style={{ fontWeight: '700' }}>{isoString(selectedDate)}</Text>.
            </Body>
          </View>
        ) : null}

        <BottomBar>
          <Button label={saving ? 'Guardando…' : 'Guardar'} onPress={save} disabled={!canSave} />
          <Button label="Cancelar" variant="ghost" onPress={() => router.back()} />
        </BottomBar>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  option: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    marginBottom: spacing.sm,
  },
  optionPressed: {
    backgroundColor: colors.bgMuted,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  optionLabel: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
  },
  optionLabelSelected: {
    color: colors.primary,
  },
  optionMeta: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
});
