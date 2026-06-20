import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Rect, Text as SvgText } from 'react-native-svg'
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { deleteTrailByHikeId } from '@/services/trailService'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import { COLORS, SPACING, TYPOGRAPHY } from '@/utils/theme'
import { formatDistance, formatDate } from '@/utils/formatting'
import { useAuthStore } from '@/store/authStore'
import type { HikeSummary } from '@/types/hike'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const STAMP_W = (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md) / 2
const STAMP_H = 120

const DIFFICULTY_RANK: Record<string, number> = {
  expert: 0, hard: 1, moderate: 2, easy: 3,
}

function effortDifficulty(elevationGain: number, distance: number): string {
  const effort = distance * (1 + elevationGain / 500)
  if (effort < 5) return 'easy'
  if (effort < 12) return 'moderate'
  if (effort < 25) return 'hard'
  return 'expert'
}

const difficultyConfig: Record<string, { color: string; label: string }> = {
  easy: { color: COLORS.trail.easy, label: 'Easy' },
  moderate: { color: COLORS.trail.moderate, label: 'Moderate' },
  hard: { color: COLORS.trail.hard, label: 'Hard' },
  expert: { color: COLORS.trail.expert, label: 'Expert' },
}

function borderWidth(elevationGain: number): number {
  if (elevationGain < 100) return 2
  if (elevationGain < 300) return 3.5
  if (elevationGain < 600) return 5
  if (elevationGain < 1000) return 6.5
  return 8
}

function PassportStamp({ hike, onDelete }: { hike: HikeSummary; onDelete: (id: string) => void }) {
  const diff = effortDifficulty(hike.elevationGain, hike.distance)
  const c = difficultyConfig[diff]
  const bw = borderWidth(hike.elevationGain)
  const pad = 8
  const w = STAMP_W - pad * 2
  const h = STAMP_H - pad * 2

  function handleLongPress() {
    Alert.alert(
      'Remove Stamp',
      `Delete "${hike.name}" from your passport?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(hike.id) },
      ],
    )
  }

  return (
    <TouchableOpacity style={styles.stampOuter} onLongPress={handleLongPress} activeOpacity={0.8}>
      <Svg width={STAMP_W} height={STAMP_H}>
        <Rect x={pad} y={pad} width={w} height={h} rx={4} ry={4}
          stroke={c.color} strokeWidth={bw} fill="none"
          strokeDasharray={bw > 4 ? '4,3' : '3,2'} />
        <Rect x={pad + 6} y={pad + 6} width={w - 12} height={h - 12} rx={2} ry={2}
          stroke={c.color} strokeWidth={0.5} fill={c.color} fillOpacity={0.06} />
        <SvgText x={STAMP_W / 2} y={pad + 18} textAnchor="middle" fontSize={11} fontWeight="700" fill={c.color}>
          {hike.name.length > 14 ? hike.name.slice(0, 13) + '…' : hike.name}
        </SvgText>
        <SvgText x={STAMP_W / 2} y={pad + 34} textAnchor="middle" fontSize={8} fill={c.color} opacity={0.6}>
          {formatDistance(hike.distance)}
        </SvgText>
        <SvgText x={STAMP_W / 2} y={pad + 47} textAnchor="middle" fontSize={8} fill={c.color} opacity={0.6}>
          +{hike.elevationGain}m gain
        </SvgText>
        <SvgText x={STAMP_W / 2} y={pad + 62} textAnchor="middle" fontSize={7} fill={c.color} opacity={0.5}>
          {formatDate(hike.startTime)}
        </SvgText>
      </Svg>
      <View style={[styles.stampBadge, { backgroundColor: c.color }]}>
        <Text style={styles.stampBadgeText}>{c.label}</Text>
      </View>
    </TouchableOpacity>
  )
}

export default function PassportScreen() {
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const [hikes, setHikes] = useState<HikeSummary[]>([])
  const [loading, setLoading] = useState(true)

  async function loadHikes() {
    try {
      if (!user) return
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
        const aDiff = effortDifficulty(a.elevationGain, a.distance)
        const bDiff = effortDifficulty(b.elevationGain, b.distance)
        const rankDiff = DIFFICULTY_RANK[aDiff] - DIFFICULTY_RANK[bDiff]
        if (rankDiff !== 0) return rankDiff
        const aTime = a.startTime instanceof Date ? a.startTime.getTime() : 0
        const bTime = b.startTime instanceof Date ? b.startTime.getTime() : 0
        return bTime - aTime
      })
      setHikes(list)
    } catch (err) {
      console.error('[Passport] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadHikes() }, [user])

  const handleDelete = useCallback(async (hikeId: string) => {
    try {
      await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.HIKES, hikeId))
      await deleteTrailByHikeId(hikeId)
      setHikes(prev => prev.filter(h => h.id !== hikeId))
    } catch (err) {
      console.error('[Passport] Delete error:', err)
      Alert.alert('Error', 'Failed to delete hike')
    }
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Trail Passport</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <View style={styles.emblemCircle}>
            <Ionicons name="compass-outline" size={28} color={COLORS.text} />
          </View>
          <Text style={styles.passportTitle}>TRAIL PASSPORT</Text>
          <Text style={styles.passportSub}>{user?.displayName || 'Hiker'}</Text>
          <View style={styles.stampCountRow}>
            <Text style={styles.stampCountLabel}>Stamps earned</Text>
            <Text style={styles.stampCountValue}>{hikes.length}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ paddingVertical: SPACING.xxl }} />
        ) : hikes.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No stamps yet</Text>
            <Text style={styles.emptySubtext}>Complete a hike to earn your first passport stamp!</Text>
          </View>
        ) : (
          <>
            <Text style={styles.hint}>Long-press a stamp to remove it</Text>
            <View style={styles.grid}>
              {hikes.map(h => <PassportStamp key={h.id} hike={h} onDelete={handleDelete} />)}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.sm,
    backgroundColor: '#F5F0E8',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
  },
  scroll: {
    padding: SPACING.lg,
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  emblemCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  passportTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
    color: COLORS.text,
  },
  passportSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  stampCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  stampCountLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  stampCountValue: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.primary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  hint: {
    ...TYPOGRAPHY.small,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  stampOuter: {
    width: STAMP_W,
    height: STAMP_H,
    position: 'relative',
  },
  stampBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  stampBadgeText: {
    fontSize: 8,
    color: COLORS.white,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
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
    textAlign: 'center',
  },
})
