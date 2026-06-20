import { doc, updateDoc, arrayUnion, arrayRemove, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'

export async function toggleLike(postId: string, userId: string, hasLiked: boolean): Promise<void> {
  const postRef = doc(db, FIRESTORE_COLLECTIONS.POSTS, postId)

  if (hasLiked) {
    await updateDoc(postRef, {
      likes: arrayRemove(userId),
    })
  } else {
    await updateDoc(postRef, {
      likes: arrayUnion(userId),
    })
  }
}

export async function addComment(postId: string, userId: string, text: string): Promise<void> {
  const commentsRef = collection(db, FIRESTORE_COLLECTIONS.POSTS, postId, 'comments')
  await addDoc(commentsRef, {
    userId,
    text,
    createdAt: serverTimestamp(),
  })

  const postRef = doc(db, FIRESTORE_COLLECTIONS.POSTS, postId)
  await updateDoc(postRef, {
    commentCount: arrayUnion(userId),
  })
}

export async function getComments(postId: string): Promise<any[]> {
  const { getDocs, collection: collect } = await import('firebase/firestore')
  const commentsRef = collect(db, FIRESTORE_COLLECTIONS.POSTS, postId, 'comments')
  const snapshot = await getDocs(commentsRef)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}