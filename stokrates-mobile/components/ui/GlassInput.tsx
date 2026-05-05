import React from 'react';
import {
  StyleSheet, View, TextInput, Text,
  type TextInputProps, type ViewStyle,
} from 'react-native';
import { useUIStore } from '@/stores/uiStore';
import { GLASS, TYPOGRAPHY, SPACING } from '@/constants/theme';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function GlassInput({ label, error, icon, containerStyle, ...inputProps }: Props) {
  const colors = useUIStore(s => s.colors);

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.input,
            borderColor: error ? colors.danger : colors.inputBorder,
          },
        ]}
      >
        {icon && <View style={styles.icon}>{icon}</View>}
        <TextInput
          style={[
            styles.input,
            { color: colors.text },
            icon ? { paddingLeft: 0 } : undefined,
          ]}
          placeholderTextColor={colors.textMuted}
          {...inputProps}
        />
      </View>
      {error && (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: GLASS.radiusSm,
    paddingHorizontal: SPACING.md,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.body,
    paddingVertical: SPACING.md,
  },
  error: {
    ...TYPOGRAPHY.small,
    marginTop: SPACING.xs,
  },
});
