import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import { useAuthStore } from '@/store/authStore'
import { getFriends, getFriendRequests, searchUsers, sendFriendRequest, acceptFriendRequest, removeFriend, addFriend } from '@/services/friendService'
import { getOrCreateChat } from '@/services/chatService'
import Avatar from '@/components/Avatar'
import Button from '@/components/Button'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'
import type { User } from '@/types/user'

interface FriendRequest {
  id: string
  fromUserId: string
  toUserId: string
  status: string
  fromUser?: { displayName: string; avatarUrl: string | null }
}

export default function FriendsScreen() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [friends, setFriends] = useState<any[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends')

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  async function fetchData() {
    if (!user) return
    setLoading(true)
    try {
      const [friendsList, requestsList] = await Promise.all([
        getFriends(user.id),
        getFriendRequests(user.id),
      ])
      setFriends(friendsList)

      const requestsWithUsers = await Promise.all(
        requestsList.map(async (req) => {
          const { getDoc, doc } = await import('firebase/firestore')
          const fromUserDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, req.fromUserId))
          return {
            ...req,
            fromUser: fromUserDoc.exists() ? { displayName: fromUserDoc.data().displayName, avatarUrl: fromUserDoc.data().avatarUrl } : undefined,
          }
        })
      )
      setRequests(requestsWithUsers)
    } catch (err) {
      console.error('[Friends] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch() {
    if (!search.trim()) return
    try {
      const results = await searchUsers(search)
      setSearchResults(results.filter(r => r.id !== user?.id))
    } catch (err) {
      console.error('[Friends] Search error:', err)
    }
  }

  async function handleSendRequest(toUserId: string) {
    if (!user) return
    try {
      const sent = await sendFriendRequest(user.id, toUserId)
      if (sent) {
        Alert.alert('Success', 'Friend request sent!')
      } else {
        Alert.alert('Already Sent', 'You have already sent a friend request to this user.')
      }
    } catch (err) {
      console.error('[Friends] Send request error:', err)
    }
  }

  async function handleAccept(requestId: string, fromUserId: string) {
    if (!user) return
    try {
      await acceptFriendRequest(requestId)
      await addFriend(user.id, fromUserId)
      fetchData()
    } catch (err) {
      console.error('[Friends] Accept error:', err)
    }
  }

  async function handleRemoveFriend(friendId: string) {
    if (!user) return
    Alert.alert('Remove Friend', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFriend(user.id, friendId)
            fetchData()
          } catch (err) {
            console.error('[Friends] Remove error:', err)
          }
        },
      },
    ])
  }

  function renderFriend({ item }: { item: any }) {
    return (
      <TouchableOpacity style={styles.friendItem} onPress={() => router.push(`/profile/view?id=${item.id}`)}>
        <Avatar uri={item.avatarUrl} name={item.displayName} size="md" />
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.displayName}</Text>
          {item.location && <Text style={styles.friendLocation}>📍 {item.location}</Text>}
        </View>
        <TouchableOpacity style={styles.chatButton} onPress={async () => {
          const chatId = await getOrCreateChat(user!.id, item.id)
          router.push({ pathname: '/chat/[id]', params: { id: chatId } })
        }}>
          <Text style={styles.chatButtonText}>💬</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleRemoveFriend(item.id)}>
          <Text style={styles.removeButton}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }

  function renderRequest({ item }: { item: FriendRequest }) {
    return (
      <View style={styles.requestItem}>
        <Avatar uri={item.fromUser?.avatarUrl} name={item.fromUser?.displayName} size="md" />
        <View style={styles.requestInfo}>
          <Text style={styles.friendName}>{item.fromUser?.displayName || 'Unknown'}</Text>
        </View>
        <Button title="Accept" size="sm" onPress={() => handleAccept(item.id, item.fromUserId)} />
      </View>
    )
  }

  function renderSearchResult({ item }: { item: any }) {
    return (
      <View style={styles.requestItem}>
        <Avatar uri={item.avatarUrl} name={item.displayName} size="md" />
        <View style={styles.requestInfo}>
          <Text style={styles.friendName}>{item.displayName}</Text>
        </View>
        <Button title="Add" size="sm" variant="outline" onPress={() => handleSendRequest(item.id)} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
      </View>

      <View style={styles.tabs}>
        {(['friends', 'requests', 'search'] as const).map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'friends' ? 'Friends' : tab === 'requests' ? `Requests (${requests.length})` : 'Find'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'search' && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            placeholderTextColor={COLORS.textLight}
          />
          <Button title="Search" size="sm" onPress={handleSearch} />
        </View>
      )}

      {loading ? (
        <View style={styles.empty}><Text>Loading...</Text></View>
      ) : activeTab === 'friends' ? (
        friends.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No friends yet</Text>
            <Text style={styles.emptySubtext}>Search for hikers to add!</Text>
          </View>
        ) : (
          <FlatList data={friends} keyExtractor={item => item.id} renderItem={renderFriend} contentContainerStyle={styles.list} />
        )
      ) : activeTab === 'requests' ? (
        requests.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No pending requests</Text>
          </View>
        ) : (
          <FlatList data={requests} keyExtractor={item => item.id} renderItem={renderRequest} contentContainerStyle={styles.list} />
        )
      ) : (
        <FlatList data={searchResults} keyExtractor={item => item.id} renderItem={renderSearchResult} contentContainerStyle={styles.list} />
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
  },
  title: {
    ...TYPOGRAPHY.heading,
    color: COLORS.primary,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    ...TYPOGRAPHY.body,
    marginRight: SPACING.sm,
  },
  list: {
    padding: SPACING.md,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  friendInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  friendName: {
    ...TYPOGRAPHY.bodyBold,
  },
  friendLocation: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  removeButton: {
    ...TYPOGRAPHY.body,
    color: COLORS.textLight,
    padding: SPACING.sm,
  },
  chatButton: {
    padding: SPACING.sm,
  },
  chatButtonText: {
    fontSize: 20,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  requestInfo: {
    flex: 1,
    marginLeft: SPACING.md,
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