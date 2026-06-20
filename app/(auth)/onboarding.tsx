import React, { useState } from 'react'
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, TouchableOpacity } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { doc, updateDoc } from 'firebase/firestore'
import { updateProfile } from 'firebase/auth'
import { auth, db } from '@/services/firebase'
import { uploadImage } from '@/services/storage'
import { profileSchema } from '@/utils/validation'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import Button from '@/components/Button'
import Input from '@/components/Input'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'

export default function OnboardingScreen() {
  const { userId } = useLocalSearchParams()
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [avatarUri, setAvatarUri] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri)
    }
  }

  async function handleComplete() {
    setError('')
    const validation = profileSchema.safeParse({ displayName, bio, location })
    if (!validation.success) {
      setError(validation.error.errors[0].message)
      return
    }

    setLoading(true)
    try {
      const user = auth.currentUser
      if (user) {
        let avatarUrl = avatarUri
        if (avatarUri) {
          avatarUrl = await uploadImage(user.uid, avatarUri, 'avatars')
        }
        await updateProfile(user, { displayName })
        const updateData: Record<string, any> = {
          displayName,
          bio,
          location,
        }
        if (avatarUri) {
          updateData.avatarUrl = avatarUrl
        }
        await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, user.uid), updateData)
      }
      router.replace('/(tabs)')
    } catch (err: any) {
      setError(err.message || 'Failed to complete setup')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>Tell fellow hikers about yourself</Text>
        </View>

        <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>📷</Text>
              <Text style={styles.avatarLabel}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.form}>
          <Input
            label="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your hiking name"
          />
          <Input
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about your hiking adventures..."
            multiline
            numberOfLines={3}
          />
          <Input
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="City, State"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Button title="Start Exploring" onPress={handleComplete} loading={loading} size="lg" style={styles.button} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.xl,
    paddingTop: SPACING.xxl * 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    ...TYPOGRAPHY.heading,
    color: COLORS.primary,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
  },
  avatarLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  form: {
    width: '100%',
  },
  button: {
    marginTop: SPACING.lg,
  },
  error: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    marginBottom: SPACING.md,
  },
})
