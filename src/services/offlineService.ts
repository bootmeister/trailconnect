import AsyncStorage from '@react-native-async-storage/async-storage'
import * as FileSystem from 'expo-file-system/legacy'
import { getTrailById } from './trailService'
import { getWaypoints } from './waypointService'
import type { Trail } from '@/types/trail'
import type { Waypoint } from '@/types/waypoint'

const ASYNC_IDS_KEY = 'offline_trail_ids'
const ASYNC_TRAIL_PREFIX = 'offline_trail_'
const ASYNC_WAYPOINTS_PREFIX = 'offline_waypoints_'
const TRAILS_DIR = 'trails'
const TILES_DIR = 'tiles'

function trailDataKey(id: string) { return `${ASYNC_TRAIL_PREFIX}${id}` }
function waypointsKey(id: string) { return `${ASYNC_WAYPOINTS_PREFIX}${id}` }
function trailPhotosDir(trailId: string) { return `${FileSystem.documentDirectory}${TRAILS_DIR}/${trailId}/photos/` }
function trailTilesDir(trailId: string) { return `${FileSystem.documentDirectory}${TRAILS_DIR}/${trailId}/${TILES_DIR}/` }

// ---------- tile math ----------

function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom)
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n)
  return { x, y }
}

function getBoundingBox(route: Array<{ lat: number; lng: number; ele?: number }>): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
  for (const pt of route) {
    const { lat, lng } = pt
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
  }
  const pad = 0.01
  return { minLat: minLat - pad, maxLat: maxLat + pad, minLng: minLng - pad, maxLng: maxLng + pad }
}

function tilesInBbox(bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number }, zoom: number): Array<{ x: number; y: number }> {
  const nw = latLngToTile(bbox.maxLat, bbox.minLng, zoom)
  const se = latLngToTile(bbox.minLat, bbox.maxLng, zoom)
  const tiles: Array<{ x: number; y: number }> = []
  for (let x = nw.x; x <= se.x; x++) {
    for (let y = nw.y; y <= se.y; y++) {
      tiles.push({ x, y })
    }
  }
  return tiles
}

// ---------- download / remove / read ----------

export async function downloadTrail(trailId: string, onProgress?: (pct: number) => void) {
  onProgress?.(0)

  const trail = await getTrailById(trailId)
  if (!trail) throw new Error('Trail not found')
  onProgress?.(10)

  // save trail json
  await AsyncStorage.setItem(trailDataKey(trailId), JSON.stringify(trail))
  onProgress?.(20)

  // download waypoints
  const waypoints = await getWaypoints(trailId)
  await AsyncStorage.setItem(waypointsKey(trailId), JSON.stringify(waypoints))
  onProgress?.(35)

  // download photos
  const photoUrls = [...(trail.photos || [])]
  for (const wp of waypoints) {
    if (wp.mediaUrl && wp.mediaType === 'image') photoUrls.push(wp.mediaUrl)
  }

  const photosDir = trailPhotosDir(trailId)
  await FileSystem.makeDirectoryAsync(photosDir, { intermediates: true })
  let downloaded = 0
  for (const url of photoUrls) {
    if (!url.startsWith('http')) continue
    try {
      const ext = url.split('?')[0].split('.').pop() || 'jpg'
      const filename = `${downloaded}.${ext}`
      await FileSystem.downloadAsync(url, `${photosDir}${filename}`)
    } catch { /* skip failed photos */ }
    downloaded++
    onProgress?.(35 + Math.min(15, Math.round((downloaded / photoUrls.length) * 15)))
  }
  onProgress?.(50)

  // download map tiles
  const routePoints = trail.route?.points || []
  if (routePoints.length > 0) {
    const bbox = getBoundingBox(routePoints)
    const tilesDir = trailTilesDir(trailId)
    await FileSystem.makeDirectoryAsync(tilesDir, { intermediates: true })
    const zooms = [10, 11, 12, 13, 14, 15, 16]
    let total = 0
    for (const z of zooms) {
      const tiles = tilesInBbox(bbox, z)
      total += tiles.length
    }
    let done = 0
    for (const z of zooms) {
      const tiles = tilesInBbox(bbox, z)
      for (const { x, y } of tiles) {
        const tilePath = `${tilesDir}${z}/${x}/${y}.png`
        const info = await FileSystem.getInfoAsync(tilePath)
        if (!info.exists) {
          try {
            await FileSystem.makeDirectoryAsync(`${tilesDir}${z}/${x}`, { intermediates: true })
            const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
            await FileSystem.downloadAsync(url, tilePath)
          } catch { /* skip failed tile */ }
        }
        done++
        onProgress?.(50 + Math.round((done / total) * 50))
      }
    }
  }
  onProgress?.(100)

  // track id
  const idsRaw = await AsyncStorage.getItem(ASYNC_IDS_KEY)
  const ids: string[] = idsRaw ? JSON.parse(idsRaw) : []
  if (!ids.includes(trailId)) {
    ids.push(trailId)
    await AsyncStorage.setItem(ASYNC_IDS_KEY, JSON.stringify(ids))
  }
}

export async function removeDownloadedTrail(trailId: string) {
  await AsyncStorage.removeItem(trailDataKey(trailId))
  await AsyncStorage.removeItem(waypointsKey(trailId))

  const dirs = [trailPhotosDir(trailId), trailTilesDir(trailId)]
  for (const dir of dirs) {
    try {
      const info = await FileSystem.getInfoAsync(dir)
      if (info.exists) await FileSystem.deleteAsync(dir, { idempotent: true })
    } catch { /* ok */ }
  }

  const idsRaw = await AsyncStorage.getItem(ASYNC_IDS_KEY)
  if (idsRaw) {
    const ids: string[] = JSON.parse(idsRaw)
    await AsyncStorage.setItem(ASYNC_IDS_KEY, JSON.stringify(ids.filter((i) => i !== trailId)))
  }
}

export async function getOfflineTrail(trailId: string): Promise<Trail | null> {
  const raw = await AsyncStorage.getItem(trailDataKey(trailId))
  return raw ? JSON.parse(raw) : null
}

export async function getOfflineWaypoints(trailId: string): Promise<Waypoint[]> {
  const raw = await AsyncStorage.getItem(waypointsKey(trailId))
  return raw ? JSON.parse(raw) : []
}

export async function getAllDownloadedIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(ASYNC_IDS_KEY)
  return raw ? JSON.parse(raw) : []
}

export async function getOfflineTileUrl(trailId: string, z: number, x: number, y: number): Promise<string | null> {
  const tilePath = `${trailTilesDir(trailId)}${z}/${x}/${y}.png`
  const info = await FileSystem.getInfoAsync(tilePath)
  return info.exists ? tilePath : null
}

export async function isTrailDownloaded(trailId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(ASYNC_IDS_KEY)
  if (!raw) return false
  const ids: string[] = JSON.parse(raw)
  return ids.includes(trailId)
}
