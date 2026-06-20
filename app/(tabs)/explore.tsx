import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'
import TrailCard from '@/components/TrailCard'
import { getTrails, getTrailById } from '@/services/trailService'
import { getLists, deleteList } from '@/services/listService'
import { useAuthStore } from '@/store/authStore'
import { useOfflineStore } from '@/store/offlineStore'
import type { Trail } from '@/types/trail'
import type { TrailList } from '@/types/list'

const difficulties = ['all', 'easy', 'moderate', 'hard', 'expert'] as const

export default function ExploreScreen() {
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const downloadedCount = useOfflineStore(s => s.downloadedIds.length)
  const [mode, setMode] = useState<'explore' | 'mylists'>('explore')
  const [trails, setTrails] = useState<Trail[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [difficulty, setDifficulty] = useState<string>('all')
  const [lists, setLists] = useState<TrailList[]>([])
  const [listTrails, setListTrails] = useState<Record<string, Trail[]>>({})
  const [listsLoading, setListsLoading] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useFocusEffect(
    useCallback(() => {
      if (mode === 'explore') {
        loadTrails()
      } else {
        loadLists()
      }
    }, [mode, difficulty, debouncedSearch])
  )

  async function loadTrails() {
    try {
      const result = await getTrails({
        difficulty: difficulty === 'all' ? undefined : difficulty,
        search: debouncedSearch || undefined,
      })
      setTrails(result.filter(t => !t.isPrivate || (user && t.uploaderId === user.id)))
    } catch (err) {
      console.error('[Explore] Error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function loadLists() {
    if (!user) return
    setListsLoading(true)
    try {
      const listData = await getLists(user.id)
      setLists(listData)
      const trailMap: Record<string, Trail[]> = {}
      await Promise.all(listData.map(async list => {
        const trailDocs = await Promise.all(list.trailIds.map(id => getTrailById(id).catch(() => null)))
        trailMap[list.id] = trailDocs.filter((t): t is Trail => t !== null)
      }))
      setListTrails(trailMap)
    } catch (err) {
      console.error('[Lists] Error:', err)
    } finally {
      setListsLoading(false)
      setRefreshing(false)
    }
  }

  function onRefresh() {
    setRefreshing(true)
    if (mode === 'explore') {
      loadTrails()
    } else {
      loadLists()
    }
  }

  function confirmDeleteList(list: TrailList) {
    if (!user) return
    Alert.alert('Delete List', `Delete "${list.name}"? Trails in the list won't be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteList(user.id, list.id)
          setLists(prev => prev.filter(l => l.id !== list.id))
        } catch (err: any) {
          Alert.alert('Error', err?.message || 'Failed to delete list')
        }
      }},
    ])
  }

  function renderListSection({ item }: { item: TrailList }) {
    const trailsInList = listTrails[item.id] || []
    return (
      <View style={styles.listSection}>
        <TouchableOpacity
          style={styles.listHeader}
          onLongPress={() => confirmDeleteList(item)}
        >
          <View style={styles.listHeaderInfo}>
            <Text style={styles.listName}>{item.name}</Text>
            {item.description ? <Text style={styles.listDesc}>{item.description}</Text> : null}
          </View>
          <Text style={styles.listCount}>{trailsInList.length} trail{trailsInList.length === 1 ? '' : 's'}</Text>
        </TouchableOpacity>
        {trailsInList.map(trail => (
          <TrailCard
            key={trail.id}
            trail={trail}
            onPress={() => router.push({ pathname: '/trail/[id]', params: { id: trail.id } })}
          />
        ))}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore Trails</Text>

        {user && (
          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'explore' && styles.modeTabActive]}
              onPress={() => setMode('explore')}
            >
              <Ionicons name="search" size={16} color={mode === 'explore' ? COLORS.white : COLORS.textSecondary} />
              <Text style={[styles.modeTabText, mode === 'explore' && styles.modeTabTextActive]}>Explore</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'mylists' && styles.modeTabActive]}
              onPress={() => setMode('mylists')}
            >
              <Ionicons name="folder" size={16} color={mode === 'mylists' ? COLORS.white : COLORS.textSecondary} />
              <Text style={[styles.modeTabText, mode === 'mylists' && styles.modeTabTextActive]}>My Lists</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'explore' && (
          <>
            <TextInput
              style={styles.search}
              placeholder="Search trails..."
              placeholderTextColor={COLORS.textLight}
              value={search}
              onChangeText={setSearch}
            />
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/hike/new')}>
                <Ionicons name="walk-outline" size={18} color={COLORS.primary} />
                <Text style={styles.actionBtnText}>Start Hike</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/import-gpx')}>
                <Ionicons name="cloud-upload-outline" size={18} color={COLORS.primary} />
                <Text style={styles.actionBtnText}>Import GPX</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/downloaded-trails')}>
                <Ionicons name="download-outline" size={18} color={COLORS.primary} />
                <Text style={styles.actionBtnText}>Downloaded</Text>
                {downloadedCount > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{downloadedCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {mode === 'explore' && (
        <View style={styles.filterRow}>
          {difficulties.map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.filterChip, difficulty === d && styles.filterChipActive]}
              onPress={() => setDifficulty(d)}
            >
              <Text style={[styles.filterChipText, difficulty === d && styles.filterChipTextActive]}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {mode === 'explore' ? (
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={trails}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TrailCard
                trail={item}
                onPress={() => router.push({ pathname: '/trail/[id]', params: { id: item.id } })}
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>No trails found</Text>
                <Text style={styles.emptySubtext}>Try a different search or filter</Text>
              </View>
            }
          />
        )
      ) : (
        listsLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={lists}
            keyExtractor={item => item.id}
            renderItem={renderListSection}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>No lists yet</Text>
                <Text style={styles.emptySubtext}>Save trails to lists from the trail detail page</Text>
              </View>
            }
          />
        )
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
    padding: SPACING.md,
    paddingTop: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    ...TYPOGRAPHY.heading,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  modeTabs: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  modeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
  },
  modeTabActive: {
    backgroundColor: COLORS.primary,
  },
  modeTabText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
  },
  modeTabTextActive: {
    color: COLORS.white,
  },
  search: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
  },
  actionBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
  },
  filterRow: {
    flexDirection: 'row',
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.xs,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  list: {
    padding: SPACING.md,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.textSecondary,
  },
  emptySubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  listSection: {
    marginBottom: SPACING.lg,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  listHeaderInfo: {
    flex: 1,
  },
  listName: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text,
  },
  listDesc: {
    ...TYPOGRAPHY.small,
    color: COLORS.textLight,
    marginTop: 2,
  },
  listCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  countBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
})
