import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, Image } from 'react-native'
import MapView, { Marker, Callout } from 'react-native-maps'
import { COLORS, SPACING, TYPOGRAPHY } from '@/utils/theme'
import { useHikeStore } from '@/store/hikeStore'
import { useLocationSharing } from '@/hooks/useLocationSharing'
import Button from '@/components/Button'
import Avatar from '@/components/Avatar'

export default function MapScreen() {
  const { liveLocations } = useHikeStore()
  const { permission, currentLocation, isTracking, startSharing, stopSharing, startWatchingFriends, stopWatchingFriends } = useLocationSharing()
  const mapRef = useRef<MapView>(null)

  useEffect(() => {
    if (currentLocation) {
      mapRef.current?.animateToRegion({
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000)
    }
  }, [currentLocation])

  useEffect(() => {
    startWatchingFriends()
    return () => stopWatchingFriends()
  }, [])

  if (!permission?.granted) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Requesting location permission...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 37.7749,
          longitude: -119.4194,
          latitudeDelta: 50,
          longitudeDelta: 50,
        }}
        showsUserLocation
        showsMyLocationButton
      >
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

      <View style={styles.controls}>
        <Text style={styles.status}>
          {isTracking
            ? `Sharing • ${Object.keys(liveLocations).length} friend${Object.keys(liveLocations).length === 1 ? '' : 's'} visible`
            : 'Start sharing your location'}
        </Text>
        <Button
          title={isTracking ? 'Stop' : 'Start'}
          variant={isTracking ? 'secondary' : 'primary'}
          size="sm"
          onPress={isTracking ? stopSharing : startSharing}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  controls: {
    position: 'absolute',
    bottom: SPACING.xl,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.md,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  status: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
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
})