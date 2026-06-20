import { doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, collection, query, where, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from './firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'

export async function sendFriendRequest(fromUserId: string, toUserId: string): Promise<boolean> {
  const requestRef = collection(db, FIRESTORE_COLLECTIONS.FRIEND_REQUESTS)
  
  const existing = query(
    requestRef,
    where('fromUserId', '==', fromUserId),
    where('toUserId', '==', toUserId),
    where('status', '==', 'pending')
  )
  const snapshot = await getDocs(existing)
  if (!snapshot.empty) return false

  await addDoc(requestRef, {
    fromUserId,
    toUserId,
    status: 'pending',
    createdAt: new Date(),
  })
  return true
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.FRIEND_REQUESTS, requestId), {
    status: 'accepted',
    updatedAt: new Date(),
  })
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.FRIEND_REQUESTS, requestId), {
    status: 'rejected',
    updatedAt: new Date(),
  })
}

export async function getFriendRequests(userId: string) {
  const pendingRef = collection(db, FIRESTORE_COLLECTIONS.FRIEND_REQUESTS)
  const q = query(pendingRef, where('toUserId', '==', userId), where('status', '==', 'pending'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function getFriends(userId: string) {
  const usersRef = collection(db, FIRESTORE_COLLECTIONS.USERS)
  const userDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, userId))
  if (!userDoc.exists()) return []

  const userData = userDoc.data()
  const friendIds = userData.friends || []

  const friends = []
  for (const friendId of friendIds) {
    const friendDoc = await getDoc(doc(usersRef, friendId))
    if (friendDoc.exists()) {
      friends.push({ id: friendDoc.id, ...friendDoc.data() })
    }
  }
  return friends
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, userId), {
    friends: arrayRemove(friendId),
  })
  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, friendId), {
    friends: arrayRemove(userId),
  })
}

export async function getFriendIds(userId: string): Promise<string[]> {
  const userDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, userId))
  if (!userDoc.exists()) return []
  return userDoc.data().friends || []
}

export async function searchUsers(searchTerm: string) {
  if (!searchTerm.trim()) return []
  const usersRef = collection(db, FIRESTORE_COLLECTIONS.USERS)
  const snapshot = await getDocs(usersRef)
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(user => user.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
}

export async function addFriend(userId: string, friendId: string): Promise<void> {
  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, userId), {
    friends: arrayUnion(friendId),
  })
  await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, friendId), {
    friends: arrayUnion(userId),
  })
}