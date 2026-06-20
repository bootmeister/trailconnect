import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { doc, updateDoc } from 'firebase/firestore'
import { updateProfile as firebaseUpdateProfile } from 'firebase/auth'
import * as ImagePicker from 'expo-image-picker'
import { auth, db } from '@/services/firebase'
import { uploadImage } from '@/services/storage'
import { useAuthStore } from '@/store/authStore'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import Button from '@/components/Button'
import Input from '@/components/Input'
import Avatar from '@/components/Avatar'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'

export default function EditProfileScreen() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [location, setLocation] = useState(user?.location || '')
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  async function handleSave() {
    if (!user || !displayName.trim()) {
      setError('Display name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const currentUser = auth.currentUser
      if (currentUser) {
        let avatarUrl = avatarUri
        if (avatarUri && avatarUri !== user.avatarUrl) {
          avatarUrl = await uploadImage(user.id, avatarUri, 'avatars')
        }
        await firebaseUpdateProfile(currentUser, { displayName: displayName.trim() })
        await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, user.id), {
          displayName: displayName.trim(),
          bio: bio.trim(),
          location: location.trim(),
          avatarUrl,
        })

        setUser({
          ...user,
          displayName: displayName.trim(),
          bio: bio.trim(),
          location: location.trim(),
          avatarUrl,
        })
      }

      router.back()
    } catch (err: any) {
      console.error('[EditProfile] Error:', err)
      setError(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
          <View style={{ width: 60 }} />
        </View>

        <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar}>
          <Avatar uri={avatarUri} name={displayName} size="xl" />
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>Edit</Text>
          </View>
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

          <Button title="Save Changes" onPress={handleSave} loading={loading} size="lg" style={styles.saveButton} />
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    paddingTop: SPACING.xl,
    backgroundColor: COLORS.surface,
  },
  title: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
  },
  cancelButton: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: -10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  editBadgeText: {
    ...TYPOGRAPHY.small,
    color: COLORS.white,
  },
  form: {
    padding: SPACING.md,
  },
  saveButton: {
    marginTop: SPACING.lg,
  },
  error: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    marginTop: SPACING.sm,
  },
})