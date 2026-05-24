/**
 * Componentes UI compartidos. Stack mínimo y consistente.
 */

import { ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSizes, radii, spacing } from './theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}

export function Screen({ children, scroll = true, style }: ScreenProps) {
  const inner = (
    <View style={[styles.screenInner, style]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>{children}</View>
      </TouchableWithoutFeedback>
    </View>
  );
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.screenScroll}
            keyboardShouldPersistTaps="handled"
          >
            {inner}
          </ScrollView>
        ) : (
          inner
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface TitleProps {
  children: ReactNode;
}
export function Title({ children }: TitleProps) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: TitleProps) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Body({ children }: TitleProps) {
  return <Text style={styles.body}>{children}</Text>;
}

export function Hint({ children }: TitleProps) {
  return <Text style={styles.hint}>{children}</Text>;
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: ButtonProps) {
  const variantStyle = styles[`btn_${variant}`];
  const labelStyle = styles[`btnLabel_${variant}`];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        variantStyle,
        disabled && styles.btnDisabled,
        pressed && !disabled && styles.btnPressed,
        style,
      ]}
    >
      <Text style={[styles.btnLabel, labelStyle, disabled && styles.btnLabelDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string;
}

export function Field({ label, hint, error, style, ...inputProps }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        style={[styles.input, error ? styles.inputError : null, style]}
        placeholderTextColor={colors.textSubtle}
      />
      {hint && !error ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

interface OptionGroupProps<T extends string> {
  label: string;
  hint?: string;
  options: ReadonlyArray<{ value: T; label: string; description?: string }>;
  value: T | undefined;
  onChange: (v: T) => void;
}

export function OptionGroup<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
}: OptionGroupProps<T>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      <View style={styles.optionList}>
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
            >
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                {opt.label}
              </Text>
              {opt.description ? (
                <Text style={styles.optionDescription}>{opt.description}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface BottomBarProps {
  children: ReactNode;
}
export function BottomBar({ children }: BottomBarProps) {
  return <View style={styles.bottomBar}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  screenScroll: {
    flexGrow: 1,
  },
  screenInner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: fontSizes.md,
    color: colors.text,
    lineHeight: 22,
  },
  hint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  btn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btn_primary: {
    backgroundColor: colors.primary,
  },
  btn_secondary: {
    backgroundColor: colors.bgMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn_ghost: {
    backgroundColor: 'transparent',
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnLabel: {
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  btnLabel_primary: {
    color: colors.primaryText,
  },
  btnLabel_secondary: {
    color: colors.text,
  },
  btnLabel_ghost: {
    color: colors.primary,
  },
  btnLabelDisabled: {},
  field: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  fieldHint: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  fieldError: {
    fontSize: fontSizes.sm,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  input: {
    fontSize: fontSizes.md,
    color: colors.text,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
  },
  inputError: {
    borderColor: colors.danger,
  },
  optionList: {
    gap: spacing.sm,
  },
  option: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
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
  optionDescription: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  bottomBar: {
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
});
