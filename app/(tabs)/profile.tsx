import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { signOut } from '@/services/auth'
import { useAuthStore } from '@/store/authStore'
import Avatar from '@/components/Avatar'
import Button from '@/components/Button'
import TrailPassport from '@/components/TrailPassport'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'
import { formatDistance } from '@/utils/formatting'

export default function ProfileScreen() {
  const { user, logout } = useAuthStore()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    logout()
    router.replace('/(auth)/login')
  }

  if (!user) return null

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.header} onPress={() => router.push('/profile/edit')}>
        <Avatar uri={user.avatarUrl} name={user.displayName} size="xl" />
        <View style={styles.editOverlay}>
          <Text style={styles.editText}>Edit</Text>
        </View>
        <Text style={styles.name}>{user.displayName}</Text>
        {user.location && <Text style={styles.location}>📍 {user.location}</Text>}
        {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
      </TouchableOpacity>

      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{user.stats.totalHikes}</Text>
          <Text style={styles.statLabel}>Hikes</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatDistance(user.stats.totalDistance)}</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{user.stats.trailsCompleted}</Text>
          <Text style={styles.statLabel}>Trails</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>🔥 {user.stats.streak}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
      </View>

      <TrailPassport />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Menu</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/friends')}>
          <Text style={styles.menuText}>Friends</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
          <Text style={styles.menuText}>Achievements</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
          <Text style={styles.menuText}>Saved Trails</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => {}}>
          <Text style={styles.menuText}>Settings</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.signout}>
        <Button title="Sign Out" onPress={handleSignOut} variant="outline" />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    padding: SPACING.xl,
    paddingTop: SPACING.xxl * 2,
    backgroundColor: COLORS.surface,
  },
  editOverlay: {
    position: 'absolute',
    top: SPACING.xxl * 2 - 20,
    right: '35%',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  editText: {
    ...TYPOGRAPHY.small,
    color: COLORS.white,
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
  section: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  sectionTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textSecondary,
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuText: {
    ...TYPOGRAPHY.body,
  },
  menuArrow: {
    ...TYPOGRAPHY.body,
    color: COLORS.textLight,
  },
  signout: {
    padding: SPACING.xl,
  },
})
