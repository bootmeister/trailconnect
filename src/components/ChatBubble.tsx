import React from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '@/utils/theme'
import { formatDate } from '@/utils/formatting'

interface ChatBubbleProps {
  message: {
    id: string
    text: string
    images: string[]
    location?: { lat: number; lng: number; name?: string }
    createdAt?: any
    timestamp?: any
  }
  isOwn: boolean
}

export default function ChatBubble({ message, isOwn }: ChatBubbleProps) {
  const timestamp = message.createdAt || message.timestamp

  return (
    <View style={[styles.container, isOwn ? styles.own : styles.other]}>
      {message.text.length > 0 && (
        <Text style={[styles.text, isOwn ? styles.textOwn : styles.textOther]}>{message.text}</Text>
      )}

      {message.images.length > 0 && (
        <Image source={{ uri: message.images[0] }} style={styles.image} />
      )}

      {message.location && (
        <View style={styles.locationContainer}>
          <Text style={styles.locationText}>📍 {message.location.name || 'Shared location'}</Text>
        </View>
      )}

      <Text style={[styles.timestamp, isOwn ? styles.timestampOwn : styles.timestampOther]}>
        {formatDate(timestamp)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xs,
  },
  own: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  other: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceAlt,
    borderBottomLeftRadius: 4,
  },
  text: {
    ...TYPOGRAPHY.body,
  },
  textOwn: {
    color: COLORS.white,
  },
  textOther: {
    color: COLORS.text,
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.xs,
  },
  locationContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.xs,
  },
  locationText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  timestamp: {
    ...TYPOGRAPHY.small,
    marginTop: SPACING.xs,
    alignSelf: 'flex-end',
  },
  timestampOwn: {
    color: 'rgba(255,255,255,0.7)',
  },
  timestampOther: {
    color: COLORS.textLight,
  },
})
