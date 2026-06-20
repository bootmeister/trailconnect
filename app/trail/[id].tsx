import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Alert, Dimensions, Switch, Image, Modal, FlatList, Platform } from 'react-native'
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Polyline, Polygon, Line, Text as SvgText } from 'react-native-svg'
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'
import Button from '@/components/Button'
import DifficultyBadge from '@/components/DifficultyBadge'
import { getTrailById, deleteTrail } from '@/services/trailService'
import { getReviews, addReview, type TrailReview } from '@/services/reviewService'
import { getWaypoints, deleteWaypoint, sortWaypointsByRoute } from '@/services/waypointService'
import { getFriendIds } from '@/services/friendService'
import { getLists, createList, addTrailToList, removeTrailFromList } from '@/services/listService'
import { useAuthStore } from '@/store/authStore'
import { useOfflineStore } from '@/store/offlineStore'
import { downloadTrail, removeDownloadedTrail, getOfflineTrail, getOfflineWaypoints } from '@/services/offlineService'
import { useTrailWeather } from '@/hooks/useTrailWeather'
import WeatherOverlay from '@/components/WeatherOverlay'
import type { TrailList } from '@/types/list'
import { formatDistance, formatElevation, formatDate, formatHikeDuration } from '@/utils/formatting'

const LNT_PRINCIPLES = [
  { icon: 'map-outline', title: 'Plan Ahead & Prepare', text: 'Know regulations, check weather, and pack appropriately.' },
  { icon: 'footsteps-outline', title: 'Travel & Camp on Durable Surfaces', text: 'Stay on trails and camp on designated sites.' },
  { icon: 'trash-outline', title: 'Dispose of Waste Properly', text: 'Pack it in, pack it out. Leave no trash behind.' },
  { icon: 'leaf-outline', title: 'Leave What You Find', text: 'Preserve the past — don\'t pick flowers or move rocks.' },
  { icon: 'flame-outline', title: 'Minimize Campfire Impacts', text: 'Use a camp stove instead of building a fire.' },
  { icon: 'paw-outline', title: 'Respect Wildlife', text: 'Observe from a distance and never feed animals.' },
  { icon: 'people-outline', title: 'Be Considerate of Others', text: 'Yield to others on the trail and keep noise down.' },
]
import { WAYPOINT_ICONS, WAYPOINT_LABELS } from '@/types/waypoint'
import type { Waypoint } from '@/types/waypoint'
import type { Trail } from '@/types/trail'

const CHART_HEIGHT = 150
const CHART_PADDING = 16

function ElevationChart({ route, elevationGain, elevationLoss }: { route?: { points: { ele: number }[] }; elevationGain: number; elevationLoss: number }) {
  if (!route?.points || route.points.length < 2) return null

  const elevations = route.points.map(p => p.ele)
  const minEle = Math.min(...elevations)
  const maxEle = Math.max(...elevations)
  const range = Math.max(maxEle - minEle, 1)

  const width = Dimensions.get('window').width - SPACING.md * 2
  const chartW = width - CHART_PADDING * 2
  const chartH = CHART_HEIGHT - CHART_PADDING * 2

  const points = elevations.map((ele, i) => {
    const x = CHART_PADDING + (i / (elevations.length - 1)) * chartW
    const y = CHART_PADDING + chartH - ((ele - minEle) / range) * chartH
    return `${x},${y}`
  })

  const areaPoints = `${CHART_PADDING},${CHART_PADDING + chartH} ${points.join(' ')} ${CHART_PADDING + chartW},${CHART_PADDING + chartH}`

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
        <Polyline points={points.join(' ')} fill="none" stroke={COLORS.primary} strokeWidth={2} />
      </Svg>
      <View style={styles.chartFooter}>
        <Text style={styles.chartLabel}>+{formatElevation(elevationGain)} gain</Text>
        <Text style={styles.chartLabel}>-{formatElevation(elevationLoss)} loss</Text>
      </View>
    </View>
  )
}

