import { useRef, useCallback, useEffect, useState } from 'react'
import * as Location from 'expo-location'
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import { useAuthStore } from '@/store/authStore'
import { useHikeStore } from '@/store/hikeStore'
import type { TrackPoint, Hike, HikeWaypoint } from '@/types/hike'

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

export function useHikeTracking() {
  const { user } = useAuthStore()
  const {
    isTracking,
    paused,
    activeHike,
    trackPoints,
    setTracking,
    setActiveHike,
    setPaused,
    setElapsedMs,
    addTrackPoint,
    addHikeWaypoint,
    resetTracking,
  } = useHikeStore()

  const [permission, setPermission] = useState<boolean>(false)
  const watchRef = useRef<Location.LocationSubscription | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pauseStartRef = useRef<number | null>(null)
  const totalPausedMsRef = useRef(0)
  const startTimeRef = useRef<number | null>(null)
  const hikeIdRef = useRef<string | null>(null)
  const stoppedRef = useRef(false)

  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      setPermission(status === 'granted')
    })()
    return () => {
      watchRef.current?.remove()
      watchRef.current = null
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (isTracking && !paused) {
      timerRef.current = setInterval(() => {
        if (startTimeRef.current !== null) {
          const now = Date.now()
          const elapsed = now - startTimeRef.current - totalPausedMsRef.current
          setElapsedMs(elapsed)
        }
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isTracking, paused])

  const startTracking = useCallback(async (name: string, trailId?: string) => {
    if (!user || !permission) return
    if (useHikeStore.getState().isTracking) return

    stoppedRef.current = false
    const now = Date.now()
    startTimeRef.current = now
    totalPausedMsRef.current = 0
    pauseStartRef.current = null

    const newHike: Omit<Hike, 'id'> = {
      userId: user.id,
      name,
      trailId,
      startTime: new Date(now),
      trackPoints: [],
      distance: 0,
      elevationGain: 0,
      elevationLoss: 0,
      maxElevation: 0,
      minElevation: 0,
      duration: 0,
      pausedDuration: 0,
      restedDuration: 0,
      waypoints: [],
      photos: [],
      isActive: true,
    }

    try {
      const firestoreData: Record<string, any> = {
        ...newHike,
        startTime: Timestamp.fromDate(new Date(now)),
      }
      if (!trailId) delete firestoreData.trailId
      const docRef = await addDoc(collection(db, FIRESTORE_COLLECTIONS.HIKES), firestoreData)
      hikeIdRef.current = docRef.id
      setActiveHike({ ...newHike, id: docRef.id })
    } catch (err) {
      console.error('[Hike] Failed to create hike doc:', err)
      return
    }

    setTracking(true)
    setPaused(false)
    setElapsedMs(0)

    const watch = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 5,
        timeInterval: 3000,
      },
      loc => {
        const pt: TrackPoint = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          ele: loc.coords.altitude,
          timestamp: loc.timestamp,
          speed: loc.coords.speed,
          heading: loc.coords.heading,
        }
        addTrackPoint(pt)
      }
    )
    watchRef.current = watch
  }, [user, permission])

  const pauseTracking = useCallback(() => {
    if (!isTracking || paused) return
    pauseStartRef.current = Date.now()
    watchRef.current?.remove()
    watchRef.current = null
    setPaused(true)
  }, [isTracking, paused])

  const resumeTracking = useCallback(async () => {
    if (!isTracking || !paused) return
    if (pauseStartRef.current !== null) {
      totalPausedMsRef.current += Date.now() - pauseStartRef.current
      pauseStartRef.current = null
    }
    setPaused(false)

    const watch = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 5,
        timeInterval: 3000,
      },
      loc => {
        const pt: TrackPoint = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          ele: loc.coords.altitude,
          timestamp: loc.timestamp,
          speed: loc.coords.speed,
          heading: loc.coords.heading,
        }
        addTrackPoint(pt)
      }
    )
    watchRef.current = watch
  }, [isTracking, paused])

  function calcRestedDuration(points: TrackPoint[], stationaryThresholdM = 10): number {
    let totalRestMs = 0
    for (let i = 1; i < points.length; i++) {
      const dist = haversine(points[i - 1], points[i])
      if (dist < stationaryThresholdM) {
        const dt = points[i].timestamp - points[i - 1].timestamp
        if (dt > 0 && dt < 60000) totalRestMs += dt
      }
    }
    return totalRestMs
  }

  function calcStats(points: TrackPoint[]) {
    let distance = 0
    let gain = 0
    let loss = 0
    let maxEle = -Infinity
    let minEle = Infinity

    for (let i = 1; i < points.length; i++) {
      distance += haversine(points[i - 1], points[i])
      if (points[i - 1].ele !== null && points[i].ele !== null) {
        const diff = points[i].ele! - points[i - 1].ele!
        if (diff > 0) gain += diff
        else loss += Math.abs(diff)
      }
    }
    for (const p of points) {
      if (p.ele !== null) {
        if (p.ele > maxEle) maxEle = p.ele
        if (p.ele < minEle) minEle = p.ele
      }
    }
    if (!isFinite(maxEle)) maxEle = 0
    if (!isFinite(minEle)) minEle = 0

    return { distance, elevationGain: gain, elevationLoss: loss, maxElevation: maxEle, minElevation: minEle }
  }

  const stopTracking = useCallback(async (): Promise<string | null> => {
    if (stoppedRef.current) {
      console.log('[Hike] stopTracking already called, returning')
      return null
    }
    stoppedRef.current = true

    watchRef.current?.remove()
    watchRef.current = null
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const hikeId = hikeIdRef.current
    if (!user || !hikeId) {
      console.log('[Hike] stopTracking: no user or hikeId', { user: !!user, hikeId: !!hikeId })
      resetTracking()
      hikeIdRef.current = null
      startTimeRef.current = null
      totalPausedMsRef.current = 0
      pauseStartRef.current = null
      return null
    }

    try {
      const state = useHikeStore.getState()
      const pts = state.trackPoints
      const elapsedMs = state.elapsedMs
      const waypoints = state.hikeWaypoints
      const stats = calcStats(pts)
      const restedDurationMs = calcRestedDuration(pts)

      const endTime = new Date()
      const updateData: Record<string, any> = {
        trackPoints: pts,
        distance: stats.distance,
        elevationGain: stats.elevationGain,
        elevationLoss: stats.elevationLoss,
        maxElevation: stats.maxElevation,
        minElevation: stats.minElevation,
        duration: Math.round(elapsedMs / 1000),
        pausedDuration: Math.round(totalPausedMsRef.current / 1000),
        restedDuration: Math.round(restedDurationMs / 1000),
        waypoints,
        endTime: Timestamp.fromDate(endTime),
        isActive: false,
      }

      await updateDoc(doc(db, FIRESTORE_COLLECTIONS.HIKES, hikeId), updateData)
    } catch (err) {
      console.error('[Hike] stopTracking error:', err)
    }

    resetTracking()
    hikeIdRef.current = null
    startTimeRef.current = null
    totalPausedMsRef.current = 0
    pauseStartRef.current = null

    return hikeId
  }, [user])

  const hikeWaypoints = useHikeStore(s => s.hikeWaypoints)

  return {
    permission,
    isTracking,
    paused,
    activeHike,
    trackPoints,
    hikeWaypoints,
    startTracking,
    pauseTracking,
    resumeTracking,
    stopTracking,
    addHikeWaypoint,
  }
}
