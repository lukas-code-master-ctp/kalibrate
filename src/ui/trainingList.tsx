/**
 * Componentes de lista para mostrar sesiones de entrenamiento.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TYPE_LABELS, type TrainingSession } from '@/core/model/training';
import { colors, fontSizes, radii, spacing } from './theme';

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface RowProps {
  session: TrainingSession;
  onDelete?: (id: string) => void;
}

export function TrainingRow({ session, onDelete }: RowProps) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {TYPE_LABELS[session.type]}
          {session.description ? ` · ${session.description}` : ''}
        </Text>
        <Text style={styles.meta}>
          {session.durationMin} min · {formatTime(session.occurredAt)}
          {session.rpe ? ` · RPE ${session.rpe}` : ''}
          {session.isNewProgram ? ' · 🆕 programa' : ''}
        </Text>
      </View>
      {onDelete ? (
        <Pressable
          onPress={() => onDelete(session.id)}
          hitSlop={8}
          style={({ pressed }) => [styles.delete, pressed && styles.deletePressed]}
        >
          <Text style={styles.deleteText}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function TrainingListEmpty() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>Sin sesiones registradas hoy.</Text>
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
  title: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    fontSize: fontSizes.sm,
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
