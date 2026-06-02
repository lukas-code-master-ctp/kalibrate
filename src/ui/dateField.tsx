/**
 * DateField nativo (Android / iOS).
 *
 * Tap abre el DateTimePicker del sistema operativo. Display en DD/MM/AAAA.
 * En web se usa `dateField.web.tsx` automáticamente (Metro resuelve por
 * platform extension).
 */

import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radii, spacing } from './theme';

export interface DateFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  min?: Date;
  max?: Date;
  hint?: string;
  error?: string;
  placeholder?: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function formatDDMMYYYY(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  hint,
  error,
  placeholder = 'Seleccionar fecha',
}: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  function handleChange(event: DateTimePickerEvent, selected?: Date) {
    // En Android el picker se cierra solo después de tap.
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'dismissed') return;
    if (selected) onChange(selected);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setShowPicker(true)}
        style={({ pressed }) => [
          styles.input,
          error ? styles.inputError : null,
          pressed && styles.inputPressed,
        ]}
      >
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? formatDDMMYYYY(value) : placeholder}
        </Text>
      </Pressable>
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {showPicker ? (
        <DateTimePicker
          value={value ?? max ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          minimumDate={min}
          maximumDate={max}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
  },
  inputPressed: {
    backgroundColor: colors.bgMuted,
  },
  inputError: {
    borderColor: colors.danger,
  },
  value: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  placeholder: {
    fontSize: fontSizes.md,
    color: colors.textSubtle,
  },
  hint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  error: {
    fontSize: fontSizes.sm,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});
