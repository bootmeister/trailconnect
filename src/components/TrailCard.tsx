import React from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '@/utils/theme'
import { formatDistance, formatElevation } from '@/utils/formatting'
import DifficultyBadge from './DifficultyBadge'
import type { Trail } from '@/types/trail'

interface TrailCardProps {
  trail: Trail
  onPress?: () => void
}

export default function TrailCard({ trail, onPress }: TrailCardProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {trail.photos.length > 0 && (
        <Image source={{ uri: trail.photos[0] }} style={styles.image} />
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{trail.name}</Text>
          <DifficultyBadge difficulty={trail.difficulty} size="sm" />
        </View>

        <Text style={styles.description} numberOfLines={2}>{trail.description}</Text>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{formatDistance(trail.distance)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Gain / Loss</Text>
            <Text style={styles.statValue}>+{formatElevation(trail.elevationGain)} / -{formatElevation(trail.elevationLoss ?? trail.elevationGain)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Rating</Text>
            <Text style={styles.statValue}>★ {trail.rating.toFixed(1)}</Text>
          </View>
        </View>

        {trail.tags.length > 0 && (
          <View style={styles.tags}>
            {trail.tags.slice(0, 3).map(tag => (
              <Text key={tag} style={styles.tag}>#{tag}</Text>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  image: {
    width: '100%',
    height: 160,
  },
  content: {
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  name: {
    ...TYPOGRAPHY.subheading,
    flex: 1,
    marginRight: SPACING.sm,
  },
  description: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.sm,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.textLight,
  },
  statValue: {
    ...TYPOGRAPHY.captionBold,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  tag: {
    ...TYPOGRAPHY.small,
    color: COLORS.primary,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
})
