import type { WaypointType } from '@/types/waypoint'

export interface TrackPoint {
  lat: number
  lng: number
  ele: number | null
  timestamp: number
  speed: number | null
  heading: number | null
}

export interface HikeWaypoint {
  lat: number
  lng: number
  ele: number | null
  timestamp: number
  type: WaypointType
  label: string
}

export interface Hike {
  id: string
  userId: string
  trailId?: string
  name: string
  startTime: Date
  endTime?: Date
  trackPoints: TrackPoint[]
  distance: number
  elevationGain: number
  elevationLoss: number
  maxElevation: number
  minElevation: number
  duration: number
  pausedDuration: number
  restedDuration: number
  waypoints: HikeWaypoint[]
  photos: HikePhoto[]
  isActive: boolean
}

export interface HikePhoto {
  uri: string
  timestamp: Date
  lat: number
  lng: number
}

export interface LiveLocation {
  userId: string
  lat: number
  lng: number
  timestamp: Date
  hikeId?: string
  sharingUntil?: Date
  speed?: number
  heading?: number
  displayName?: string
  avatarUrl?: string | null
}

export interface HikeSummary {
  id: string
  name: string
  startTime: Date
  distance: number
  elevationGain: number
  duration: number
  trailId?: string
}
