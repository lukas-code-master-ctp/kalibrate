/**
 * Componentes de lista para mostrar food entries.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { FoodEntry, MealType } from '@/core/model/food';
import { colors, fontSizes, radii, spacing } from './theme';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snack',
};

function formatTime(d: Date): string {
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

interface RowProps {
  entry: FoodEntry;
  onDelete?: (id: string) => void;
}

export function FoodEntryRow({ entry, onDelete }: RowProps) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {entry.name}
          {entry.containsAlcohol ? ' 🍷' : ''}
        </Text>
        <Text style={styles.meta}>
          {MEAL_LABELS[entry.mealType]} · {formatTime(entry.consumedAt)}
          {entry.amountGrams != null ? ` · ${Math.round(entry.amountGrams)}g` : ''}
        </Text>
      </View>
      <View style={styles.macros}>
        <Text style={styles.kcal}>{Math.round(entry.kcal)} kcal</Text>
        <Text style={styles.protein}>{entry.proteinG.toFixed(1)}g prot</Text>
      </View>
      {onDelete ? (
        <Pressable
          onPress={() => onDelete(entry.id)}
          hitSlop={8}
          style={({ pressed }) => [styles.delete, pressed && styles.deletePressed]}
        >
          <Text style={styles.deleteText}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

interface EmptyProps {
  message?: string;
}

export function FoodListEmpty({ message }: EmptyProps) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{message ?? 'Sin entradas todavía hoy.'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    gap: spacing.sm,
  },
  name: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  macros: {
    alignItems: 'flex-end',
  },
  kcal: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.text,
  },
  protein: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  delete: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  deletePressed: {
    backgroundColor: colors.bgMuted,
  },
  deleteText: {
    fontSize: 22,
    color: colors.textMuted,
    fontWeight: '600',
  },
  empty: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
});
