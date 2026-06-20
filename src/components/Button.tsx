import React, { type CSSProperties } from 'react'
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, type ViewStyle, type TextStyle } from 'react-native'
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '@/utils/theme'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const buttonStyle = getButtonStyle(variant, size)
  const textStyling = getTextStyle(variant, size)

  return (
    <TouchableOpacity
      style={[styles.button, buttonStyle, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? COLORS.primary : COLORS.white} />
      ) : (
        <Text style={[textStyling, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  )
}

function getButtonStyle(variant: string, size: string): ViewStyle {
  const base: ViewStyle = {
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  }

  const sizes: Record<string, ViewStyle> = {
    sm: { paddingVertical: SPACING.xs, paddingHorizontal: SPACING.md },
    md: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg },
    lg: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl },
  }

  const variants: Record<string, ViewStyle> = {
    primary: { backgroundColor: COLORS.primary },
    secondary: { backgroundColor: COLORS.secondary },
    outline: { backgroundColor: 'transparent', borderWidth: 2, borderColor: COLORS.primary },
    ghost: { backgroundColor: 'transparent' },
  }

  return { ...base, ...(sizes[size] ?? sizes.md), ...(variants[variant] ?? variants.primary) }
}

function getTextStyle(variant: string, size: string): TextStyle {
  const sizes: Record<string, TextStyle> = {
    sm: { fontSize: 14 },
    md: TYPOGRAPHY.bodyBold,
    lg: TYPOGRAPHY.subheading,
  }

  const variants: Record<string, TextStyle> = {
    primary: { color: COLORS.white },
    secondary: { color: COLORS.white },
    outline: { color: COLORS.primary },
    ghost: { color: COLORS.primary },
  }

  return { ...(sizes[size] ?? sizes.md), ...(variants[variant] ?? variants.primary) }
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
  },
  disabled: {
    opacity: 0.5,
  },
})
