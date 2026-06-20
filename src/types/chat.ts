export interface Chat {
  id: string
  participants: string[]
  type: 'direct' | 'group'
  name?: string
  lastMessage: Message | null
  updatedAt: Date
  unreadCount: Record<string, number>
}

export interface Message {
  id: string
  chatId: string
  senderId: string
  text: string
  images: string[]
  location?: {
    lat: number
    lng: number
    name?: string
  }
  timestamp: Date
  readBy: string[]
}
