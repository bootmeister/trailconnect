import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import { useAuthStore } from '@/store/authStore'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'
import { formatDistance, formatHikeDuration, formatDate } from '@/utils/formatting'
import type { HikeSummary } from '@/types/hike'

export default function HikesListScreen() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [hikes, setHikes] = useState<HikeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useFocusEffect(
    useCallback(() => {
      loadHikes()
    }, [])
  )

  async function loadHikes() {
    if (!user) return
    try {
      const hikesRef = collection(db, FIRESTORE_COLLECTIONS.HIKES)
      const q = query(hikesRef, where('userId', '==', user.id))
      const snap = await getDocs(q)
      const list = snap.docs.map(d => {
        const data = d.data()
        return {
          id: d.id,
          name: data.name || 'Unnamed Hike',
          startTime: data.startTime?.toDate?.() || data.startTime,
          distance: data.distance || 0,
          elevationGain: data.elevationGain || 0,
          duration: data.duration || 0,
          trailId: data.trailId,
        } as HikeSummary
      })
      list.sort((a, b) => {
        const aTime = a.startTime instanceof Date ? a.startTime.getTime() : 0
        const bTime = b.startTime instanceof Date ? b.startTime.getTime() : 0
        return bTime - aTime
      })
      setHikes(list)
    } catch (err) {
      console.error('[Hikes] Error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function onRefresh() {
    setRefreshing(true)
    loadHikes()
  }

  function formatTime(seconds: number): string {
    if (!seconds) return '--'
    return formatHikeDuration(seconds / 60)
  }

  function renderItem({ item }: { item: HikeSummary }) {
    const date = item.startTime instanceof Date ? item.startTime : new Date()
    return (
      <TouchableOpacity
        style={styles.hikeItem}
        onPress={() => router.push({ pathname: '/hike/[id]', params: { id: item.id } })}
        activeOpacity={0.7}
      >
        <View style={styles.hikeIcon}>
          <Ionicons name="walk-outline" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.hikeInfo}>
          <Text style={styles.hikeName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.hikeDate}>
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
          <View style={styles.hikeStatsRow}>
            <Text style={styles.hikeStat}>{formatDistance(item.distance)}</Text>
            <Text style={styles.hikeStatDot}>·</Text>
            <Text style={styles.hikeStat}>{formatTime(item.duration)}</Text>
            {item.elevationGain > 0 && (
              <>
                <Text style={styles.hikeStatDot}>·</Text>
                <Text style={styles.hikeStat}>{Math.round(item.elevationGain)}m ↑</Text>
              </>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>My Hikes</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/hike/new')}
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={hikes}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="walk-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No hikes yet</Text>
              <Text style={styles.emptySubtext}>Start your first hike to see it here</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingTop: SPACING.xxl,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    marginRight: SPACING.sm,
    padding: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.heading,
    color: COLORS.text,
    flex: 1,
  },
  newBtn: {
    padding: SPACING.xs,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  list: {
    padding: SPACING.md,
    flexGrow: 1,
  },
  hikeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  hikeIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  hikeInfo: {
    flex: 1,
  },
  hikeName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  hikeDate: {
    ...TYPOGRAPHY.small,
    color: COLORS.textLight,
    marginTop: 2,
  },
  hikeStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  hikeStat: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  hikeStatDot: {
    ...TYPOGRAPHY.small,
    color: COLORS.textLight,
  },
  emptyText: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
})
