import { collection, getDocs, query, where, orderBy, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import { gpxToRoute } from './gpxParser'
import type { Trail } from '@/types/trail'
import type { TrackPoint } from '@/types/hike'

const SEED_TRAILS: Omit<Trail, 'id'>[] = [
  {
    name: 'Eagle Peak Trail',
    description: 'A challenging hike with panoramic views of Yosemite Valley. The summit offers 360-degree views of the surrounding mountains.',
    location: { lat: 37.8651, lng: -119.5375, address: 'Yosemite National Park, CA' },
    difficulty: 'hard',
    distance: 11200,
    elevationGain: 1050,
    elevationLoss: 1050,
    photos: [],
    rating: 4.8,
    reviewCount: 234,
    tags: ['mountains', 'views', 'wildlife'],
    conditions: { status: 'open', description: 'Trail is clear', reportedBy: 'user1', reportedAt: new Date() },
  },
  {
    name: 'Cascade Falls Loop',
    description: 'An easy family-friendly loop featuring a stunning waterfall and lush forest.',
    location: { lat: 37.7749, lng: -119.4194, address: 'Yosemite National Park, CA' },
    difficulty: 'easy',
    distance: 3200,
    elevationGain: 120,
    elevationLoss: 120,
    photos: [],
    rating: 4.5,
    reviewCount: 567,
    tags: ['waterfall', 'family', 'loop'],
    conditions: { status: 'open', description: 'Trail is clear', reportedBy: 'user2', reportedAt: new Date() },
  },
  {
    name: 'Half Dome Trail',
    description: 'Iconic Yosemite hike with cable ascent to the summit. Strenuous but rewarding with incredible valley views.',
    location: { lat: 37.7458, lng: -119.5339, address: 'Yosemite National Park, CA' },
    difficulty: 'expert',
    distance: 23200,
    elevationGain: 1460,
    elevationLoss: 1460,
    photos: [],
    rating: 4.9,
    reviewCount: 891,
    tags: ['iconic', 'views', 'challenge', 'cables'],
    conditions: { status: 'open', description: 'Permits required. Cables are up.', reportedBy: 'user3', reportedAt: new Date() },
  },
  {
    name: 'Mist Trail',
    description: 'A stunning trail along the Merced River with views of Vernal and Nevada Falls. Prepare to get wet!',
    location: { lat: 37.7272, lng: -119.5444, address: 'Yosemite National Park, CA' },
    difficulty: 'moderate',
    distance: 9600,
    elevationGain: 610,
    elevationLoss: 610,
    photos: [],
    rating: 4.7,
    reviewCount: 678,
    tags: ['waterfall', 'views', 'river'],
    conditions: { status: 'open', description: 'Trail is clear, mist expected', reportedBy: 'user1', reportedAt: new Date() },
  },
  {
    name: 'Taft Point Trail',
    description: 'Short but dramatic hike to a breathtaking overlook of Yosemite Valley with iconic fence rail photo spots.',
    location: { lat: 37.7155, lng: -119.6109, address: 'Yosemite National Park, CA' },
    difficulty: 'easy',
    distance: 3400,
    elevationGain: 210,
    elevationLoss: 210,
    photos: [],
    rating: 4.6,
    reviewCount: 345,
    tags: ['views', 'sunset', 'photography'],
    conditions: { status: 'open', description: 'Trail is clear', reportedBy: 'user2', reportedAt: new Date() },
  },
]

export async function getTrails(filters?: { difficulty?: string; search?: string }): Promise<Trail[]> {
  const trailsRef = collection(db, FIRESTORE_COLLECTIONS.TRAILS)
  const constraints: any[] = []

  if (filters?.difficulty) {
    constraints.push(where('difficulty', '==', filters.difficulty))
  }

  constraints.push(orderBy('rating', 'desc'))

  let snapshot
  try {
    const q = query(trailsRef, ...constraints)
    snapshot = await getDocs(q)
  } catch {
    snapshot = await getDocs(trailsRef)
  }

  if (snapshot.empty) {
    await seedTrails()
    const retry = await getDocs(query(trailsRef, ...constraints))
    return retry.docs.map(d => ({ id: d.id, ...d.data() } as Trail))
  }

  let trails = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Trail))

  if (filters?.search) {
    const term = filters.search.toLowerCase()
    trails = trails.filter(t =>
      t.name.toLowerCase().includes(term) ||
      t.tags.some(tag => tag.includes(term)) ||
      t.description.toLowerCase().includes(term)
    )
  }

  return trails
}

async function seedTrails() {
  const trailsRef = collection(db, FIRESTORE_COLLECTIONS.TRAILS)
  const existing = await getDocs(trailsRef)
  if (!existing.empty) return

  for (const trail of SEED_TRAILS) {
    const docRef = doc(trailsRef)
    await setDoc(docRef, trail)
  }
  console.log('[Trails] Seeded', SEED_TRAILS.length, 'trails')
}

export async function getTrailById(id: string): Promise<Trail | null> {
  const ref = doc(db, FIRESTORE_COLLECTIONS.TRAILS, id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Trail
}

export async function deleteTrail(id: string): Promise<void> {
  const ref = doc(db, FIRESTORE_COLLECTIONS.TRAILS, id)
  await deleteDoc(ref)
}

export async function createTrailFromHike(
  hikeId: string,
  userId: string,
  name: string,
  trackPoints: TrackPoint[],
  distance: number,
  elevationGain: number,
  elevationLoss: number,
  maxElevation: number,
  minElevation: number,
): Promise<string> {
  const trailRef = doc(collection(db, FIRESTORE_COLLECTIONS.TRAILS))
  const startPt = trackPoints[0]
  const trail: Omit<Trail, 'id'> = {
    name,
    description: `Recorded hike on ${new Date().toLocaleDateString()}`,
    location: {
      lat: startPt?.lat ?? 0,
      lng: startPt?.lng ?? 0,
      address: 'Recorded Hike',
    },
    difficulty: 'moderate',
    distance,
    elevationGain,
    elevationLoss,
    route: trackPoints.length > 1 ? gpxToRoute(trackPoints.map(p => ({ lat: p.lat, lng: p.lng, ele: p.ele ?? 0 }))) : undefined,
    photos: [],
    rating: 0,
    reviewCount: 0,
    tags: [],
    uploaderId: userId,
    hikeId,
    isPrivate: false,
    conditions: null,
  }
  await setDoc(trailRef, trail)
  return trailRef.id
}

export async function deleteTrailByHikeId(hikeId: string): Promise<void> {
  const q = query(collection(db, FIRESTORE_COLLECTIONS.TRAILS), where('hikeId', '==', hikeId))
  const snap = await getDocs(q)
  for (const d of snap.docs) {
    await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.TRAILS, d.id))
  }
}
