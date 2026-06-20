import { collection, getDocs, query, orderBy, doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from './firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import { uploadImage } from './storage'
import type { Waypoint, WaypointType } from '@/types/waypoint'

export async function getWaypoints(trailId: string): Promise<Waypoint[]> {
  const ref = collection(db, FIRESTORE_COLLECTIONS.TRAILS, trailId, 'waypoints')
  const q = query(ref, orderBy('createdAt', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Waypoint)
}

export async function addWaypoint(
  trailId: string,
  data: {
    lat: number
    lng: number
    ele?: number
    type: WaypointType
    label: string
    note?: string
    addedBy: string
    addedByName?: string
    mediaUri?: string
  }
): Promise<string> {
  let mediaUrl: string | undefined
  let mediaType: 'image' | 'video' | undefined

  if (data.mediaUri) {
    const filename = `waypoint_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const path = `trail-media/${trailId}/${filename}`

    const response = await fetch(data.mediaUri)
    const blob = await response.blob()
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, blob)

    mediaUrl = await getDownloadURL(storageRef)
    mediaType = blob.type?.startsWith('video') ? 'video' : 'image'
  }

  const waypointRef = doc(collection(db, FIRESTORE_COLLECTIONS.TRAILS, trailId, 'waypoints'))
  await setDoc(waypointRef, {
    trailId,
    lat: data.lat,
    lng: data.lng,
    ele: data.ele ?? null,
    type: data.type,
    label: data.label,
    note: data.note ?? '',
    mediaUrl: mediaUrl ?? null,
    mediaType: mediaType ?? null,
    addedBy: data.addedBy,
    addedByName: data.addedByName ?? null,
    createdAt: serverTimestamp(),
  })

  return waypointRef.id
}

export function sortWaypointsByRoute(waypoints: Waypoint[], route?: { points: { lat: number; lng: number }[] } | null): Waypoint[] {
  if (!route?.points || route.points.length < 2) return waypoints

  const cumDist = [0]
  for (let i = 1; i < route.points.length; i++) {
    cumDist.push(cumDist[i - 1] + haversine(route.points[i - 1], route.points[i]))
  }

  const withDist = waypoints.map(wp => {
    let minDist = Infinity
    let closestIdx = 0
    for (let i = 0; i < route.points.length; i++) {
      const d = haversine(wp, route.points[i])
      if (d < minDist) {
        minDist = d
        closestIdx = i
      }
    }
    return { wp, dist: cumDist[closestIdx] }
  })

  withDist.sort((a, b) => a.dist - b.dist)
  return withDist.map(w => w.wp)
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export async function deleteWaypoint(trailId: string, waypointId: string, userId: string): Promise<void> {
  const docRef = doc(db, FIRESTORE_COLLECTIONS.TRAILS, trailId, 'waypoints', waypointId)
  const snap = await getDoc(docRef)
  if (!snap.exists()) throw new Error('Waypoint not found')
  const data = snap.data()
  if (data.addedBy !== userId) throw new Error('You can only delete your own waypoints')

  if (data.mediaUrl) {
    try {
      const storageRef = ref(storage, data.mediaUrl)
      await deleteObject(storageRef)
    } catch {}
  }

  await deleteDoc(docRef)
}
