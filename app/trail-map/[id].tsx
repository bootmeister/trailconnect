import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Switch, Image } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as FileSystem from 'expo-file-system/legacy'
import MapView, { Polyline, Marker, Callout, UrlTile } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'
import { getTrailById } from '@/services/trailService'
import { getWaypoints, sortWaypointsByRoute } from '@/services/waypointService'
import { getFriendIds } from '@/services/friendService'
import { useAuthStore } from '@/store/authStore'
import { useOfflineStore } from '@/store/offlineStore'
import { useHikeStore } from '@/store/hikeStore'
import { useLocationSharing } from '@/hooks/useLocationSharing'
import Button from '@/components/Button'
import Avatar from '@/components/Avatar'
import { WAYPOINT_ICONS, WAYPOINT_LABELS } from '@/types/waypoint'
import type { Trail } from '@/types/trail'
import type { Waypoint } from '@/types/waypoint'

export default function TrailRouteMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const mapRef = useRef<MapView>(null)
  const user = useAuthStore(s => s.user)
  const [trail, setTrail] = useState<Trail | null>(null)
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [loading, setLoading] = useState(true)
  const [friendIds, setFriendIds] = useState<string[]>([])
  const [showMyWaypoints, setShowMyWaypoints] = useState(false)
  const [showFriendsWaypoints, setShowFriendsWaypoints] = useState(false)
  const [showOtherWaypoints, setShowOtherWaypoints] = useState(false)
  const [showWpPanel, setShowWpPanel] = useState(false)
  const [elapsedStr, setElapsedStr] = useState('')
  const [walkedPath, setWalkedPath] = useState<{ latitude: number; longitude: number }[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionStartRef = useRef<number | null>(null)
  const accumulatedMsRef = useRef(0)
  const { liveLocations } = useHikeStore()
  const { permission, currentLocation, isTracking, startSharing, stopSharing, startWatchingFriends, stopWatchingFriends } = useLocationSharing()
  const isOnline = useOfflineStore(s => s.isOnline)
  const isTrailDownloaded = useOfflineStore(s => s.downloadedIds).includes(id!)
  const tileUrl = isTrailDownloaded && !isOnline
    ? `file://${FileSystem.documentDirectory}trails/${id}/tiles/{z}/{x}/{y}.png`
    : null

  useEffect(() => {
    if (id) {
      Promise.all([
        getTrailById(id),
        getWaypoints(id),
      ]).then(([t, wp]) => {
        setTrail(t)
        setWaypoints(sortWaypointsByRoute(wp, t?.route))
        setLoading(false)
      })
    }
  }, [id])

  useEffect(() => {
    if (user) {
      getFriendIds(user.id).then(setFriendIds)
    }
  }, [user])

  const coordinates = extractCoordinates(trail?.route)
  const hasCenteredRef = useRef(false)

  useEffect(() => {
    if (currentLocation && !loading && !hasCenteredRef.current) {
      hasCenteredRef.current = true
      mapRef.current?.animateToRegion({
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000)
    }
  }, [currentLocation, loading])

  useEffect(() => {
    startWatchingFriends()
    return () => stopWatchingFriends()
  }, [])

  useEffect(() => {
    if (isTracking) {
      if (!sessionStartRef.current) {
        sessionStartRef.current = Date.now()
      }
      tick()
      timerRef.current = setInterval(tick, 1000)
    } else {
      if (sessionStartRef.current) {
        accumulatedMsRef.current += Date.now() - sessionStartRef.current
        sessionStartRef.current = null
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }

    function tick() {
      const elapsed = accumulatedMsRef.current + (sessionStartRef.current ? Date.now() - sessionStartRef.current : 0)
      const secs = Math.floor(elapsed / 1000)
      const m = Math.floor(secs / 60)
      const s = secs % 60
      setElapsedStr(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
  }, [isTracking])

  useEffect(() => {
    if (currentLocation && isTracking) {
      const coord = { latitude: currentLocation.lat, longitude: currentLocation.lng }
      setWalkedPath(prev => {
        const last = prev[prev.length - 1]
        if (last && last.latitude === coord.latitude && last.longitude === coord.longitude) return prev
        return [...prev, coord]
      })
    }
  }, [currentLocation, isTracking])

  function wpCategory(wp: Waypoint): 'official' | 'mine' | 'friend' | 'other' {
    if (wp.addedBy === trail?.uploaderId) return 'official'
    if (user && wp.addedBy === user.id) return 'mine'
    if (user && friendIds.includes(wp.addedBy)) return 'friend'
    return 'other'
  }

  function wpCategoryColor(cat: 'official' | 'mine' | 'friend' | 'other'): string {
    return cat === 'official' ? COLORS.primary
      : cat === 'mine' ? COLORS.info
      : cat === 'friend' ? COLORS.secondary
      : COLORS.textLight
  }

  const visibleWaypoints = trail
    ? waypoints.filter((wp: Waypoint) => {
        const cat = wpCategory(wp)
        if (cat === 'official') return true
        if (!user) return false
        if (cat === 'mine') return showMyWaypoints
        if (cat === 'friend') return showFriendsWaypoints
        return showOtherWaypoints
      })
    : []

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (!trail) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Trail not found</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
      </TouchableOpacity>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: trail.location.lat,
          longitude: trail.location.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
        showsMyLocationButton
      >
        {coordinates.length > 0 && (
          <Polyline
            coordinates={coordinates}
            strokeColor={COLORS.primary}
            strokeWidth={4}
          />
        )}
        {walkedPath.length > 1 && (
          <Polyline
            coordinates={walkedPath}
            strokeColor={COLORS.secondary}
            strokeWidth={3}
          />
        )}
        {tileUrl && (
          <UrlTile
            urlTemplate={tileUrl}
            zIndex={-1}
            tileSize={256}
          />
        )}
        {visibleWaypoints.map(wp => {
          const cat = wpCategory(wp)
          const catColor = wpCategoryColor(cat)
          return (
            <Marker
              key={wp.id}
              coordinate={{ latitude: wp.lat, longitude: wp.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.waypointMarker, { backgroundColor: catColor }]}>
                <Ionicons name={(WAYPOINT_ICONS[wp.type] || 'location-outline') as any} size={16} color={COLORS.white} />
              </View>
              <Callout>
                <View style={styles.wpCallout}>
                  <Text style={styles.wpCalloutLabel}>{wp.label}</Text>
                  <Text style={styles.wpCalloutType}>{WAYPOINT_LABELS[wp.type]}{wp.addedByName ? ` — ${wp.addedByName}` : ''}</Text>
                  {wp.note ? <Text style={styles.wpCalloutNote}>{wp.note}</Text> : null}
                </View>
              </Callout>
            </Marker>
          )
        })}
        {Object.values(liveLocations).map(location => (
          <Marker
            key={location.userId}
            coordinate={{ latitude: location.lat, longitude: location.lng }}
          >
            <View style={styles.friendMarker}>
              {location.avatarUrl ? (
                <Image
                  source={{ uri: location.avatarUrl }}
                  style={styles.friendMarkerImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.friendMarkerFallback}>
                  <Text style={styles.friendMarkerInitials}>{(location.displayName || '?')[0].toUpperCase()}</Text>
                </View>
              )}
            </View>
            <Callout>
              <View style={styles.callout}>
                <Avatar uri={location.avatarUrl} name={location.displayName} size="sm" />
                <Text style={styles.calloutName}>{location.displayName || 'Friend'}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {!isOnline && isTrailDownloaded && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color="white" />
          <Text style={styles.offlineBannerText}>Offline — showing cached map</Text>
        </View>
      )}

      {(isTracking || elapsedStr) && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={14} color={COLORS.white} />
            <Text style={styles.statValue}>{elapsedStr || '00:00'}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.liveDot, isTracking && styles.liveDotActive]} />
            <Text style={styles.statValue}>{isTracking ? 'Live' : 'Paused'}</Text>
          </View>
        </View>
      )}

      <View style={styles.bottomSheet}>
        {user && (
          <>
            <TouchableOpacity style={styles.wpToggleBtn} onPress={() => setShowWpPanel(prev => !prev)}>
              <Ionicons name={showWpPanel ? 'chevron-down' : 'chevron-forward'} size={16} color={COLORS.textSecondary} />
              <Text style={styles.wpToggleBtnText}>Waypoints</Text>
              <View style={styles.wpBadge}>
                <Text style={styles.wpBadgeText}>{visibleWaypoints.length}</Text>
              </View>
            </TouchableOpacity>
            {showWpPanel && (
              <View style={styles.wpToggles}>
                <View style={styles.wpToggle}>
                  <View style={styles.wpToggleLabelRow}>
                    <View style={[styles.wpDot, { backgroundColor: COLORS.primary }]} />
                    <Text style={styles.wpToggleLabel}>Official</Text>
                  </View>
                  <Text style={styles.wpAlwaysOn}>always on</Text>
                </View>
                <View style={styles.wpToggle}>
                  <View style={styles.wpToggleLabelRow}>
                    <View style={[styles.wpDot, { backgroundColor: COLORS.info }]} />
                    <Text style={styles.wpToggleLabel}>My waypoints</Text>
                  </View>
                  <Switch
                    value={showMyWaypoints}
                    onValueChange={setShowMyWaypoints}
                    trackColor={{ false: COLORS.border, true: COLORS.info + '80' }}
                    thumbColor={showMyWaypoints ? COLORS.info : COLORS.textLight}
                    style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                  />
                </View>
                <View style={styles.wpToggle}>
                  <View style={styles.wpToggleLabelRow}>
                    <View style={[styles.wpDot, { backgroundColor: COLORS.secondary }]} />
                    <Text style={styles.wpToggleLabel}>Friends</Text>
                  </View>
                  <Switch
                    value={showFriendsWaypoints}
                    onValueChange={setShowFriendsWaypoints}
                    trackColor={{ false: COLORS.border, true: COLORS.secondary + '80' }}
                    thumbColor={showFriendsWaypoints ? COLORS.secondary : COLORS.textLight}
                    style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                  />
                </View>
                <View style={styles.wpToggle}>
                  <View style={styles.wpToggleLabelRow}>
                    <View style={[styles.wpDot, { backgroundColor: COLORS.textLight }]} />
                    <Text style={styles.wpToggleLabel}>Others</Text>
                  </View>
                  <Switch
                    value={showOtherWaypoints}
                    onValueChange={setShowOtherWaypoints}
                    trackColor={{ false: COLORS.border, true: COLORS.textLight }}
                    thumbColor={showOtherWaypoints ? COLORS.textSecondary : COLORS.textLight}
                    style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                  />
                </View>
              </View>
            )}
          </>
        )}

        <View style={styles.controls}>
          <Text style={styles.status}>
            {isTracking
              ? `Sharing • ${Object.keys(liveLocations).length} friend${Object.keys(liveLocations).length === 1 ? '' : 's'}`
              : 'Follow the route on the map'}
          </Text>
          <Button
            title={isTracking ? 'Stop' : 'Start'}
            variant={isTracking ? 'secondary' : 'primary'}
            size="sm"
            onPress={isTracking ? stopSharing : startSharing}
          />
        </View>
      </View>
    </View>
  )
}

function extractCoordinates(route: any): { latitude: number; longitude: number }[] {
  if (!route) return []
  try {
    if (route.type === 'LineString' && Array.isArray(route.points)) {
      return route.points.map((p: { lat: number; lng: number }) => ({
        latitude: p.lat,
        longitude: p.lng,
      }))
    }
  } catch {}
  return []
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
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
  statsBar: {
    position: 'absolute',
    top: 56,
    right: SPACING.md,
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    ...TYPOGRAPHY.small,
    color: COLORS.white,
    fontVariant: ['tabular-nums'],
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textLight,
  },
  liveDotActive: {
    backgroundColor: COLORS.success,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  error: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.textSecondary,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: SPACING.xl,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.lg,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  wpToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  wpToggleBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    flex: 1,
  },
  wpBadge: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  wpBadgeText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  wpToggles: {
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
  },
  wpToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wpToggleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  wpDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  wpToggleLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  wpAlwaysOn: {
    ...TYPOGRAPHY.small,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
    marginTop: SPACING.sm,
  },
  status: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    flex: 1,
    marginRight: SPACING.md,
  },
  callout: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 120,
  },
  calloutName: {
    ...TYPOGRAPHY.captionBold,
    marginLeft: SPACING.xs,
  },
  waypointMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  wpCallout: {
    minWidth: 140,
    padding: SPACING.xs,
  },
  wpCalloutLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text,
  },
  wpCalloutType: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  wpCalloutNote: {
    ...TYPOGRAPHY.small,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  friendMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: COLORS.white,
    overflow: 'hidden',
    backgroundColor: COLORS.primary,
  },
  friendMarkerImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  friendMarkerFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendMarkerInitials: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  offlineBanner: {
    position: 'absolute',
    top: 100,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.warning,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  offlineBannerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
})
