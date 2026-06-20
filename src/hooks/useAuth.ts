import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { auth, db } from '@/services/firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types/user'

const CACHED_USER_KEY = 'cached_user'

export function useAuth() {
  const { user, setUser } = useAuthStore()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsInitialized(true)
    }, 10000)

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(timeout)
      try {
        if (firebaseUser) {
          try {
            const userDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, firebaseUser.uid))
            if (userDoc.exists()) {
              const data = userDoc.data() as User
              setUser(data)
              await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(data))
            } else {
              setUser(null)
            }
          } catch {
            const cached = await AsyncStorage.getItem(CACHED_USER_KEY)
            if (cached) {
              try {
                setUser(JSON.parse(cached))
              } catch {
                setUser(null)
              }
            } else {
              setUser(null)
            }
          }
        } else {
          setUser(null)
          await AsyncStorage.removeItem(CACHED_USER_KEY)
        }
      } finally {
        setIsInitialized(true)
      }
    })

    return () => {
      clearTimeout(timeout)
      unsubscribe()
    }
  }, [setUser])

  return { user, isAuthenticated: !!user, isLoading: !isInitialized }
}
