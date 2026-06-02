/**
 * DateField versión web.
 *
 * Renderiza un `<input type="date">` nativo del browser que abre el
 * calendario picker del sistema (Chrome/Edge/Firefox) y un botón visible.
 * El valor expuesto al caller es Date | null.
 *
 * Display interno del input está en formato del browser (ISO en value,
 * pero el calendario lo muestra localizado). Si el usuario tiene Chrome
 * en español, ya muestra DD/MM/YYYY en el picker.
 */

import { createElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radii, spacing } from './theme';
import type { DateFieldProps } from './dateField';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromIsoDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + 'T00:00:00');
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDDMMYYYY(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function DateField({ label, value, onChange, min, max, hint, error }: DateFieldProps) {
  const inputStyle = {
    fontSize: 16,
    color: colors.text,
    padding: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: error ? colors.danger : colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  } as const;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {createElement('input', {
        type: 'date',
        value: value ? toIsoDate(value) : '',
        min: min ? toIsoDate(min) : undefined,
        max: max ? toIsoDate(max) : undefined,
        onChange: (e: { target: { value: string } }) => {
          const parsed = fromIsoDate(e.target.value);
          if (parsed) onChange(parsed);
        },
        style: inputStyle,
      })}
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
