import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type QueryConstraint,
  type DocumentData,
} from 'firebase/firestore'
import { db } from './firebase'

export async function getDocument(collectionName: string, docId: string) {
  const docRef = doc(db, collectionName, docId)
  const snap = await getDoc(docRef)
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function setDocument(collectionName: string, docId: string, data: DocumentData) {
  const docRef = doc(db, collectionName, docId)
  await setDoc(docRef, { ...data, updatedAt: new Date() })
}

export async function addDocument(collectionName: string, data: DocumentData) {
  console.log('[Firestore] Adding to', collectionName, JSON.stringify(data).slice(0, 200))
  const colRef = collection(db, collectionName)
  const result = await addDoc(colRef, { ...data, createdAt: new Date(), updatedAt: new Date() })
  console.log('[Firestore] Document created:', result.id)
  return result.id
}

export async function updateDocument(collectionName: string, docId: string, data: Partial<DocumentData>) {
  const docRef = doc(db, collectionName, docId)
  await updateDoc(docRef, { ...data, updatedAt: new Date() })
}

export async function deleteDocument(collectionName: string, docId: string) {
  const docRef = doc(db, collectionName, docId)
  await deleteDoc(docRef)
}

export async function queryDocuments(collectionName: string, constraints: QueryConstraint[]) {
  const colRef = collection(db, collectionName)
  const q = query(colRef, ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export function subscribeToDocument(collectionName: string, docId: string, callback: (data: any) => void) {
  const docRef = doc(db, collectionName, docId)
  return onSnapshot(docRef, snap => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() })
    } else {
      callback(null)
    }
  })
}

export function subscribeToCollection(collectionName: string, constraints: QueryConstraint[], callback: (data: any[]) => void) {
  const colRef = collection(db, collectionName)
  const q = query(colRef, ...constraints)
  return onSnapshot(q, snap => {
    callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
  })
}
