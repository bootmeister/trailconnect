import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import * as Google from 'expo-auth-session/providers/google'
import { makeRedirectUri } from 'expo-auth-session'
import { auth, db } from './firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import type { User } from '@/types/user'

export async function signIn(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password)
  await createUserProfile(result.user)
  return result.user
}

export async function signUp(email: string, password: string) {
  const result = await createUserWithEmailAndPassword(auth, email, password)
  await createUserProfile(result.user)
  return result.user
}

export async function signInWithGoogle() {
  const { type, authentication } = await Google.logInAsync({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
    redirectUri: makeRedirectUri(),
  })

  if (type !== 'success') {
    throw new Error('Google sign-in was cancelled')
  }

  const credential = GoogleAuthProvider.credential(authentication?.idToken)
  const result = await signInWithCredential(auth, credential)
  await createUserProfile(result.user)
  return result.user
}

export async function signOut() {
  await firebaseSignOut(auth)
}

export async function updateUserProfile(user: FirebaseUser, displayName: string, photoURL?: string) {
  await updateProfile(user, { displayName, photoURL })
  await createUserProfile(user)
}

export async function createUserProfile(user: FirebaseUser) {
  const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, user.uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    const newUser: User = {
      id: user.uid,
      displayName: user.displayName || 'New Hiker',
      email: user.email || '',
      avatarUrl: user.photoURL || null,
      bio: '',
      location: '',
      joinDate: new Date(),
      stats: {
        totalHikes: 0,
        totalDistance: 0,
        totalElevation: 0,
        trailsCompleted: 0,
        streak: 0,
      },
    }
    await setDoc(userRef, newUser)
  }
}

export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser
}
