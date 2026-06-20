import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, Dimensions, TouchableOpacity, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import MapView, { Polyline, Marker } from 'react-native-maps'
import Svg, { Polyline as SvgPolyline, Polygon, Line, Text as SvgText } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import { doc, getDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'
import Button from '@/components/Button'
import { formatDistance, formatElevation, formatHikeDuration } from '@/utils/formatting'
import { deleteTrailByHikeId } from '@/services/trailService'
import { WAYPOINT_ICONS } from '@/types/waypoint'
import type { Hike, HikeWaypoint } from '@/types/hike'
import type { WaypointType } from '@/types/waypoint'

const CHART_HEIGHT = 150
const CHART_PADDING = 16

function ElevationChart({ trackPoints, elevationGain, elevationLoss }: { trackPoints: { ele: number | null }[]; elevationGain: number; elevationLoss: number }) {
  const elevations = trackPoints.map(p => p.ele ?? 0).filter(e => isFinite(e))
  if (elevations.length < 2) return null

  const minEle = Math.min(...elevations)
  const maxEle = Math.max(...elevations)
  const range = Math.max(maxEle - minEle, 1)

  const width = Dimensions.get('window').width - SPACING.md * 2
  const chartW = width - CHART_PADDING * 2
  const chartH = CHART_HEIGHT - CHART_PADDING * 2

  const pts = elevations.map((ele, i) => {
    const x = CHART_PADDING + (i / (elevations.length - 1)) * chartW
    const y = CHART_PADDING + chartH - ((ele - minEle) / range) * chartH
    return `${x},${y}`
  })

  const areaPoints = `${CHART_PADDING},${CHART_PADDING + chartH} ${pts.join(' ')} ${CHART_PADDING + chartW},${CHART_PADDING + chartH}`
  const yLabels = [minEle, minEle + range / 2, maxEle].map(v => Math.round(v))

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Elevation Profile</Text>
      <Svg width={width} height={CHART_HEIGHT}>
        {[0, 1, 2].map(i => {
          const y = CHART_PADDING + chartH - (i / 2) * chartH
          return (
            <React.Fragment key={i}>
              <Line x1={CHART_PADDING} y1={y} x2={CHART_PADDING + chartW} y2={y} stroke={COLORS.border} strokeWidth={1} />
              <SvgText x={CHART_PADDING - 4} y={y + 4} fill={COLORS.textLight} fontSize={10} textAnchor="end">
                {yLabels[i]}m
              </SvgText>
            </React.Fragment>
          )
        })}
        <Polygon points={areaPoints} fill={`${COLORS.primary}20`} />
        <SvgPolyline points={pts.join(' ')} fill="none" stroke={COLORS.primary} strokeWidth={2} />
      </Svg>
      <View style={styles.chartFooter}>
        <Text style={styles.chartLabel}>+{formatElevation(elevationGain)} gain</Text>
        <Text style={styles.chartLabel}>-{formatElevation(elevationLoss)} loss</Text>
      </View>
    </View>
  )
}

