export interface HikeEvent {
  id: string
  organizerId: string
  trailId?: string
  name: string
  description: string
  dateTime: Date
  location: {
    lat: number
    lng: number
    name: string
  }
  maxAttendees?: number
  attendees: string[]
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
  chatId: string
  createdAt: Date
}
