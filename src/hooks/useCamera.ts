import { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'

export function useCamera() {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function requestCameraPermission() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    console.log('[Camera] Permission status:', status)
    return status === 'granted'
  }

  async function requestMediaPermission() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    console.log('[Media] Permission status:', status)
    return status === 'granted'
  }

  async function takePhoto(): Promise<string | null> {
    try {
      console.log('[Camera] Requesting camera...')
      const granted = await requestCameraPermission()
      if (!granted) {
        setError('Camera permission denied')
        return null
      }

      console.log('[Camera] Launching camera...')
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      })

      console.log('[Camera] Result:', result.canceled, result.assets?.length)
      if (!result.canceled && result.assets.length > 0) {
        return result.assets[0].uri
      }
      return null
    } catch (err) {
      console.error('[Camera] Error:', err)
      setError('Failed to take photo')
      return null
    }
  }

  async function pickImages(maxImages = 6): Promise<string[]> {
    try {
      console.log('[Media] Requesting library...')
      const granted = await requestMediaPermission()
      if (!granted) {
        setError('Photo library permission denied')
        return []
      }

      console.log('[Media] Launching library, max:', maxImages)
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: maxImages,
      })

      console.log('[Media] Result:', result.canceled, result.assets?.length)
      if (!result.canceled) {
        return result.assets.map(asset => asset.uri)
      }
      return []
    } catch (err) {
      console.error('[Media] Error:', err)
      setError('Failed to pick images')
      return []
    }
  }

  return { takePhoto, pickImages, isUploading, error }
}
