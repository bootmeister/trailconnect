import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'
import { getAllDownloadedIds, getOfflineTrail, removeDownloadedTrail } from '@/services/offlineService'
import { useOfflineStore } from '@/store/offlineStore'
import TrailCard from '@/components/TrailCard'
import type { Trail } from '@/types/trail'

export default function DownloadedTrailsScreen() {
  const router = useRouter()
  const [trails, setTrails] = useState<Trail[]>([])
  const [loading, setLoading] = useState(true)
  const { isOnline } = useOfflineStore()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const ids = await getAllDownloadedIds()
      const results: Trail[] = []
      for (const id of ids) {
        const t = await getOfflineTrail(id)
        if (t) results.push(t)
      }
      setTrails(results)
    } catch { /* */ }
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const handleDelete = (trailId: string, name: string) => {
    if (!isOnline) {
      Alert.alert('Go online', 'Connect to the internet to remove downloaded trails.')
      return
    }
    Alert.alert('Remove Download', `Remove "${name}" from your device?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeDownloadedTrail(trailId)
          useOfflineStore.getState().removeDownloadedId(trailId)
          load()
        },
      },
    ])
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Downloaded Trails</Text>
        <View style={{ width: 40 }} />
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="white" />
          <Text style={styles.offlineBannerText}>Offline — showing cached data</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : trails.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="download-outline" size={60} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>No downloaded trails</Text>
          <Text style={styles.emptySub}>Download a trail from its detail page to view it offline.</Text>
        </View>
      ) : (
        <FlatList
          data={trails}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TrailCard trail={item} onPress={() => router.push(`/trail/${item.id}`)} />
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  back: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center', ...TYPOGRAPHY.heading, fontSize: 18 },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.warning,
    paddingVertical: 6,
  },
  offlineBannerText: { color: 'white', fontSize: 13, fontWeight: '600' },
  list: { padding: SPACING.md, gap: SPACING.sm },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  emptyTitle: { ...TYPOGRAPHY.subheading, color: COLORS.textSecondary, marginTop: SPACING.md },
  emptySub: { ...TYPOGRAPHY.body, color: COLORS.textLight, textAlign: 'center', marginTop: SPACING.sm },
})
