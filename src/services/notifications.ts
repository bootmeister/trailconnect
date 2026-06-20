import { useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import Constants from 'expo-constants'

const isExpoGo = Constants.appOwnership === 'expo'

let Notifications: any = null

async function loadNotifications() {
  if (!Notifications) {
    try {
      Notifications = await import('expo-notifications')
      if (Notifications.default?.setNotificationHandler) {
        Notifications.default.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        })
      }
    } catch {
      Notifications = null
    }
  }
  return Notifications
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isExpoGo) return false
  const mod = await loadNotifications()
  if (!mod?.default?.requestPermissionsAsync) return false
  const { status } = await mod.default.requestPermissionsAsync()
  return status === 'granted'
}

export async function getExpoPushToken(): Promise<string | null> {
  if (isExpoGo) return null
  const projectId = Constants.expoConfig?.extra?.eas?.projectId
  if (!projectId) return null
  const mod = await loadNotifications()
  if (!mod?.default?.getExpoPushTokenAsync) return null
  try {
    const { data } = await mod.default.getExpoPushTokenAsync({ projectId })
    return data
  } catch (err) {
    console.log('[Notifications] Push token unavailable:', (err as Error).message)
    return null
  }
}

export async function savePushToken(userId: string, token: string) {
  try {
    await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, userId), {
      pushToken: token,
    })
  } catch (err) {
    console.error('[Notifications] Failed to save push token:', err)
  }
}

export function useNotifications(userId: string | undefined) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null)
  const notificationListener = useRef<{ remove: () => void } | null>(null)
  const responseListener = useRef<{ remove: () => void } | null>(null)

  useEffect(() => {
    if (!userId || isExpoGo) return

    async function setupNotifications() {
      const mod = await loadNotifications()
      if (!mod?.default) return

      const granted = await requestNotificationPermission()
      if (!granted) return

      const token = await getExpoPushToken()
      if (token) {
        setExpoPushToken(token)
        await savePushToken(userId!, token)
      }

      notificationListener.current = mod.default.addNotificationReceivedListener(
        (notification: any) => {
          console.log('[Notifications] Received:', notification)
        }
      )

      responseListener.current = mod.default.addNotificationResponseReceivedListener(
        (response: any) => {
          const data = response.notification.request.content.data
          if (data?.route) {
            const router = require('expo-router')
            router.router.push(data.route)
          }
        }
      )

      if (Platform.OS === 'android' && mod.default.setNotificationChannelAsync) {
        mod.default.setNotificationChannelAsync('default', {
          name: 'default',
          importance: mod.default.AndroidImportance?.MAX ?? 5,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#22C55E',
        })
      }
    }

    setupNotifications()

    return () => {
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [userId])

  return expoPushToken
}
