import React from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import { COLORS, BORDER_RADIUS } from '@/utils/theme'

interface AvatarProps {
  uri?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  name?: string
  status?: 'online' | 'offline' | 'hiking'
}

const sizes = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
}

const statusColors = {
  online: COLORS.success,
  offline: COLORS.textLight,
  hiking: COLORS.primary,
}

export default function Avatar({ uri, size = 'md', name, status }: AvatarProps) {
  const avatarSize = sizes[size]

  const validUri = uri && uri.startsWith('http') ? uri : null

  if (validUri) {
    return (
      <View>
        <Image
          source={{ uri: validUri }}
          style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
        />
        {status && (
          <View style={[styles.statusIndicator, { backgroundColor: statusColors[status] }]} />
        )}
      </View>
    )
  }

  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <View>
      <View style={[styles.fallback, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
        <Text style={[styles.initials, { fontSize: avatarSize * 0.4 }]}>{initials}</Text>
      </View>
      {status && (
        <View style={[styles.statusIndicator, { backgroundColor: statusColors[status] }]} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: COLORS.surfaceAlt,
  },
  fallback: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: COLORS.white,
    fontWeight: '600',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
})