export default function TrailDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const [trail, setTrail] = useState<Trail | null>(null)
  const [reviews, setReviews] = useState<TrailReview[]>([])
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [loading, setLoading] = useState(true)
  const [showLnt, setShowLnt] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [friendIds, setFriendIds] = useState<string[]>([])
  const { weather } = useTrailWeather(trail?.location?.lat, trail?.location?.lng)
  const [showMyWaypoints, setShowMyWaypoints] = useState(false)
  const [showFriendsWaypoints, setShowFriendsWaypoints] = useState(false)
  const [showOtherWaypoints, setShowOtherWaypoints] = useState(false)
  const [lists, setLists] = useState<TrailList[]>([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [savingToList, setSavingToList] = useState(false)
  const [hikeTiming, setHikeTiming] = useState<{ duration: number; restedDuration: number } | null>(null)
  const isDownloaded = useOfflineStore(s => s.downloadedIds).includes(id!)
  const isDownloading = useOfflineStore(s => s.downloading)[id!] ?? false
  const downloadProgress = useOfflineStore(s => s.downloadProgress)[id!] ?? 0
  const isOnline = useOfflineStore(s => s.isOnline)

  useEffect(() => {
    if (user) {
      getFriendIds(user.id).then(setFriendIds)
      getLists(user.id).then(setLists)
    }
  }, [user])

  useFocusEffect(
    useCallback(() => {
      if (!id) return
      const isInitial = !trail
      if (isInitial) setLoading(true)
      Promise.all([
        getTrailById(id),
        getReviews(id),
        getWaypoints(id),
      ]).then(([trailData, reviewData, waypointData]) => {
        if (trailData) {
          setTrail(trailData)
          setReviews(reviewData)
          setWaypoints(sortWaypointsByRoute(waypointData, trailData?.route))
          if (trailData?.hikeId) {
            getDoc(doc(db, FIRESTORE_COLLECTIONS.HIKES, trailData.hikeId)).then(snap => {
              if (snap.exists()) {
                const d = snap.data()
                setHikeTiming({ duration: d.duration || 0, restedDuration: d.restedDuration || 0 })
              }
            }).catch(() => {})
          }
        } else {
          throw new Error('trail not found')
        }
      }).catch(async () => {
        const cached = await getOfflineTrail(id)
        if (cached) {
          setTrail(cached)
          const wp = await getOfflineWaypoints(id)
          setWaypoints(sortWaypointsByRoute(wp, cached?.route))
        }
      }).finally(() => {
        if (isInitial) setLoading(false)
      })
    }, [id])
  )

  async function submitReview() {
    if (!reviewText.trim() || !user || !id) return
    setSubmitting(true)
    try {
      await addReview(id, {
        userId: user.id,
        userName: user.displayName || 'Anonymous',
        userAvatar: user.avatarUrl,
        rating: reviewRating,
        text: reviewText.trim(),
      })
      const trailRef = doc(db, FIRESTORE_COLLECTIONS.TRAILS, id)
      await updateDoc(trailRef, {
        reviewCount: increment(1),
        rating: (trail!.rating * trail!.reviewCount + reviewRating) / (trail!.reviewCount + 1),
      })
      const updated = await getReviews(id)
      setReviews(updated)
      setShowReviewForm(false)
      setReviewText('')
      setReviewRating(5)
      Alert.alert('Review submitted', 'Thank you for your review!')
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  function confirmDelete() {
    Alert.alert('Delete Trail', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteTrail(id!)
          router.replace('/(tabs)/explore')
        } catch (err: any) {
          Alert.alert('Error', err?.message || 'Failed to delete trail')
        }
      }},
    ])
  }

  function handleProceedLnt() {
    setShowLnt(false)
    router.push({ pathname: '/trail-map/[id]', params: { id: trail!.id } })
  }

  function handleStarTap(pos: number) {
    setReviewRating(prev => {
      if (prev < pos) return pos
      if (prev === pos) return pos - 0.5
      if (prev === pos - 0.5) return pos - 1
      return pos
    })
  }

  function starIcon(rating: number, pos: number): 'star' | 'star-half' | 'star-outline' {
    if (pos <= Math.floor(rating)) return 'star'
    if (pos === Math.ceil(rating) && rating % 1 !== 0) return 'star-half'
    return 'star-outline'
  }

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

  function wpCategoryLabel(cat: 'official' | 'mine' | 'friend' | 'other'): string {
    return cat === 'official' ? 'Official'
      : cat === 'mine' ? 'Yours'
      : cat === 'friend' ? 'Friend'
      : 'Other'
  }

  const visibleWaypoints = trail
    ? waypoints.filter(wp => {
        const cat = wpCategory(wp)
        if (cat === 'official') return true
        if (!user) return false
        if (cat === 'mine') return showMyWaypoints
        if (cat === 'friend') return showFriendsWaypoints
        return showOtherWaypoints
      })
    : []

  function confirmDeleteWaypoint(wpId: string) {
    const wp = waypoints.find(w => w.id === wpId)
    if (!wp) return
    Alert.alert('Delete Waypoint', `Delete "${wp.label}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteWaypoint(id!, wpId, user!.id)
          setWaypoints(prev => prev.filter(w => w.id !== wpId))
        } catch (err: any) {
          Alert.alert('Error', err?.message || 'Failed to delete waypoint')
        }
      }},
    ])
  }

  const avgRating = trail && trail.reviewCount > 0
    ? ((trail.rating * trail.reviewCount + reviews.reduce((s, r) => s + r.rating, 0)) / (trail.reviewCount + reviews.length)).toFixed(1)
    : reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : trail?.rating.toFixed(1) || '0'

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

  const headerHeight = 140
  const weatherIcon: Record<string, string> = {
    Clear: 'sunny',
    Cloudy: 'cloudy',
    Fog: 'cloudy',
    Drizzle: 'rainy',
    Rain: 'rainy',
    Snow: 'snow',
    Thunderstorm: 'thunderstorm',
  }

  const handleDownload = async () => {
    if (!isOnline) {
      Alert.alert('No Connection', 'Connect to the internet to download a trail.')
      return
    }
    if (isDownloading) return
    useOfflineStore.getState().setDownloading(id!, true)
    useOfflineStore.getState().setProgress(id!, 0)
    try {
      await downloadTrail(id!, (pct) => {
        useOfflineStore.getState().setProgress(id!, pct)
      })
      useOfflineStore.getState().addDownloadedId(id!)
      Alert.alert('Download Complete', `"${trail.name}" is now available offline.`)
    } catch (err: any) {
      Alert.alert('Download Failed', err?.message || 'Could not download trail.')
    } finally {
      useOfflineStore.getState().setDownloading(id!, false)
    }
  }

  const handleRemoveDownload = async () => {
    Alert.alert('Remove Download', `Remove "${trail.name}" from your device?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeDownloadedTrail(id!)
          useOfflineStore.getState().removeDownloadedId(id!)
        },
      },
    ])
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.headerSection, { minHeight: headerHeight }]}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{trail.name}</Text>
            <View style={styles.badgesRow}>
              {weather && (
                <View style={styles.weatherPill}>
                  <Ionicons name={weatherIcon[weather.condition] as any || 'cloudy'} size={14} color={COLORS.textSecondary} />
                  <Text style={styles.weatherPillText}>{weather.temp}°</Text>
                </View>
              )}
              <DifficultyBadge difficulty={trail.difficulty} size="md" />
            </View>
          </View>
          <Text style={styles.address}>{trail.location.address}</Text>
          {weather && (
            <WeatherOverlay
              condition={weather.condition}
            />
          )}
        </View>

        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={14} color="white" />
            <Text style={styles.offlineBannerText}>Offline — showing cached data</Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="map-outline" size={20} color={COLORS.primary} />
            <Text style={styles.statValue}>{formatDistance(trail.distance)}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up-outline" size={20} color={COLORS.primary} />
            <Text style={styles.statValue}>+{formatElevation(trail.elevationGain)}</Text>
            <Text style={styles.statLabel}>Gain</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-down-outline" size={20} color={COLORS.primary} />
            <Text style={styles.statValue}>-{formatElevation(trail.elevationLoss ?? trail.elevationGain)}</Text>
            <Text style={styles.statLabel}>Loss</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star-outline" size={20} color={COLORS.primary} />
            <Text style={styles.statValue}>{avgRating}</Text>
            <Text style={styles.statLabel}>{reviews.length} rev{reviews.length === 1 ? '' : 's'}</Text>
          </View>
        </View>

        {hikeTiming && (
          <View style={styles.timingRow}>
            <View style={styles.timingCard}>
              <Ionicons name="time-outline" size={16} color={COLORS.primary} />
              <Text style={styles.timingValue}>{formatHikeDuration(Math.max(0, hikeTiming.duration - hikeTiming.restedDuration) / 60)}</Text>
              <Text style={styles.timingLabel}>Time Active</Text>
            </View>
            <View style={styles.timingCard}>
              <Ionicons name="alarm-outline" size={16} color={COLORS.primary} />
              <Text style={styles.timingValue}>{formatHikeDuration(hikeTiming.restedDuration / 60)}</Text>
              <Text style={styles.timingLabel}>Time Rested</Text>
            </View>
          </View>
        )}

        <ElevationChart route={trail.route} elevationGain={trail.elevationGain} elevationLoss={trail.elevationLoss ?? trail.elevationGain} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{trail.description}</Text>
        </View>

        {trail.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tags}>
              {trail.tags.map(tag => (
                <Text key={tag} style={styles.tag}>#{tag}</Text>
              ))}
            </View>
          </View>
        )}

        {trail.conditions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conditions</Text>
            <View style={[styles.conditionCard, { borderLeftColor: trail.conditions.status === 'open' ? COLORS.trail.easy : COLORS.trail.hard }]}>
              <Text style={styles.conditionStatus}>{trail.conditions.status.toUpperCase()}</Text>
              <Text style={styles.conditionDesc}>{trail.conditions.description}</Text>
            </View>
          </View>
        )}

        {weather && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weather at Trailhead</Text>
            <View style={styles.weatherRow}>
              <View style={styles.weatherItem}>
                <Ionicons name="thermometer-outline" size={18} color={weather.temp < 5 ? COLORS.info : COLORS.warning} />
                <Text style={styles.weatherValue}>{weather.temp}°C</Text>
                <Text style={styles.weatherLabel}>{weather.condition}</Text>
              </View>
              <View style={styles.weatherItem}>
                <Ionicons name="water-outline" size={18} color={COLORS.info} />
                <Text style={styles.weatherValue}>{weather.humidity}%</Text>
                <Text style={styles.weatherLabel}>Humidity</Text>
              </View>
              <View style={styles.weatherItem}>
                <Ionicons name="flag-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.weatherValue}>{weather.windSpeed} km/h</Text>
                <Text style={styles.weatherLabel}>Wind</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Waypoints ({waypoints.length})</Text>
            {user && (
              <TouchableOpacity onPress={() => router.push({ pathname: '/trail/add-waypoint/[id]', params: { id: trail.id } })}>
                <Text style={styles.addWaypointBtn}>+ Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {user && (
            <View style={styles.wpToggles}>
              <View style={styles.wpToggle}>
                <Text style={styles.wpToggleLabel}>My waypoints</Text>
                <Switch
                  value={showMyWaypoints}
                  onValueChange={setShowMyWaypoints}
                  trackColor={{ false: COLORS.border, true: COLORS.info + '80' }}
                  thumbColor={showMyWaypoints ? COLORS.info : COLORS.textLight}
                />
              </View>
              <View style={styles.wpToggle}>
                <Text style={styles.wpToggleLabel}>Friends</Text>
                <Switch
                  value={showFriendsWaypoints}
                  onValueChange={setShowFriendsWaypoints}
                  trackColor={{ false: COLORS.border, true: COLORS.secondary + '80' }}
                  thumbColor={showFriendsWaypoints ? COLORS.secondary : COLORS.textLight}
                />
              </View>
              <View style={styles.wpToggle}>
                <Text style={styles.wpToggleLabel}>Others</Text>
                <Switch
                  value={showOtherWaypoints}
                  onValueChange={setShowOtherWaypoints}
                  trackColor={{ false: COLORS.border, true: COLORS.textLight }}
                  thumbColor={showOtherWaypoints ? COLORS.textSecondary : COLORS.textLight}
                />
              </View>
            </View>
          )}

          {visibleWaypoints.length === 0 ? (
            <Text style={styles.noWaypoints}>No waypoints to show.</Text>
          ) : (
            visibleWaypoints.map(wp => {
              const cat = wpCategory(wp)
              const catColor = wpCategoryColor(cat)
              return (
                <View key={wp.id} style={[styles.waypointCard, { borderLeftColor: catColor, borderLeftWidth: 3 }]}>
                  <Ionicons name={WAYPOINT_ICONS[wp.type] as any} size={20} color={catColor} />
                  <View style={styles.waypointInfo}>
                    <View style={styles.waypointLabelRow}>
                      <Text style={styles.waypointLabel}>{wp.label}</Text>
                      <View style={[styles.wpCategoryBadge, { backgroundColor: catColor + '20' }]}>
                        <Text style={[styles.wpCategoryBadgeText, { color: catColor }]}>{wpCategoryLabel(cat)}</Text>
                      </View>
                    </View>
                    <Text style={styles.waypointType}>{WAYPOINT_LABELS[wp.type]}{wp.addedByName ? ` • ${wp.addedByName}` : ''}</Text>
                    {wp.note ? <Text style={styles.waypointNote}>{wp.note}</Text> : null}
                    {wp.mediaUrl && (
                      <Image source={{ uri: wp.mediaUrl }} style={styles.wpMedia} />
                    )}
                  </View>
                  {user?.id === wp.addedBy && (
                    <TouchableOpacity onPress={() => confirmDeleteWaypoint(wp.id)} style={styles.wpDeleteBtn}>
                      <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  )}
                </View>
              )
            })
          )}
        </View>

        <View style={styles.reviewsSection}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
            {user && !showReviewForm && (
              <TouchableOpacity onPress={() => setShowReviewForm(true)}>
                <Text style={styles.writeReviewBtn}>Write a Review</Text>
              </TouchableOpacity>
            )}
          </View>

          {showReviewForm && (
            <View style={styles.reviewForm}>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map(s => (
                  <TouchableOpacity key={s} onPress={() => handleStarTap(s)}>
                    <Ionicons
                      name={starIcon(reviewRating, s)}
                      size={28}
                      color={
                        s <= Math.floor(reviewRating) ? COLORS.accent :
                        s === Math.ceil(reviewRating) && reviewRating % 1 !== 0 ? COLORS.accent :
                        COLORS.textLight
                      }
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.reviewInput}
                value={reviewText}
                onChangeText={setReviewText}
                placeholder="Share your experience..."
                placeholderTextColor={COLORS.textLight}
                multiline
              />
              <View style={styles.reviewFormActions}>
                <Button title="Cancel" variant="ghost" onPress={() => setShowReviewForm(false)} />
                <Button
                  title="Submit"
                  onPress={submitReview}
                  loading={submitting}
                  disabled={!reviewText.trim()}
                />
              </View>
            </View>
          )}

          {reviews.length === 0 && !showReviewForm && (
            <Text style={styles.noReviews}>No reviews yet. Be the first!</Text>
          )}

          {reviews.map(review => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewerName}>{review.userName}</Text>
                <View style={styles.reviewStars}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Ionicons
                      key={s}
                      name={starIcon(review.rating, s)}
                      size={14}
                      color={
                        s <= Math.floor(review.rating) ? COLORS.accent :
                        s === Math.ceil(review.rating) && review.rating % 1 !== 0 ? COLORS.accent :
                        COLORS.textLight
                      }
                    />
                  ))}
                </View>
              </View>
              <Text style={styles.reviewText}>{review.text}</Text>
              <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionsSection}>
          <Button
            title="Start Route"
            onPress={() => setShowLnt(true)}
          />
          {user && (
            <Button
              title="Save to List"
              variant="outline"
              onPress={() => setShowSaveModal(true)}
            />
          )}
          <Button
            title={isDownloaded ? 'Remove Download' : isDownloading ? `Downloading ${downloadProgress}%` : 'Download Offline'}
            variant="outline"
            disabled={isDownloading}
            onPress={isDownloaded ? handleRemoveDownload : handleDownload}
          />
          {user?.id === trail.uploaderId && (
            <>
              <Button
                title={trail.isPrivate ? 'Make Public' : 'Make Private'}
                variant="outline"
                onPress={async () => {
                  try {
                    const ref = doc(db, FIRESTORE_COLLECTIONS.TRAILS, id!)
                    await updateDoc(ref, { isPrivate: !trail.isPrivate })
                    setTrail(prev => prev ? { ...prev, isPrivate: !prev.isPrivate } : null)
                  } catch (err: any) {
                    Alert.alert('Error', err?.message || 'Failed to update privacy')
                  }
                }}
              />
              <Button
                title="Delete Trail"
                variant="outline"
                style={styles.deleteBtn}
                onPress={confirmDelete}
              />
            </>
          )}
        </View>
      </ScrollView>

      <Modal visible={showSaveModal} transparent animationType="slide" onRequestClose={() => setShowSaveModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save to List</Text>

            <FlatList
              data={lists}
              keyExtractor={item => item.id}
              style={styles.listList}
              renderItem={({ item }) => {
                const saved = item.trailIds.includes(id!)
                return (
                  <TouchableOpacity
                    style={styles.listRow}
                    onPress={async () => {
                      setSavingToList(true)
                      try {
                        if (saved) {
                          await removeTrailFromList(user!.id, item.id, id!)
                        } else {
                          await addTrailToList(user!.id, item.id, id!)
                        }
                        const updated = await getLists(user!.id)
                        setLists(updated)
                      } catch (err: any) {
                        Alert.alert('Error', err?.message || 'Failed to update list')
                      } finally {
                        setSavingToList(false)
                      }
                    }}
                    disabled={savingToList}
                  >
                    <Ionicons
                      name={saved ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={saved ? COLORS.primary : COLORS.textLight}
                    />
                    <View style={styles.listRowInfo}>
                      <Text style={styles.listRowName}>{item.name}</Text>
                      {item.description ? <Text style={styles.listRowDesc}>{item.description}</Text> : null}
                    </View>
                    <Text style={styles.listRowCount}>{item.trailIds.length}</Text>
                  </TouchableOpacity>
                )
              }}
              ListEmptyComponent={
                <Text style={styles.listEmpty}>No lists yet. Create one below.</Text>
              }
            />

            <View style={styles.newListRow}>
              <TextInput
                style={styles.newListInput}
                value={newListName}
                onChangeText={setNewListName}
                placeholder="New list name..."
                placeholderTextColor={COLORS.textLight}
              />
              <TouchableOpacity
                style={styles.newListBtn}
                onPress={async () => {
                  if (!newListName.trim()) return
                  setSavingToList(true)
                  try {
                    const listId = await createList(user!.id, newListName.trim())
                    await addTrailToList(user!.id, listId, id!)
                    setNewListName('')
                    const updated = await getLists(user!.id)
                    setLists(updated)
                  } catch (err: any) {
                    Alert.alert('Error', err?.message || 'Failed to create list')
                  } finally {
                    setSavingToList(false)
                  }
                }}
                disabled={!newListName.trim() || savingToList}
              >
                <Ionicons name="add-circle" size={24} color={newListName.trim() ? COLORS.primary : COLORS.textLight} />
              </TouchableOpacity>
            </View>

            <Button title="Done" variant="ghost" onPress={() => setShowSaveModal(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={showLnt} transparent animationType="slide" onRequestClose={() => setShowLnt(false)}>
        <View style={styles.lntOverlay}>
          <View style={styles.lntContent}>
            <View style={styles.lntHeader}>
              <Ionicons name="leaf" size={28} color={COLORS.success} />
              <Text style={styles.lntTitle}>Leave No Trace</Text>
              <Text style={styles.lntSubtitle}>7 principles for responsible hiking</Text>
            </View>
            <ScrollView style={styles.lntBody} showsVerticalScrollIndicator={false}>
              {LNT_PRINCIPLES.map((p, i) => (
                <View key={i} style={styles.principleRow}>
                  <View style={styles.principleIcon}>
                    <Ionicons name={p.icon as any} size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.principleText}>
                    <Text style={styles.principleTitle}>{p.title}</Text>
                    <Text style={styles.principleDesc}>{p.text}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={styles.lntFooter}>
              <Button title="I Understand, Let's Go!" onPress={handleProceedLnt} size="lg" />
              <Button title="Not Now" variant="ghost" onPress={() => setShowLnt(false)} style={{ marginTop: SPACING.sm }} />
            </View>
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
  error: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.textSecondary,
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
    position: 'relative',
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  name: {
    ...TYPOGRAPHY.heading,
    flex: 1,
    marginRight: SPACING.sm,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  weatherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  weatherPillText: {
    ...TYPOGRAPHY.small,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  badgeText: {
    ...TYPOGRAPHY.small,
    color: COLORS.white,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  address: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.warning,
    paddingVertical: 4,
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  offlineBannerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
  timingRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  timingCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  timingValue: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text,
  },
  timingLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.textLight,
  },
  chartContainer: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
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
  section: {
    padding: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  description: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  tag: {
    ...TYPOGRAPHY.small,
    color: COLORS.primary,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  conditionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 4,
  },
  conditionStatus: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  conditionDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  weatherRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  weatherItem: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    gap: 4,
  },
  weatherValue: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text,
  },
  weatherLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.textLight,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  addWaypointBtn: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
  },
  noWaypoints: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    textAlign: 'center',
    marginVertical: SPACING.lg,
  },
  waypointCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  waypointInfo: {
    flex: 1,
  },
  waypointLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text,
  },
  waypointType: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  waypointNote: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
  },
  reviewsSection: {
    padding: SPACING.md,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  writeReviewBtn: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
  },
  reviewForm: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  starRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  reviewInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
  },
  reviewFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  noReviews: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    textAlign: 'center',
    marginVertical: SPACING.lg,
  },
  reviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  reviewerName: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  reviewDate: {
    ...TYPOGRAPHY.small,
    color: COLORS.textLight,
  },
  actionsSection: {
    padding: SPACING.md,
    paddingTop: 0,
    gap: SPACING.sm,
  },
  deleteBtn: {
    borderColor: COLORS.error,
  },
  wpToggles: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    flexWrap: 'wrap',
  },
  wpToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  wpToggleLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  waypointLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 2,
  },
  wpCategoryBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  wpCategoryBadgeText: {
    ...TYPOGRAPHY.small,
    fontWeight: '600',
    fontSize: 10,
  },
  wpMedia: {
    width: '100%',
    height: 140,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.sm,
  },
  wpDeleteBtn: {
    padding: SPACING.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '60%',
  },
  modalTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  listList: {
    maxHeight: 240,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listRowInfo: {
    flex: 1,
  },
  listRowName: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text,
  },
  listRowDesc: {
    ...TYPOGRAPHY.small,
    color: COLORS.textLight,
  },
  listRowCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  listEmpty: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    textAlign: 'center',
    marginVertical: SPACING.lg,
  },
  newListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginVertical: SPACING.md,
  },
  newListInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
  },
  newListBtn: {
    padding: SPACING.xs,
  },
  lntOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: COLORS.overlay,
  },
  lntContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xxl,
  },
  lntHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  lntTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  lntSubtitle: {
    ...TYPOGRAPHY.small,
    color: COLORS.textLight,
    marginTop: 2,
  },
  lntBody: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  principleRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  principleIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  principleText: {
    flex: 1,
  },
  principleTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  principleDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  lntFooter: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
  },
})
