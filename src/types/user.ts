export interface User {
  id: string
  displayName: string
  email: string
  avatarUrl: string | null
  bio: string
  location: string
  joinDate: Date
  stats: UserStats
}

export interface UserStats {
  totalHikes: number
  totalDistance: number
  totalElevation: number
  trailsCompleted: number
  streak: number
}

export interface Friend {
  userId: string
  status: 'pending' | 'accepted' | 'blocked'
  since: Date
  addedBy: string
}

export interface Achievement {
  id: string
  badgeId: string
  name: string
  description: string
  icon: string
  earnedAt: Date
}
