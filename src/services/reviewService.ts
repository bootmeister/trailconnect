import { collection, getDocs, query, orderBy, limit, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'

export interface TrailReview {
  id: string
  trailId: string
  userId: string
  userName: string
  userAvatar: string | null
  rating: number
  text: string
  createdAt: any
}

export async function getReviews(trailId: string): Promise<TrailReview[]> {
  const ref = collection(db, FIRESTORE_COLLECTIONS.TRAILS, trailId, 'reviews')
  const q = query(ref, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as TrailReview)
}

export async function addReview(trailId: string, data: {
  userId: string
  userName: string
  userAvatar: string | null
  rating: number
  text: string
}) {
  const ref = doc(collection(db, FIRESTORE_COLLECTIONS.TRAILS, trailId, 'reviews'))
  await setDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}
