import { create } from 'zustand'
import type { Hike, TrackPoint, HikeWaypoint, LiveLocation } from '@/types/hike'

interface HikeState {
  activeHike: Hike | null
  isTracking: boolean
  paused: boolean
  elapsedMs: number
  trackPoints: TrackPoint[]
  hikeWaypoints: HikeWaypoint[]
  liveLocations: Record<string, LiveLocation>

  setTracking: (tracking: boolean) => void
  setActiveHike: (hike: Hike | null) => void
  setPaused: (paused: boolean) => void
  setElapsedMs: (ms: number) => void
  addTrackPoint: (point: TrackPoint) => void
  addHikeWaypoint: (wp: HikeWaypoint) => void
  resetTracking: () => void
  updateLiveLocation: (userId: string, location: LiveLocation) => void
  clearLiveLocations: () => void
  removeLiveLocation: (userId: string) => void
}

export const useHikeStore = create<HikeState>(set => ({
  activeHike: null,
  isTracking: false,
  paused: false,
  elapsedMs: 0,
  trackPoints: [],
  hikeWaypoints: [],
  liveLocations: {},

  setTracking: (tracking) => set({ isTracking: tracking }),
  setActiveHike: (hike) => set({ activeHike: hike }),
  setPaused: (paused) => set({ paused }),
  setElapsedMs: (ms) => set({ elapsedMs: ms }),
  addTrackPoint: (point) =>
    set(state => ({ trackPoints: [...state.trackPoints, point] })),
  addHikeWaypoint: (wp) =>
    set(state => ({ hikeWaypoints: [...state.hikeWaypoints, wp] })),
  resetTracking: () =>
    set({
      activeHike: null,
      isTracking: false,
      paused: false,
      elapsedMs: 0,
      trackPoints: [],
      hikeWaypoints: [],
    }),
  updateLiveLocation: (userId, location) =>
    set(state => ({
      liveLocations: { ...state.liveLocations, [userId]: location },
    })),
  clearLiveLocations: () => set({ liveLocations: {} }),
  removeLiveLocation: (userId) =>
    set(state => {
      const newLocations = { ...state.liveLocations }
      delete newLocations[userId]
      return { liveLocations: newLocations }
    }),
}))
