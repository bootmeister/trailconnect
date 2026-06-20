import React from 'react'
import { TextInput, View, Text, StyleSheet, type TextInputProps, type ViewStyle } from 'react-native'
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '@/utils/theme'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  style?: ViewStyle
}

export default function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, props.multiline && styles.multiline]}
        placeholderTextColor={COLORS.textLight}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    ...TYPOGRAPHY.small,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
})
