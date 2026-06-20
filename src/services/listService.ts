import { collection, getDocs, query, orderBy, doc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import type { TrailList } from '@/types/list'

function listsRef(userId: string) {
  return collection(db, FIRESTORE_COLLECTIONS.USERS, userId, FIRESTORE_COLLECTIONS.LISTS)
}

export async function getLists(userId: string): Promise<TrailList[]> {
  const q = query(listsRef(userId), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as TrailList)
}

export async function createList(userId: string, name: string, description?: string): Promise<string> {
  const listRef = doc(listsRef(userId))
  await setDoc(listRef, {
    name: name.trim(),
    description: description?.trim() ?? '',
    trailIds: [],
    createdAt: serverTimestamp(),
  })
  return listRef.id
}

export async function addTrailToList(userId: string, listId: string, trailId: string): Promise<void> {
  const ref = doc(listsRef(userId), listId)
  await updateDoc(ref, { trailIds: arrayUnion(trailId) })
}

export async function removeTrailFromList(userId: string, listId: string, trailId: string): Promise<void> {
  const ref = doc(listsRef(userId), listId)
  await updateDoc(ref, { trailIds: arrayRemove(trailId) })
}

export async function deleteList(userId: string, listId: string): Promise<void> {
  await deleteDoc(doc(listsRef(userId), listId))
}

const MY_HIKES_LIST = 'My Hikes'

export async function ensureMyHikesList(userId: string): Promise<string> {
  const existing = await getLists(userId)
  const found = existing.find(l => l.name === MY_HIKES_LIST)
  if (found) return found.id

  const listRef = doc(listsRef(userId))
  await setDoc(listRef, {
    name: MY_HIKES_LIST,
    description: 'Your recorded hikes',
    trailIds: [],
    createdAt: serverTimestamp(),
  })
  return listRef.id
}
