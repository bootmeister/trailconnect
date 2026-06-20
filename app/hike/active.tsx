import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as Location from 'expo-location'
import MapView, { Polyline, Marker } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'
import { useHikeTracking } from '@/hooks/useHikeTracking'
import { useHikeStore } from '@/store/hikeStore'
import { formatDistance, formatElevation } from '@/utils/formatting'
import { WAYPOINT_ICONS, WAYPOINT_LABELS, WAYPOINT_TYPES } from '@/types/waypoint'
import type { WaypointType } from '@/types/waypoint'
import type { HikeWaypoint } from '@/types/hike'

const MIN_PACE_DISTANCE_M = 20
const MAX_REASONABLE_PACE = 30

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export default function ActiveHikeScreen() {
  const router = useRouter()
  const { name, trailId } = useLocalSearchParams<{ name: string; trailId?: string }>()
  const {
    permission,
    paused,
    startTracking,
    pauseTracking,
    resumeTracking,
    stopTracking,
    addHikeWaypoint,
    hikeWaypoints,
  } = useHikeTracking()
const trackPoints = useHikeStore(s => s.trackPoints)
const elapsedMs = useHikeStore(s => s.elapsedMs)
const resetTracking = useHikeStore(s => s.resetTracking)
  const mapRef = useRef<MapView>(null)
  const [started, setStarted] = useState(false)
  const [initialRegion, setInitialRegion] = useState<{
    latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number
  } | null>(null)
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [pendingWaypoint, setPendingWaypoint] = useState<{ lat: number; lng: number } | null>(null)
  const [showHint, setShowHint] = useState(true)

  useEffect(() => {
    (async () => {
      if (permission) {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          setInitialRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          })
        } catch { }
      }
    })()
  }, [permission])

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (name && permission && !started) {
      startTracking(name, trailId)
      setStarted(true)
    }
  }, [name, permission])

  // force-reset store on unmount in case stopTracking didn't run
  useEffect(() => {
    return () => {
      resetTracking()
    }
  }, [])

  const elapsedSeconds = Math.floor(elapsedMs / 1000)
  const hours = Math.floor(elapsedSeconds / 3600)
  const minutes = Math.floor((elapsedSeconds % 3600) / 60)
  const seconds = elapsedSeconds % 60
  const timeStr =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  let distance = 0
  if (trackPoints.length > 1) {
    for (let i = 1; i < trackPoints.length; i++) {
      distance += haversine(trackPoints[i - 1], trackPoints[i])
    }
  }

  let pace: number | null = null
  if (distance >= MIN_PACE_DISTANCE_M && elapsedSeconds > 30) {
    const distanceKm = distance / 1000
    const raw = (elapsedSeconds / 60) / distanceKm
    if (isFinite(raw) && raw <= MAX_REASONABLE_PACE) {
      pace = raw
    }
  }

  function formatPace(minPerKm: number): string {
    const m = Math.floor(minPerKm)
    const s = Math.round((minPerKm - m) * 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  async function handlePauseResume() {
    if (paused) await resumeTracking()
    else pauseTracking()
  }

  function handleStop() {
    Alert.alert('End Hike', 'Finish recording and save this hike?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save & End',
        style: 'destructive',
        onPress: async () => {
          try {
            const savedHikeId = await stopTracking()
            if (savedHikeId) {
              router.replace(`/hike/publish?hikeId=${savedHikeId}`)
            } else {
              console.log('[Active] stopTracking returned null, going back')
              router.back()
            }
          } catch (err) {
            console.error('[Active] stopTracking error:', err)
            Alert.alert('Error', 'Failed to save hike. Please try again.')
          }
        },
      },
    ])
  }

  function commitWaypoint(type: WaypointType) {
    if (!pendingWaypoint) return
    const lastPt = trackPoints.length > 0 ? trackPoints[trackPoints.length - 1] : null
    addHikeWaypoint({
      lat: pendingWaypoint.lat,
      lng: pendingWaypoint.lng,
      ele: lastPt?.ele ?? null,
      timestamp: Date.now(),
      type,
      label: WAYPOINT_LABELS[type],
    })
    setPendingWaypoint(null)
    setShowTypePicker(false)
  }

  function addWaypointAtCurrentLocation() {
    if (trackPoints.length === 0) return
    const last = trackPoints[trackPoints.length - 1]
    setPendingWaypoint({ lat: last.lat, lng: last.lng })
    setShowTypePicker(true)
  }

  function onMapLongPress(e: any) {
    const { coordinate } = e.nativeEvent
    setPendingWaypoint({ lat: coordinate.latitude, lng: coordinate.longitude })
    setShowTypePicker(true)
  }

  const coords = trackPoints.map(p => ({ latitude: p.lat, longitude: p.lng }))
  const wpIcon = (t: WaypointType) => WAYPOINT_ICONS[t] as keyof typeof Ionicons.glyphMap

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.timer} numberOfLines={1}>{timeStr}</Text>
        <Text style={styles.hikeName} numberOfLines={1}>{name}</Text>
      </View>

      <View style={styles.mapContainer}>
        {showHint && (
          <View style={styles.mapHint}>
            <Ionicons name="hand-left-outline" size={14} color={COLORS.primary} />
            <Text style={styles.mapHintText}>Long-press the map to add a waypoint</Text>
          </View>
        )}
        {permission && initialRegion ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            showsUserLocation
            followsUserLocation
            onLongPress={!paused ? onMapLongPress : undefined}
          >
            {coords.length > 1 && (
              <Polyline coordinates={coords} strokeColor={COLORS.secondary} strokeWidth={4} />
            )}
            {trackPoints.length > 0 && (
              <Marker
                coordinate={{ latitude: trackPoints[0].lat, longitude: trackPoints[0].lng }}
                title="Start"
                pinColor={COLORS.accent}
              />
            )}
            {hikeWaypoints.map((wp, i) => (
              <Marker
                key={i}
                coordinate={{ latitude: wp.lat, longitude: wp.lng }}
                title={wp.label}
                description={wp.type}
                pinColor={COLORS.secondary}
              />
            ))}
            {pendingWaypoint && (
              <Marker
                coordinate={{ latitude: pendingWaypoint.lat, longitude: pendingWaypoint.lng }}
                title="New waypoint"
                pinColor={COLORS.secondaryLight}
              />
            )}
          </MapView>
        ) : (
          <View style={styles.noPermission}>
            <Ionicons name="location-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.noPermissionText}>Getting location...</Text>
          </View>
        )}
      </View>

      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Ionicons name="resize-outline" size={20} color={COLORS.secondary} />
          <Text style={styles.statValue}>{formatDistance(distance)}</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Ionicons name="speedometer-outline" size={20} color={COLORS.secondary} />
          <Text style={styles.statValue}>{pace !== null ? formatPace(pace) : '--'}</Text>
          <Text style={styles.statLabel}>Pace</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Ionicons name="trending-up-outline" size={20} color={COLORS.secondary} />
          <Text style={styles.statValue}>
            {trackPoints.length > 0 && trackPoints[trackPoints.length - 1].ele !== null
              ? formatElevation(trackPoints[trackPoints.length - 1].ele!)
              : '--'}
          </Text>
          <Text style={styles.statLabel}>Elevation</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, styles.waypointBtn]}
          onPress={addWaypointAtCurrentLocation}
        >
          <Ionicons name="flag-outline" size={26} color={COLORS.white} />
          <Text style={styles.controlLabel}>Waypoint</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, paused ? styles.resumeBtn : styles.pauseBtn]}
          onPress={handlePauseResume}
        >
          <Ionicons
            name={paused ? 'play' : 'pause'}
            size={32}
            color={COLORS.white}
          />
          <Text style={styles.controlLabel}>{paused ? 'Resume' : 'Pause'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.controlBtn, styles.stopBtn]} onPress={handleStop}>
          <Ionicons name="stop" size={32} color={COLORS.white} />
          <Text style={styles.controlLabel}>End</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showTypePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Mark Waypoint</Text>
            <ScrollView style={styles.typeList}>
              {WAYPOINT_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={styles.typeItem}
                  onPress={() => commitWaypoint(type)}
                >
                  <View style={styles.typeIconWrap}>
                    <Ionicons name={wpIcon(type) as any} size={22} color={COLORS.primary} />
                  </View>
                  <Text style={styles.typeLabel}>{WAYPOINT_LABELS[type]}</Text>
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => { setPendingWaypoint(null); setShowTypePicker(false) }}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  timer: {
    ...TYPOGRAPHY.heading,
    color: COLORS.primary,
    fontVariant: ['tabular-nums'],
  },
  hikeName: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    flex: 1,
    textAlign: 'right',
    marginLeft: SPACING.md,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapHint: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    zIndex: 10,
    elevation: 10,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  mapHintText: {
    ...TYPOGRAPHY.small,
    color: COLORS.primary,
  },
  noPermission: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
  },
  noPermissionText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginTop: SPACING.sm,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  statValue: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  statLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  controlBtn: {
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waypointBtn: {
    backgroundColor: COLORS.secondary,
  },
  pauseBtn: {
    backgroundColor: COLORS.warning,
  },
  resumeBtn: {
    backgroundColor: COLORS.success,
  },
  stopBtn: {
    backgroundColor: COLORS.error,
  },
  controlLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.white,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: COLORS.overlay,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingBottom: SPACING.xxl,
    maxHeight: '70%',
  },
  modalTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  typeList: {
    paddingHorizontal: SPACING.md,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  typeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  typeLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
  },
  modalCancel: {
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  modalCancelText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textSecondary,
  },
})
