import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image, Dimensions, KeyboardAvoidingView, Platform } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import MapView, { Marker, Polyline, LongPressEvent, MarkerDragStartEndEvent } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'
import { addWaypoint } from '@/services/waypointService'
import { getTrailById } from '@/services/trailService'
import { useAuthStore } from '@/store/authStore'
import Button from '@/components/Button'
import { WAYPOINT_TYPES, WAYPOINT_LABELS, WAYPOINT_ICONS } from '@/types/waypoint'
import type { WaypointType } from '@/types/waypoint'
import type { Trail } from '@/types/trail'

export default function AddWaypointScreen() {
  const { id: trailId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const mapRef = useRef<MapView>(null)
  const [trail, setTrail] = useState<Trail | null>(null)
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [type, setType] = useState<WaypointType>('info')
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')
  const [mediaUri, setMediaUri] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (trailId) {
      getTrailById(trailId).then(t => {
        setTrail(t)
      })
    }
  }, [trailId])

  useEffect(() => {
    if (trail && mapRef.current) {
      const coords = extractRouteCoords(trail.route)
      if (coords.length > 0) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 40, bottom: 80, left: 40 },
          animated: true,
        })
      } else {
        mapRef.current.animateToRegion({
          latitude: trail.location.lat,
          longitude: trail.location.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }, 500)
      }
    }
  }, [trail])

  const routeCoords = extractRouteCoords(trail?.route)

  function onMapLongPress(e: LongPressEvent) {
    const coord = e.nativeEvent.coordinate
    setLat(coord.latitude)
    setLng(coord.longitude)
  }

  function onMarkerDrag(e: MarkerDragStartEndEvent) {
    const coord = e.nativeEvent.coordinate
    setLat(coord.latitude)
    setLng(coord.longitude)
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    })
    if (!result.canceled) {
      setMediaUri(result.assets[0].uri)
    }
  }

  async function save() {
    if (lat === null || lng === null) {
      Alert.alert('Required', 'Tap the map to place a waypoint')
      return
    }
    if (!label.trim()) {
      Alert.alert('Required', 'Please enter a label')
      return
    }
    if (!user) return

    setSaving(true)
    try {
      await addWaypoint(trailId!, {
        lat,
        lng,
        type,
        label: label.trim(),
        note: note.trim() || undefined,
        addedBy: user.id,
        addedByName: user.displayName || 'Anonymous',
        mediaUri: mediaUri || undefined,
      })
      router.back()
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add waypoint')
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
      </TouchableOpacity>

      <View style={styles.mapSection}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: trail?.location.lat || 37.7749,
            longitude: trail?.location.lng || -119.4194,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onLongPress={onMapLongPress}
        >
          {routeCoords.length > 0 && (
            <Polyline coordinates={routeCoords} strokeColor={COLORS.primary} strokeWidth={3} />
          )}
          {lat !== null && lng !== null && (
            <Marker
              coordinate={{ latitude: lat, longitude: lng }}
              draggable
              onDragEnd={onMarkerDrag}
            />
          )}
        </MapView>
        {lat !== null && lng !== null ? (
          <View style={styles.coordsBadge}>
            <Ionicons name="location" size={14} color={COLORS.white} />
            <Text style={styles.coordsText}>{lat.toFixed(5)}, {lng.toFixed(5)}</Text>
          </View>
        ) : (
          <View style={styles.coordsBadge}>
            <Ionicons name="hand-left-outline" size={14} color={COLORS.white} />
            <Text style={styles.coordsText}>Long-press on the map to place a waypoint</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Type</Text>
        <View style={styles.typeGrid}>
          {WAYPOINT_TYPES.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.typeChip, type === t && styles.typeChipActive]}
              onPress={() => setType(t)}
            >
              <Ionicons
                name={WAYPOINT_ICONS[t] as any}
                size={18}
                color={type === t ? COLORS.white : COLORS.textSecondary}
              />
              <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>
                {WAYPOINT_LABELS[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Label *</Text>
        <TextInput
          style={styles.input}
          value={label}
          onChangeText={setLabel}
          placeholder="e.g. Hidden Spring"
          placeholderTextColor={COLORS.textLight}
        />

        <Text style={styles.label}>Note</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={note}
          onChangeText={setNote}
          placeholder="Optional notes about this point..."
          placeholderTextColor={COLORS.textLight}
          multiline
        />

        <Text style={styles.label}>Photo / Video</Text>
        {mediaUri ? (
          <View style={styles.mediaPreview}>
            <Image source={{ uri: mediaUri }} style={styles.mediaImage} />
            <TouchableOpacity style={styles.removeMedia} onPress={() => setMediaUri(null)}>
              <Ionicons name="close-circle" size={24} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addMediaBtn} onPress={pickImage}>
            <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
            <Text style={styles.addMediaText}>Add Photo</Text>
          </TouchableOpacity>
        )}

        <Button title="Save Waypoint" onPress={save} loading={saving} size="lg" style={styles.saveBtn} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function extractRouteCoords(route: any): { latitude: number; longitude: number }[] {
  if (!route?.points) return []
  try {
    return route.points.map((p: { lat: number; lng: number }) => ({
      latitude: p.lat,
      longitude: p.lng,
    }))
  } catch {
    return []
  }
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
  mapSection: {
    height: 260,
  },
  map: {
    flex: 1,
  },
  coordsBadge: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    alignSelf: 'flex-start',
  },
  coordsText: {
    ...TYPOGRAPHY.small,
    color: COLORS.white,
  },
  form: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  label: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeChipText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  typeChipTextActive: {
    color: COLORS.white,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  mediaPreview: {
    position: 'relative',
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: 180,
    borderRadius: BORDER_RADIUS.md,
  },
  removeMedia: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  addMediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  addMediaText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
  },
  saveBtn: {
    marginTop: SPACING.xl,
  },
})
