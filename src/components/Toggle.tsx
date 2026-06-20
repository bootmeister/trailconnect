import React from 'react'
import { TouchableOpacity, View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, BORDER_RADIUS } from '@/utils/theme'

interface ToggleProps {
  value: boolean
  onValueChange: (value: boolean) => void
  color?: string
}

export default function Toggle({ value, onValueChange, color = COLORS.primary }: ToggleProps) {
  return (
    <TouchableOpacity
      style={[styles.container, value && { backgroundColor: color }]}
      onPress={() => onValueChange(!value)}
      activeOpacity={0.7}
    >
      {value && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
})