/**
 * Tokens base del tema. Sistema simple por ahora; cuando crezcan las pantallas
 * lo formalizamos con un ThemeProvider.
 */

export const colors = {
  bg: '#FFFFFF',
  bgMuted: '#F4F5F7',
  card: '#FFFFFF',
  border: '#E1E4E8',
  text: '#0F172A',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
  primary: '#208AEF',
  primaryText: '#FFFFFF',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#F59E0B',
  uncertainty: '#CBD5E1',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 34,
} as const;
