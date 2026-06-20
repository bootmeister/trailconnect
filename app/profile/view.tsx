import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import { useAuthStore } from '@/store/authStore'
import { getOrCreateChat } from '@/services/chatService'
import Avatar from '@/components/Avatar'
import Button from '@/components/Button'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'
import { formatDistance } from '@/utils/formatting'
import type { User } from '@/types/user'

export default function ViewProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetchProfile()
  }, [id])

  async function fetchProfile() {
    if (!id) return
    try {
      const userDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, id))
      if (userDoc.exists()) {
        setProfile(userDoc.data() as User)
      }
    } catch (err) {
      console.error('[ViewProfile] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleStartChat() {
    if (!user || !id) return
    try {
      const chatId = await getOrCreateChat(user.id, id)
      router.push({ pathname: '/chat/[id]', params: { id: chatId } })
    } catch (err) {
      console.error('[ViewProfile] Chat error:', err)
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    )
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>User not found</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileHeader}>
        <Avatar uri={profile.avatarUrl} name={profile.displayName} size="xl" />
        <Text style={styles.name}>{profile.displayName}</Text>
        {profile.location && <Text style={styles.location}>📍 {profile.location}</Text>}
        {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
      </View>

      {profile.stats && (
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile.stats.totalHikes}</Text>
            <Text style={styles.statLabel}>Hikes</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatDistance(profile.stats.totalDistance)}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile.stats.trailsCompleted}</Text>
            <Text style={styles.statLabel}>Trails</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>🔥 {profile.stats.streak}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <Button title="💬 Message" onPress={handleStartChat} size="lg" />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loading: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  error: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    marginTop: SPACING.xl,
    color: COLORS.error,
  },
  header: {
    padding: SPACING.md,
    paddingTop: SPACING.xl,
    backgroundColor: COLORS.surface,
  },
  backButton: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
  },
  profileHeader: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
  },
  name: {
    ...TYPOGRAPHY.heading,
    marginTop: SPACING.md,
  },
  location: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  bio: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    marginTop: SPACING.md,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.primary,
  },
  statLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  actions: {
    padding: SPACING.xl,
  },
})