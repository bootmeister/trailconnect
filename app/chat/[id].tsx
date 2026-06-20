import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Platform, Keyboard, ScrollView, Dimensions } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { doc, getDoc } from 'firebase/firestore'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { db } from '@/services/firebase'
import { useAuthStore } from '@/store/authStore'
import { subscribeToMessages, sendMessage } from '@/services/chatService'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import Avatar from '@/components/Avatar'
import ChatBubble from '@/components/ChatBubble'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'
import type { User } from '@/types/user'

interface MessageData {
  id: string
  senderId: string
  text: string
  location?: { lat: number; lng: number; name?: string }
  images: string[]
  createdAt: any
}

export default function ChatScreen() {
  const { id: chatId } = useLocalSearchParams<{ id?: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const insets = useSafeAreaInsets()
  const [messages, setMessages] = useState<MessageData[]>([])
  const [otherUser, setOtherUser] = useState<{ displayName: string; avatarUrl: string | null } | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    if (chatId) {
      fetchChatInfo()
    }
  }, [chatId])

  async function fetchChatInfo() {
    if (!chatId || !user) return
    try {
      const chatDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.CHATS, chatId))
      if (chatDoc.exists()) {
        const chatData = chatDoc.data()
        const participants = chatData.participants || []
        const otherId = participants.find((p: string) => p !== user.id)
        if (otherId) {
          const userDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, otherId))
          if (userDoc.exists()) {
            const data = userDoc.data() as User
            setOtherUser({ displayName: data.displayName, avatarUrl: data.avatarUrl })
          }
        }
      }
    } catch (err) {
      console.error('[Chat] Error fetching chat:', err)
    }
  }

  useEffect(() => {
    if (!chatId) return

    const unsubscribe = subscribeToMessages(chatId, (msgs) => {
      setMessages(msgs)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [chatId])

  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true)
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
      }
    )
    const hideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false)
      }
    )

    return () => {
      showListener.remove()
      hideListener.remove()
    }
  }, [])

  async function handleSend() {
    if (!text.trim() || !chatId || !user) return
    try {
      await sendMessage(chatId, user.id, text.trim())
      setText('')
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    } catch (err) {
      console.error('[Chat] Error sending:', err)
    }
  }

  if (!chatId) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.error}>No chat selected</Text>
      </View>
    )
  }

  const bottomPadding = Platform.OS === 'android' && isKeyboardVisible 
    ? 300 
    : (Platform.OS === 'ios' ? Math.max(insets.bottom, SPACING.md) : SPACING.md)

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingTop: SPACING.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Avatar uri={otherUser?.avatarUrl} name={otherUser?.displayName} size="sm" />
        <Text style={styles.headerName}>{otherUser?.displayName || 'Chat'}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ChatBubble message={item} isOwn={item.senderId === user?.id} />
        )}
        contentContainerStyle={[styles.messages, { paddingBottom: SPACING.md }]}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Say hi! 👋</Text>
            </View>
          )
        }
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        }}
        onScrollBeginDrag={() => Keyboard.dismiss()}
        keyboardShouldPersistTaps="handled"
        inverted={false}
      />

      <View style={[styles.inputWrapper, { paddingBottom: bottomPadding }]}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={text}
            onChangeText={setText}
            placeholderTextColor={COLORS.textLight}
            multiline
            scrollEnabled={false}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]} 
            onPress={handleSend} 
            disabled={!text.trim()}
          >
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBack: {
    padding: SPACING.xs,
    marginRight: SPACING.xs,
  },
  backButton: {
    ...TYPOGRAPHY.heading,
    color: COLORS.primary,
  },
  headerName: {
    ...TYPOGRAPHY.bodyBold,
    marginLeft: SPACING.sm,
  },
  messages: {
    padding: SPACING.md,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
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
  inputWrapper: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : SPACING.sm,
    ...TYPOGRAPHY.body,
    minHeight: 44,
    maxHeight: 100,
    marginRight: SPACING.sm,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  sendText: {
    color: COLORS.white,
    ...TYPOGRAPHY.captionBold,
  },
  error: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
})