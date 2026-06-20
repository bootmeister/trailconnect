import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { doc, getDoc } from 'firebase/firestore'
import { Ionicons } from '@expo/vector-icons'
import { db } from '@/services/firebase'
import { addDocument } from '@/services/firestore'
import { uploadMultipleImages } from '@/services/storage'
import { useAuthStore } from '@/store/authStore'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import { postSchema } from '@/utils/validation'
import { formatDistance, formatElevation, formatHikeDuration } from '@/utils/formatting'
import Button from '@/components/Button'
import Input from '@/components/Input'
import { useCamera } from '@/hooks/useCamera'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'
import type { Post } from '@/types/post'

export default function CreatePostScreen() {
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hikePreview, setHikePreview] = useState<{ name: string; distance: number; elevationGain: number; duration: number } | null>(null)
  const [hikeLoading, setHikeLoading] = useState(false)
  const router = useRouter()
  const { user } = useAuthStore()
  const { takePhoto, pickImages } = useCamera()
  const { hikeId } = useLocalSearchParams<{ hikeId?: string }>()

  useEffect(() => {
    if (hikeId) {
      ;(async () => {
        setHikeLoading(true)
        try {
          const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.HIKES, hikeId))
          if (snap.exists()) {
            const data = snap.data()
            const name = data.name || 'Unnamed Hike'
            setDescription(`Just completed "${name}"!`)
            setHikePreview({
              name,
              distance: data.distance || 0,
              elevationGain: data.elevationGain || 0,
              duration: data.duration || 0,
            })
          }
        } catch {} finally {
          setHikeLoading(false)
        }
      })()
    }
  }, [hikeId])

  async function addPhotoFromCamera() {
    const uri = await takePhoto()
    if (uri) {
      setImages(prev => [...prev, uri])
    }
  }

  async function addPhotosFromLibrary() {
    const remaining = 6 - images.length
    if (remaining <= 0) return
    const uris = await pickImages(remaining)
    setImages(prev => [...prev, ...uris])
  }

  async function handlePost() {
    setError('')
    console.log('[Post] Creating post, images:', images.length)
    const validation = postSchema.safeParse({ description, images })
    if (!validation.success) {
      console.log('[Post] Validation failed:', validation.error.errors)
      setError(validation.error.errors[0].message)
      return
    }

    setLoading(true)
    try {
      let imageUrls: string[] = []
      if (images.length > 0 && user) {
        console.log('[Post] Uploading images for user:', user.id)
        imageUrls = await uploadMultipleImages(user.id, images, 'posts')
        console.log('[Post] Uploaded URLs:', imageUrls)
      }

      const post: Partial<Post> = {
        userId: user?.id || '',
        images: imageUrls,
        description,
        hikeId,
        timestamp: new Date(),
        likes: [],
      }

      console.log('[Post] Writing to Firestore...')
      await addDocument(FIRESTORE_COLLECTIONS.POSTS, post)
      console.log('[Post] Post created successfully')
      router.back()
    } catch (err: any) {
      console.error('[Post] Error:', err)
      setError(err.message || 'Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Post</Text>
      </View>

      <View style={styles.form}>
        <Input
          label="What's your trail story?"
          value={description}
          onChangeText={setDescription}
          placeholder="Share your hiking experience..."
          multiline
          numberOfLines={4}
        />

        {hikeLoading && (
          <View style={styles.hikePreview}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}

        {hikePreview && (
          <View style={styles.hikePreview}>
            <View style={styles.hikePreviewHeader}>
              <Ionicons name="walk-outline" size={16} color={COLORS.primary} />
              <Text style={styles.hikePreviewTitle} numberOfLines={1}>{hikePreview.name}</Text>
            </View>
            <View style={styles.hikePreviewStats}>
              <Text style={styles.hikePreviewStat}>{formatDistance(hikePreview.distance)}</Text>
              <Text style={styles.hikePreviewStat}>+{formatElevation(hikePreview.elevationGain)}</Text>
              <Text style={styles.hikePreviewStat}>{formatHikeDuration(hikePreview.duration / 60)}</Text>
            </View>
          </View>
        )}

        <View style={styles.photosSection}>
          <Text style={styles.sectionLabel}>Photos</Text>
          <View style={styles.photosGrid}>
            {images.map((uri, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => setImages(prev => prev.filter((_, i) => i !== index))}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 6 && (
              <>
                <TouchableOpacity style={styles.addPhotoButton} onPress={addPhotoFromCamera}>
                  <Text style={styles.addPhotoText}>📷</Text>
                  <Text style={styles.addPhotoLabel}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addPhotoButton} onPress={addPhotosFromLibrary}>
                  <Text style={styles.addPhotoText}>🖼️</Text>
                  <Text style={styles.addPhotoLabel}>Library</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Button title="Share Post" onPress={handlePost} loading={loading} size="lg" style={styles.postButton} />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.md,
    paddingTop: SPACING.xl,
    backgroundColor: COLORS.surface,
  },
  title: {
    ...TYPOGRAPHY.heading,
    color: COLORS.primary,
  },
  form: {
    padding: SPACING.md,
  },
  hikePreview: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  hikePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  hikePreviewTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text,
    flex: 1,
  },
  hikePreviewStats: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  hikePreviewStat: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  photosSection: {
    marginTop: SPACING.md,
  },
  sectionLabel: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: SPACING.sm,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
  },
  addPhotoText: {
    fontSize: 28,
  },
  addPhotoLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  error: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    marginTop: SPACING.md,
  },
  postButton: {
    marginTop: SPACING.lg,
  },
})
