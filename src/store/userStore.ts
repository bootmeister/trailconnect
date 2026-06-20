import { create } from 'zustand'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import type { Friend, Achievement } from '@/types/user'

interface UserState {
  friends: Friend[]
  friendRequests: Friend[]
  achievements: Achievement[]
  isLoading: boolean
  setFriends: (friends: Friend[]) => void
  setFriendRequests: (requests: Friend[]) => void
  setAchievements: (achievements: Achievement[]) => void
  sendFriendRequest: (userId: string) => Promise<void>
  acceptFriendRequest: (userId: string) => Promise<void>
  removeFriend: (userId: string) => Promise<void>
}

export const useUserStore = create<UserState>(set => ({
  friends: [],
  friendRequests: [],
  achievements: [],
  isLoading: false,
  setFriends: (friends) => set({ friends }),
  setFriendRequests: (friendRequests) => set({ friendRequests }),
  setAchievements: (achievements) => set({ achievements }),
  sendFriendRequest: async (userId: string) => {
    set({ isLoading: true })
    // Implementation: add to friend_requests collection
    set({ isLoading: false })
  },
  acceptFriendRequest: async (userId: string) => {
    set({ isLoading: true })
    // Implementation: update friend_requests status to accepted
    set({ isLoading: false })
  },
  removeFriend: async (userId: string) => {
    set({ isLoading: true })
    // Implementation: remove from friends
    set({ isLoading: false })
  },
}))
