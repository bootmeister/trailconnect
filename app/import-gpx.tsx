import React, { useState, useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Image } from 'react-native'
import { useRouter } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { Ionicons } from '@expo/vector-icons'
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import { useAuthStore } from '@/store/authStore'
import { useCamera } from '@/hooks/useCamera'
import { uploadMultipleImages } from '@/services/storage'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'
import { parseGpx, gpxToRoute } from '@/services/gpxParser'
import Button from '@/components/Button'

const difficulties = ['easy', 'moderate', 'hard', 'expert'] as const

export default function ImportGpxScreen() {
  const router = useRouter()
  const [step, setStep] = useState<'pick' | 'form' | 'saving'>('pick')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<string>('moderate')
  const [tags, setTags] = useState('')
  const [points, setPoints] = useState<{ lat: number; lng: number; ele?: number }[]>([])
  const [parsedName, setParsedName] = useState('')
  const [distance, setDistance] = useState(0)
  const [elevationGain, setElevationGain] = useState(0)
  const [elevationLoss, setElevationLoss] = useState(0)
  const [photos, setPhotos] = useState<string[]>([])
  const currentUser = useAuthStore(s => s.user)
  const { pickImages } = useCamera()
  const scrollRef = useRef<ScrollView>(null)

  async function pickGpx() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      })

      if (result.canceled) return

      const file = result.assets[0]
      if (!file.name?.toLowerCase().endsWith('.gpx')) {
        Alert.alert('Invalid file', 'Please select a .gpx file')
        return
      }

      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      })

      const track = parseGpx(content)
      if (track.points.length < 2) {
        Alert.alert('No track data', 'Could not find track points in this GPX file')
        return
      }

      setPoints(track.points)
      setParsedName(track.name)
      setName(track.name)
      setDistance(track.distance)
      setElevationGain(track.elevationGain)
      setElevationLoss(track.elevationLoss)
      console.log('[ImportGPX] points:', track.points.length, 'gain:', track.elevationGain, 'loss:', track.elevationLoss, 'first 3 ele:', track.points.slice(0, 3).map(p => p.ele), 'last 3 ele:', track.points.slice(-3).map(p => p.ele))

      const center = getCenter(track.points)
      const address = `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`

      setDescription(`Imported from GPX: ${track.points.length} track points, ${(track.distance / 1000).toFixed(1)} km`)

      setStep('form')
    } catch (err) {
      Alert.alert('Error', 'Failed to read GPX file')
      console.error('[ImportGPX]', err)
    }
  }

  async function saveTrail() {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a trail name')
      return
    }

    setStep('saving')

    const validPoints = points.filter(p => isFinite(p.lat) && isFinite(p.lng))
    if (validPoints.length < 2) {
      Alert.alert('Error', 'GPX file must contain at least 2 valid track points')
      setStep('form')
      return
    }

    try {
      let imageUrls: string[] = []
      if (photos.length > 0 && currentUser) {
        imageUrls = await uploadMultipleImages(currentUser.id, photos, 'trails')
      }

      const trailRef = doc(collection(db, FIRESTORE_COLLECTIONS.TRAILS))
      const center = getCenter(validPoints)

      await setDoc(trailRef, {
        name: name.trim(),
        description: description.trim() || `Imported GPX trail with ${validPoints.length} track points`,
        location: {
          lat: center.lat,
          lng: center.lng,
          address: `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`,
        },
        difficulty,
        distance,
        elevationGain,
        elevationLoss,
        uploaderId: currentUser?.id || null,
        rating: 0,
        reviewCount: 0,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        conditions: null,
        route: gpxToRoute(validPoints),
        photos: imageUrls,
        createdAt: serverTimestamp(),
      })

      router.replace({ pathname: '/trail/[id]', params: { id: trailRef.id } })
    } catch (err: any) {
      const msg = err?.message || err?.code || String(err)
      Alert.alert('Save Error', msg)
      console.error('[ImportGPX] save error:', err)
      setStep('form')
    }
  }

  if (step === 'pick') {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.center}>
          <Ionicons name="cloud-upload-outline" size={64} color={COLORS.primary} />
          <Text style={styles.uploadTitle}>Import GPX Trail</Text>
          <Text style={styles.uploadSubtitle}>Select a .gpx file recorded from your hike</Text>
          <Button title="Pick GPX File" onPress={pickGpx} size="lg" />
        </View>
      </View>
    )
  }

  if (step === 'saving') {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.uploadTitle}>Saving trail...</Text>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.heading}>Trail Details</Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{(distance / 1000).toFixed(1)} km</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>+{Math.round(elevationGain)} m</Text>
                <Text style={styles.statLabel}>Gain</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>-{Math.round(elevationLoss)} m</Text>
                <Text style={styles.statLabel}>Loss</Text>
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
              onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
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
                <TouchableOpacity style={styles.addPhotoBtn} onPress={async () => {
                  const uris = await pickImages(10 - photos.length)
                  setPhotos(prev => [...prev, ...uris])
                }}>
                  <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
                  <Text style={styles.addPhotoLabel}>Add</Text>
                </TouchableOpacity>
              )}
            </View>

            <Button title="Save Trail" onPress={saveTrail} size="lg" style={styles.saveButton} />
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  )
}

function getCenter(points: { lat: number; lng: number }[]) {
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length
  return { lat, lng }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  inner: {
    flex: 1,
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
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  uploadTitle: {
    ...TYPOGRAPHY.heading,
    color: COLORS.text,
    textAlign: 'center',
  },
  uploadSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  scroll: {
    padding: SPACING.md,
    paddingTop: 100,
  },
  heading: {
    ...TYPOGRAPHY.heading,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statValue: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
  },
  statLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.textLight,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  difficultyChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  difficultyChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  difficultyText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  difficultyTextActive: {
    color: COLORS.white,
  },
  saveButton: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  photosRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs,
  },
  photoContainer: {
    width: 80, height: 80, borderRadius: BORDER_RADIUS.md, overflow: 'hidden',
  },
  photoThumb: { width: '100%', height: '100%' },
  removePhoto: { position: 'absolute', top: 2, right: 2 },
  addPhotoBtn: {
    width: 80, height: 80, borderRadius: BORDER_RADIUS.md, borderWidth: 2,
    borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center',
    justifyContent: 'center', backgroundColor: COLORS.surfaceAlt,
  },
  addPhotoLabel: { ...TYPOGRAPHY.small, color: COLORS.primary, marginTop: 2 },
})
