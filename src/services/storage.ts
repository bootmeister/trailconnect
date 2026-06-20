import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './firebase'
import { MAX_IMAGE_SIZE_MB } from '@/utils/constants'
import * as FileSystem from 'expo-file-system/legacy'

const STORAGE_BUCKET = 'trailconnect-bbf9a.firebasestorage.app'

export async function uploadImage(userId: string, uri: string, folder: string): Promise<string> {
  console.log('[Storage] Uploading image:', uri)
  const fileInfo = await FileSystem.getInfoAsync(uri)
  if (!fileInfo.exists) {
    throw new Error('File does not exist')
  }

  const sizeMB = fileInfo.size / (1024 * 1024)
  if (sizeMB > MAX_IMAGE_SIZE_MB) {
    throw new Error(`Image too large. Maximum size is ${MAX_IMAGE_SIZE_MB}MB`)
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const path = `${folder}/${userId}/${filename}`
  console.log('[Storage] Path:', path)

  const storageRef = ref(storage, path)

  const response = await fetch(uri)
  const blob = await response.blob()

  await uploadBytes(storageRef, blob)
  blob.close()

  const downloadURL = await getDownloadURL(storageRef)
  console.log('[Storage] Upload complete:', downloadURL)
  return downloadURL
}

export async function uploadMultipleImages(userId: string, uris: string[], folder: string): Promise<string[]> {
  console.log('[Storage] Uploading', uris.length, 'images')
  const uploadPromises = uris.map(uri => uploadImage(userId, uri, folder))
  return Promise.all(uploadPromises)
}

export async function deleteImage(url: string): Promise<void> {
  const imageRef = ref(storage, url)
  await deleteObject(imageRef)
}
