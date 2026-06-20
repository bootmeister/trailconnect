import { useState, useEffect, useRef } from 'react'
import * as Location from 'expo-location'
import { doc, setDoc, deleteDoc, onSnapshot, collection, query, where } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { FIRESTORE_COLLECTIONS, LOCATION_UPDATE_INTERVAL_MS } from '@/utils/constants'
import { useAuthStore } from '@/store/authStore'
import { useHikeStore } from '@/store/hikeStore'
import type { LiveLocation } from '@/types/hike'

export function useLocationSharing() {
  const { user } = useAuthStore()
  const { isTracking, setTracking, updateLiveLocation, clearLiveLocations } = useHikeStore()
  const [permission, setPermission] = useState<Location.LocationPermissionResponse | null>(null)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const watchRef = useRef<Location.LocationSubscription | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const friendUnsubRef = useRef<() => void | null>(null)

  useEffect(() => {
    requestPermission()
    return () => {
      stopSharing()
      stopWatchingFriends()
    }
  }, [])

  async function requestPermission() {
    try {
      const perm = await Location.requestForegroundPermissionsAsync()
      setPermission(perm)
    } catch (err) {
      console.error('[Location] Permission error:', err)
      setPermission({ granted: false } as Location.LocationPermissionResponse)
    }
  }

  function startSharing() {
    if (!user || !permission?.granted) return
    setTracking(true)

    ;(async () => {
      const watch = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10 },
        loc => {
          setCurrentLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude })
        }
      )
      watchRef.current = watch
    })()

    intervalRef.current = setInterval(async () => {
      if (!user) return
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        const locationData = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          timestamp: new Date(),
          userId: user.id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          isTracking: true,
        }
        await setDoc(doc(db, FIRESTORE_COLLECTIONS.LOCATION, user.id), locationData)
      } catch (err) {
        console.error('[Location] Failed to update location:', err)
      }
    }, LOCATION_UPDATE_INTERVAL_MS)
  }

  function stopSharing() {
    setTracking(false)
    watchRef.current?.remove()
    watchRef.current = null
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (user) {
      deleteDoc(doc(db, FIRESTORE_COLLECTIONS.LOCATION, user.id)).catch(() => {})
    }
  }

  function startWatchingFriends() {
    if (!user || friendUnsubRef.current) return
    const locationsRef = collection(db, FIRESTORE_COLLECTIONS.LOCATION)
    const q = query(locationsRef, where('isTracking', '==', true))

    friendUnsubRef.current = onSnapshot(q, snapshot => {
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data()
        if (data.userId !== user.id) {
          updateLiveLocation(data.userId, {
            userId: data.userId,
            lat: data.lat,
            lng: data.lng,
            timestamp: data.timestamp?.toDate?.() || data.timestamp,
            displayName: data.displayName,
            avatarUrl: data.avatarUrl,
          } as LiveLocation)
        }
      })
    })
  }

  function stopWatchingFriends() {
    friendUnsubRef.current?.()
    friendUnsubRef.current = null
    clearLiveLocations()
  }

  return {
    permission,
    currentLocation,
    isTracking,
    startSharing,
    stopSharing,
    startWatchingFriends,
    stopWatchingFriends,
    requestPermission,
  }
}
