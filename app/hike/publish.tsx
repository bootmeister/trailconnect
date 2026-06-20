import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Image } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { doc, getDoc, setDoc, collection } from 'firebase/firestore'
import * as Location from 'expo-location'
import { Ionicons } from '@expo/vector-icons'
import { db } from '@/services/firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import { gpxToRoute } from '@/services/gpxParser'
import { uploadMultipleImages } from '@/services/storage'
import { ensureMyHikesList, addTrailToList } from '@/services/listService'
import { useAuthStore } from '@/store/authStore'
import { useCamera } from '@/hooks/useCamera'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'
import Button from '@/components/Button'
import { formatDistance, formatElevation, formatHikeDuration } from '@/utils/formatting'

const difficulties = ['easy', 'moderate', 'hard', 'expert'] as const

export default function PublishHikeScreen() {
  const { hikeId } = useLocalSearchParams<{ hikeId: string }>()
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const { pickImages } = useCamera()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<string>('moderate')
  const [tags, setTags] = useState('')
  const [photos, setPhotos] = useState<string[]>([])

  const [hikeName, setHikeName] = useState('')
  const [trackPoints, setTrackPoints] = useState<any[]>([])
  const [distance, setDistance] = useState(0)
  const [elevationGain, setElevationGain] = useState(0)
  const [elevationLoss, setElevationLoss] = useState(0)
  const [duration, setDuration] = useState(0)
  const [maxElevation, setMaxElevation] = useState(0)
  const [minElevation, setMinElevation] = useState(0)

  useEffect(() => {
    if (!hikeId) return
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.HIKES, hikeId))
        if (!snap.exists()) {
          Alert.alert('Error', 'Hike not found')
          router.back()
          return
        }
        const data = snap.data()
        const pts = data.trackPoints || []
        setHikeName(data.name || 'Unnamed Hike')
        setName(data.name || 'Unnamed Hike')
        setTrackPoints(pts)
        setDistance(data.distance || 0)
        setElevationGain(data.elevationGain || 0)
        setElevationLoss(data.elevationLoss || 0)
        setDuration(data.duration || 0)
        setMaxElevation(data.maxElevation || 0)
        setMinElevation(data.minElevation || 0)
        setDescription(`Recorded hike: ${(data.distance / 1000).toFixed(1)} km, ${Math.round(data.duration / 60)} min`)
      } catch {
        Alert.alert('Error', 'Failed to load hike data')
        router.back()
      } finally {
        setLoading(false)
      }
    })()
  }, [hikeId])

  async function addPhotos() {
    const uris = await pickImages(10 - photos.length)
    setPhotos(prev => [...prev, ...uris])
  }

  async function publish() {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a trail name')
      return
    }
    if (!user) return
    setSaving(true)

    try {
      let imageUrls: string[] = []
      if (photos.length > 0) {
        imageUrls = await uploadMultipleImages(user.id, photos, 'trails')
      }

      const validPoints = trackPoints.filter(p => isFinite(p.lat) && isFinite(p.lng))
      const center = validPoints.length > 0
        ? {
            lat: validPoints.reduce((s: number, p: any) => s + p.lat, 0) / validPoints.length,
            lng: validPoints.reduce((s: number, p: any) => s + p.lng, 0) / validPoints.length,
          }
        : { lat: 0, lng: 0 }

      let address = `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude: center.lat, longitude: center.lng })
        if (geo?.[0]) {
          address = [geo[0].street, geo[0].city, geo[0].region].filter(Boolean).join(', ') || address
        }
      } catch {}

      const trailRef = doc(collection(db, FIRESTORE_COLLECTIONS.TRAILS))
      const trailData: Record<string, any> = {
        name: name.trim(),
        description: description.trim(),
        location: { lat: center.lat, lng: center.lng, address },
        difficulty,
        distance,
        elevationGain,
        elevationLoss,
        maxElevation,
        minElevation,
        uploaderId: user.id,
        hikeId,
        isPrivate: false,
        rating: 0,
        reviewCount: 0,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        conditions: null,
        photos: imageUrls,
      }
      if (validPoints.length > 1) {
        trailData.route = gpxToRoute(validPoints)
      }
      await setDoc(trailRef, trailData)

      const listId = await ensureMyHikesList(user.id)
      await addTrailToList(user.id, listId, trailRef.id)

      router.replace({ pathname: '/trail/[id]', params: { id: trailRef.id } })
    } catch (err: any) {
      Alert.alert('Save Error', err?.message || 'Failed to publish trail')
      console.error('[PublishHike]', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (saving) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.savingText}>Publishing trail...</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>Publish Hike as Trail</Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatDistance(distance)}</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>+{formatElevation(elevationGain)}</Text>
                <Text style={styles.statLabel}>Gain</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>-{formatElevation(elevationLoss)}</Text>
                <Text style={styles.statLabel}>Loss</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatHikeDuration(duration / 60)}</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
            </View>

            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Trail name"
              placeholderTextColor={COLORS.textLight}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the trail..."
              placeholderTextColor={COLORS.textLight}
              multiline
            />

            <Text style={styles.label}>Difficulty</Text>
            <View style={styles.difficultyRow}>
              {difficulties.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.difficultyChip, difficulty === d && styles.difficultyChipActive]}
                  onPress={() => setDifficulty(d)}
                >
                  <Text style={[styles.difficultyText, difficulty === d && styles.difficultyTextActive]}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Tags (comma separated)</Text>
            <TextInput
              style={styles.input}
              value={tags}
              onChangeText={setTags}
              placeholder="e.g. mountains, views, forest"
              placeholderTextColor={COLORS.textLight}
            />

            <Text style={styles.label}>Photos</Text>
            <View style={styles.photosRow}>
              {photos.map((uri, i) => (
                <View key={i} style={styles.photoContainer}>
                  <Image source={{ uri }} style={styles.photoThumb} />
                  <TouchableOpacity
                    style={styles.removePhoto}
                    onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                  >
                    <Ionicons name="close-circle" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 10 && (
                <TouchableOpacity style={styles.addPhotoBtn} onPress={addPhotos}>
                  <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.addPhotoText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>

            <Button title="Publish Trail" onPress={publish} size="lg" style={styles.publishBtn} />
            <Button title="Save as Draft" variant="ghost" onPress={() => router.replace({ pathname: '/hike/[id]', params: { id: hikeId } })} style={{ marginBottom: SPACING.xxl }} />
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, gap: SPACING.md },
  savingText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  back: {
    position: 'absolute', top: 56, left: SPACING.md, zIndex: 10,
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  scroll: { padding: SPACING.md, paddingTop: 100 },
  heading: { ...TYPOGRAPHY.heading, color: COLORS.text, marginBottom: SPACING.lg },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  statBox: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, alignItems: 'center',
  },
  statValue: { ...TYPOGRAPHY.subheading, color: COLORS.text },
  statLabel: { ...TYPOGRAPHY.small, color: COLORS.textLight },
  label: { ...TYPOGRAPHY.captionBold, color: COLORS.text, marginBottom: SPACING.xs, marginTop: SPACING.md },
  input: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
    fontSize: 16, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  difficultyRow: { flexDirection: 'row', gap: SPACING.xs },
  difficultyChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1, borderColor: COLORS.border,
  },
  difficultyChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  difficultyText: { ...TYPOGRAPHY.small, color: COLORS.textSecondary },
  difficultyTextActive: { color: COLORS.white },
  photosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  photoContainer: { width: 80, height: 80, borderRadius: BORDER_RADIUS.md, overflow: 'hidden' },
  photoThumb: { width: '100%', height: '100%' },
  removePhoto: { position: 'absolute', top: 2, right: 2 },
  addPhotoBtn: {
    width: 80, height: 80, borderRadius: BORDER_RADIUS.md, borderWidth: 2,
    borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center',
    justifyContent: 'center', backgroundColor: COLORS.surfaceAlt,
  },
  addPhotoText: { ...TYPOGRAPHY.small, color: COLORS.primary, marginTop: 2 },
  publishBtn: { marginTop: SPACING.xl },
})
