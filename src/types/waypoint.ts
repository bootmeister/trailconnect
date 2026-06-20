export type WaypointType =
  | 'water'
  | 'view'
  | 'camp'
  | 'ruins'
  | 'waterfall'
  | 'trail_issue'
  | 'market'
  | 'summit'
  | 'parking'
  | 'info'
  | 'danger'
  | 'custom'
  | 'crag'
  | 'boulder'
  | 'scramble'

export interface Waypoint {
  id: string
  trailId: string
  lat: number
  lng: number
  ele?: number
  type: WaypointType
  label: string
  note?: string
  mediaUrl?: string
  mediaType?: 'image' | 'video'
  addedBy: string
  addedByName?: string
  createdAt: any
}

export const WAYPOINT_ICONS: Record<WaypointType, string> = {
  water: 'water-outline',
  view: 'eye-outline',
  camp: 'moon-outline',
  ruins: 'business-outline',
  waterfall: 'water-outline',
  trail_issue: 'warning-outline',
  market: 'cart-outline',
  summit: 'flag-outline',
  parking: 'car-outline',
  info: 'information-circle-outline',
  danger: 'alert-circle-outline',
  custom: 'location-outline',
  crag: 'link-outline',
  boulder: 'footsteps-outline',
  scramble: 'diamond-outline',
}

export const WAYPOINT_LABELS: Record<WaypointType, string> = {
  water: 'Water Source',
  view: 'Scenic View',
  camp: 'Campsite',
  ruins: 'Ancient Ruins',
  waterfall: 'Waterfall',
  trail_issue: 'Trail Hard to Find',
  market: 'Market / Supplies',
  summit: 'Summit',
  parking: 'Parking',
  info: 'Information',
  danger: 'Danger / Hazard',
  custom: 'Custom',
  crag: 'Crag',
  boulder: 'Bouldering',
  scramble: 'Scramble',
}

export const WAYPOINT_TYPES: WaypointType[] = [
  'water', 'view', 'camp', 'ruins', 'waterfall', 'trail_issue',
  'market', 'summit', 'parking', 'info', 'danger', 'custom',
  'crag', 'boulder', 'scramble',
]