export default function HikeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [hike, setHike] = useState<Hike | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.HIKES, id))
        if (snap.exists()) {
          const data = snap.data()
          setHike({
            id: snap.id,
            ...data,
            startTime: data.startTime?.toDate?.() || data.startTime,
            endTime: data.endTime?.toDate?.() || data.endTime,
            photos: data.photos || [],
            trackPoints: data.trackPoints || [],
            waypoints: data.waypoints || [],
            pausedDuration: data.pausedDuration || 0,
            restedDuration: data.restedDuration || 0,
          } as Hike)
        }
      } catch (err) {
        console.error('[HikeDetail] Error:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (!hike) {
    return (
      <View style={styles.center}>
        <Ionicons name="sad-outline" size={48} color={COLORS.textLight} />
        <Text style={styles.notFound}>Hike not found</Text>
      </View>
    )
  }

  const coords = hike.trackPoints.map(p => ({ latitude: p.lat, longitude: p.lng }))
  const startDate = hike.startTime instanceof Date ? hike.startTime : new Date()
  const dateStr = startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  const timeStr = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  const pace = hike.distance > 0 && hike.duration > 0
    ? `${((hike.duration / 60) / (hike.distance / 1000)).toFixed(1)} min/km`
    : '--'

  function handleDelete() {
    Alert.alert('Delete Hike', 'This will also remove it from the explore tab. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.HIKES, id!))
          await deleteTrailByHikeId(id!)
          router.replace('/hikes')
        } catch (err) {
          console.error('[HikeDetail] Delete error:', err)
          Alert.alert('Error', 'Failed to delete hike')
        }
      }},
    ])
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerSection}>
          <Text style={styles.name}>{hike.name}</Text>
          <Text style={styles.date}>{dateStr} · {timeStr}</Text>
        </View>

        {coords.length > 1 && (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: coords[0].latitude,
                longitude: coords[0].longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Polyline coordinates={coords} strokeColor={COLORS.secondary} strokeWidth={3} />
              {hike.waypoints.map((wp, i) => (
                <Marker
                  key={i}
                  coordinate={{ latitude: wp.lat, longitude: wp.lng }}
                  title={wp.label}
                  pinColor={COLORS.secondaryLight}
                />
              ))}
            </MapView>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="map-outline" size={20} color={COLORS.primary} />
            <Text style={styles.statValue}>{formatDistance(hike.distance)}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up-outline" size={20} color={COLORS.primary} />
            <Text style={styles.statValue}>+{formatElevation(hike.elevationGain)}</Text>
            <Text style={styles.statLabel}>Gain</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-down-outline" size={20} color={COLORS.primary} />
            <Text style={styles.statValue}>-{formatElevation(hike.elevationLoss)}</Text>
            <Text style={styles.statLabel}>Loss</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
            <Text style={styles.statValue}>{formatHikeDuration(hike.duration / 60)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
        </View>

        <ElevationChart trackPoints={hike.trackPoints} elevationGain={hike.elevationGain} elevationLoss={hike.elevationLoss} />

        <View style={styles.detailCard}>
          <DetailRow label="Pace" value={pace} />
          <DetailRow label="Elevation Loss" value={formatElevation(hike.elevationLoss)} />
          <DetailRow label="Max Elevation" value={formatElevation(hike.maxElevation)} />
          <DetailRow label="Min Elevation" value={formatElevation(hike.minElevation)} />
          <DetailRow label="Time Active" value={formatHikeDuration(Math.max(0, hike.duration - hike.restedDuration) / 60)} />
          <DetailRow label="Time Rested" value={formatHikeDuration(hike.restedDuration / 60)} />
          <DetailRow label="Track Points" value={String(hike.trackPoints.length)} />
        </View>

        {hike.waypoints.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Waypoints ({hike.waypoints.length})</Text>
            {hike.waypoints.map((wp, i) => {
              const icon = WAYPOINT_ICONS[wp.type as WaypointType] || 'location-outline'
              return (
                <View key={i} style={styles.waypointItem}>
                  <View style={styles.waypointIcon}>
                    <Ionicons name={icon as any} size={18} color={COLORS.primary} />
                  </View>
                  <View style={styles.waypointInfo}>
                    <Text style={styles.waypointLabel}>{wp.label}</Text>
                    <Text style={styles.waypointCoord}>
                      {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {hike.photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos ({hike.photos.length})</Text>
            <View style={styles.photosGrid}>
              {hike.photos.map((photo, i) => (
                <Image key={i} source={{ uri: photo.uri }} style={styles.photo} />
              ))}
            </View>
          </View>
        )}

        <View style={styles.savedBanner}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
          <Text style={styles.savedBannerText}>Hike saved! Find it anytime under My Hikes.</Text>
        </View>

        <View style={styles.actionsSection}>
          <Button title="Share as Post" onPress={() => router.push({ pathname: '/post/create', params: { hikeId: id } })} />
          <Button title="View My Hikes" variant="outline" onPress={() => router.replace('/(tabs)/explore')} />
          <Button title="Delete Hike" variant="outline" onPress={handleDelete} style={styles.deleteBtn} />
        </View>
      </ScrollView>
    </View>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  back: {
    position: 'absolute',
    top: 56,
    left: SPACING.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  notFound: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginTop: SPACING.sm,
  },
  scroll: {
    paddingBottom: SPACING.xxl,
  },
  headerSection: {
    padding: SPACING.lg,
    paddingTop: 100,
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: BORDER_RADIUS.xl,
    borderBottomRightRadius: BORDER_RADIUS.xl,
  },
  name: {
    ...TYPOGRAPHY.heading,
    color: COLORS.text,
  },
  date: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  mapContainer: {
    height: 200,
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statValue: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
  },
  statLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.textLight,
  },
  chartContainer: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  chartTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  chartLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  detailCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  detailLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  detailValue: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text,
  },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    margin: SPACING.md,
    marginBottom: 0,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: BORDER_RADIUS.md,
  },
  savedBannerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
  },
  section: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  sectionTitle: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: SPACING.md,
  },
  waypointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  waypointIcon: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  waypointInfo: {
    flex: 1,
  },
  waypointLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text,
  },
  waypointCoord: {
    ...TYPOGRAPHY.small,
    color: COLORS.textLight,
    marginTop: 2,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  photo: {
    width: (Dimensions.get('window').width - SPACING.md * 2 - SPACING.sm * 2) / 3,
    height: (Dimensions.get('window').width - SPACING.md * 2 - SPACING.sm * 2) / 3,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
  },
  actionsSection: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  deleteBtn: {
    borderColor: COLORS.error,
  },
})
