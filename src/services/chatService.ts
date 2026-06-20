import { doc, getDoc, getDocs, addDoc, updateDoc, collection, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'

export async function getOrCreateChat(userId1: string, userId2: string): Promise<string> {
  const chatsRef = collection(db, FIRESTORE_COLLECTIONS.CHATS)
  const q = query(chatsRef, where('participants', 'array-contains', userId1))
  const snapshot = await getDocs(q)

  for (const chatDoc of snapshot.docs) {
    const data = chatDoc.data()
    if (data.participants.includes(userId2)) {
      return chatDoc.id
    }
  }

  const newChatRef = await addDoc(chatsRef, {
    participants: [userId1, userId2],
    type: 'direct',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessage: null,
  })

  return newChatRef.id
}

export function subscribeToMessages(chatId: string, callback: (messages: any[]) => void) {
  const messagesRef = collection(db, FIRESTORE_COLLECTIONS.CHATS, chatId, 'messages')
  const q = query(messagesRef, orderBy('createdAt', 'asc'))

  return onSnapshot(q, snapshot => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(messages)
  })
}

export async function sendMessage(chatId: string, senderId: string, text: string, location?: { lat: number; lng: number; name?: string }) {
  const messagesRef = collection(db, FIRESTORE_COLLECTIONS.CHATS, chatId, 'messages')
  const chatRef = doc(db, FIRESTORE_COLLECTIONS.CHATS, chatId)

  const messageData: Record<string, any> = {
    senderId,
    text,
    images: [],
    createdAt: serverTimestamp(),
    readBy: [senderId],
  }

  if (location) {
    messageData.location = location
  }

  await addDoc(messagesRef, messageData)

  await updateDoc(chatRef, {
    lastMessage: { text, senderId, createdAt: new Date() },
    updatedAt: serverTimestamp(),
  })
}

export async function getChats(userId: string) {
  const chatsRef = collection(db, FIRESTORE_COLLECTIONS.CHATS)
  const q = query(chatsRef, where('participants', 'array-contains', userId))
  const snapshot = await getDocs(q)
  const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  return chats.sort((a, b) => {
    const aTime = a.updatedAt?.toMillis?.() || 0
    const bTime = b.updatedAt?.toMillis?.() || 0
    return bTime - aTime
  })
}

export async function markAsRead(chatId: string, userId: string, messageIds: string[]) {
  const batch = messageIds.map(id => updateDoc(doc(db, FIRESTORE_COLLECTIONS.CHATS, chatId, 'messages', id), {}))
  await Promise.all(batch)
}