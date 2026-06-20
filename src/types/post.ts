export interface Post {
  id: string
  userId: string
  trailId?: string
  hikeId?: string
  images: string[]
  description: string
  location?: {
    lat: number
    lng: number
    name?: string
  }
  timestamp: Date | { seconds: number; nanoseconds: number }
  likes: string[]
  createdAt?: Date | { seconds: number; nanoseconds: number }
}

export interface Comment {
  id: string
  userId: string
  text: string
  timestamp: Date | { seconds: number; nanoseconds: number }
}

export interface TrailSighting {
  id: string
  userId: string
  trailId: string
  type: 'wildlife' | 'landmark' | 'hazard' | 'scenic' | 'water' | 'other'
  title: string
  description: string
  image: string
  location: {
    lat: number
    lng: number
  }
  timestamp: Date
  verified: boolean
}
