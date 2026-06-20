import type { TrailRoute } from '@/services/gpxParser'

export interface Trail {
  id: string
  name: string
  description: string
  location: {
    lat: number
    lng: number
    address: string
  }
  difficulty: 'easy' | 'moderate' | 'hard' | 'expert'
  distance: number
  elevationGain: number
  elevationLoss: number
  route?: TrailRoute
  photos: string[]
  rating: number
  reviewCount: number
  tags: string[]
  uploaderId?: string
  hikeId?: string
  isPrivate?: boolean
  conditions: TrailCondition | null
  weather?: TrailWeather
}

export interface TrailCondition {
  status: 'open' | 'closed' | 'partial' | 'hazard'
  description: string
  reportedBy: string
  reportedAt: Date
}

export interface TrailWeather {
  current: WeatherData
  forecast: WeatherForecast[]
}

export interface WeatherData {
  temp: number
  condition: string
  wind: number
  humidity: number
  precipitation: number
}

export interface WeatherForecast {
  date: Date
  high: number
  low: number
  condition: string
  precipitation: number
}
