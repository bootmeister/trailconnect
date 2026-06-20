export const APP_NAME = 'TrailConnect'

export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  HIKES: 'hikes',
  POSTS: 'posts',
  TRAILS: 'trails',
  CHATS: 'chats',
  MESSAGES: 'messages',
  EVENTS: 'events',
  LOCATION: 'location',
  SIGHTINGS: 'sightings',
  ACHIEVEMENTS: 'achievements',
  FRIEND_REQUESTS: 'friend_requests',
  LISTS: 'lists',
} as const

export const LOCATION_PERMISSIONS = {
  foreground: 'TrailConnect uses your location to track hikes and show friends.',
  background: 'TrailConnect uses your location to share with emergency contacts.',
} as const

export const MAX_IMAGE_SIZE_MB = 10
export const MAX_POST_IMAGES = 6
export const LOCATION_UPDATE_INTERVAL_MS = 5000
export const DEFAULT_MAP_ZOOM = 12
