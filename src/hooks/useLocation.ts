import { useCallback, useEffect, useState } from 'react'
import * as Location from 'expo-location'
import { useHikeStore } from '@/store/hikeStore'
import { LOCATION_UPDATE_INTERVAL_MS } from '@/utils/constants'

export function useLocation() {
  const { isTracking, activeHike, updateLiveLocation } = useHikeStore()
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null)
  const [permissionGranted, setPermissionGranted] = useState(false)

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      setPermissionGranted(status === 'granted')
    })()
  }, [])

  useEffect(() => {
    if (!permissionGranted) return

    const watchLocation = Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: LOCATION_UPDATE_INTERVAL_MS,
        distanceInterval: 10,
      },
      (location) => {
        setCurrentLocation(location)
        if (isTracking && activeHike) {
          updateLiveLocation(activeHike.userId, {
            userId: activeHike.userId,
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            timestamp: new Date(),
            hikeId: activeHike.id,
            speed: location.coords.speed ?? undefined,
            heading: location.coords.heading ?? undefined,
          })
        }
      }
    )

    return () => {
      watchLocation.then(w => w.remove())
    }
  }, [permissionGranted, isTracking, activeHike, updateLiveLocation])

  return { currentLocation, permissionGranted }
}
