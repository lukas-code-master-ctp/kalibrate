/**
 * Banner de alerta con severidad (info/warning/danger).
 *
 * Diseñado para empujar al usuario hacia una acción sin alarmismo. El brief
 * es enfático: nunca culpabilizar, siempre explicar y sugerir.
 */

import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radii, spacing } from './theme';

export type AlertSeverity = 'info' | 'warning' | 'danger';

const STYLES: Record<AlertSeverity, { bg: string; fg: string; border: string }> = {
  info: { bg: '#EFF6FF', fg: '#1E40AF', border: '#BFDBFE' },
  warning: { bg: '#FEF3C7', fg: '#92400E', border: '#FCD34D' },
  danger: { bg: '#FEE2E2', fg: '#991B1B', border: '#FCA5A5' },
};

interface Props {
  severity: AlertSeverity;
  title: string;
  body: string;
  bullets?: readonly string[];
  advice?: string;
}

export function AlertBanner({ severity, title, body, bullets, advice }: Props) {
  const colorScheme = STYLES[severity];
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colorScheme.bg, borderColor: colorScheme.border },
      ]}
    >
      <Text style={[styles.title, { color: colorScheme.fg }]}>{title}</Text>
      <Text style={[styles.body, { color: colorScheme.fg }]}>{body}</Text>
      {bullets && bullets.length > 0 ? (
        <View style={styles.bulletsContainer}>
          {bullets.map((b, i) => (
            <Text key={i} style={[styles.bullet, { color: colorScheme.fg }]}>
              • {b}
            </Text>
          ))}
        </View>
      ) : null}
      {advice ? <Text style={[styles.advice, { color: colorScheme.fg }]}>{advice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    lineHeight: 22,
  },
  bulletsContainer: {
    marginTop: spacing.xs,
    gap: 2,
  },
  bullet: {
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
  advice: {
    fontSize: fontSizes.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
});
