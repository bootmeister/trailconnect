import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { useAuthStore } from '@/store/authStore'
import { getChats, getOrCreateChat } from '@/services/chatService'
import Avatar from '@/components/Avatar'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'
import { formatDate } from '@/utils/formatting'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import type { User } from '@/types/user'

interface ChatData {
  id: string
  participants: string[]
  type: string
  lastMessage?: { text: string; senderId: string; createdAt: any }
  updatedAt: any
}

interface ChatWithOtherUser extends ChatData {
  otherUser?: { displayName: string; avatarUrl: string | null }
}

export default function ChatsScreen() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [chats, setChats] = useState<ChatWithOtherUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (user) {
      fetchChats()
    }
  }, [user])

  useFocusEffect(
    useCallback(() => {
      fetchChats()
    }, [user])
  )

  async function fetchChats() {
    if (!user) return
    setLoading(true)
    try {
      const chatsList = await getChats(user.id)
      const chatsWithUsers: ChatWithOtherUser[] = []
      for (const chat of chatsList) {
        const otherUserId = chat.participants.find((id: string) => id !== user.id)
        if (otherUserId) {
          const userDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, otherUserId))
          if (userDoc.exists()) {
            const userData = userDoc.data() as User
            chatsWithUsers.push({
              ...chat,
              otherUser: { displayName: userData.displayName, avatarUrl: userData.avatarUrl },
            })
          }
        }
      }
      setChats(chatsWithUsers)
    } catch (err) {
      console.error('[Chats] Error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await fetchChats()
  }

  function renderChat({ item }: { item: ChatWithOtherUser }) {
    const isOwn = item.lastMessage?.senderId === user?.id
    return (
      <TouchableOpacity style={styles.chatItem} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}>
        <Avatar uri={item.otherUser?.avatarUrl} name={item.otherUser?.displayName} size="md" />
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{item.otherUser?.displayName || 'Unknown'}</Text>
            {item.lastMessage && (
              <Text style={styles.chatTime}>{formatDate(item.lastMessage.createdAt)}</Text>
            )}
          </View>
          {item.lastMessage && (
            <Text style={[styles.lastMessage, isOwn && styles.lastMessageOwn]}>
              {isOwn ? 'You: ' : ''}{item.lastMessage.text}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
      </View>

      {loading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Loading chats...</Text>
        </View>
      ) : chats.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>Start a chat with a friend!</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={item => item.id}
          renderItem={renderChat}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.md,
    paddingTop: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    ...TYPOGRAPHY.heading,
    color: COLORS.primary,
  },
  list: {
    padding: SPACING.md,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  chatContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    ...TYPOGRAPHY.bodyBold,
  },
  chatTime: {
    ...TYPOGRAPHY.small,
    color: COLORS.textLight,
  },
  lastMessage: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  lastMessageOwn: {
    fontStyle: 'italic',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.textSecondary,
  },
  emptySubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
})