import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '@/utils/theme'
import type { Trail } from '@/types/trail'

type Difficulty = Trail['difficulty']

const config: Record<Difficulty, { color: string; icon: string; label: string }> = {
  easy: { color: COLORS.trail.easy, icon: 'ellipse', label: 'Easy' },
  moderate: { color: COLORS.trail.moderate, icon: 'triangle', label: 'Moderate' },
  hard: { color: COLORS.trail.hard, icon: 'square', label: 'Hard' },
  expert: { color: COLORS.trail.expert, icon: 'diamond', label: 'Expert' },
}

interface DifficultyBadgeProps {
  difficulty: Difficulty
  size?: 'sm' | 'md'
}

export default function DifficultyBadge({ difficulty, size = 'md' }: DifficultyBadgeProps) {
  const c = config[difficulty]
  const iconSize = size === 'sm' ? 10 : 12

  return (
    <View style={[styles.badge, { backgroundColor: c.color }, size === 'sm' && styles.badgeSm]}>
      <Ionicons name={c.icon as any} size={iconSize} color={COLORS.white} />
      <Text style={[styles.label, size === 'sm' && styles.labelSm]}>{c.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  badgeSm: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  label: {
    ...TYPOGRAPHY.small,
    color: COLORS.white,
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 10,
  },
})
