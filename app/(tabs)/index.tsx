import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native'
import { Link, useRouter, useFocusEffect } from 'expo-router'
import { query, orderBy, collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'
import PostCard from '@/components/PostCard'
import Button from '@/components/Button'
import { useAuthStore } from '@/store/authStore'
import { db } from '@/services/firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import type { Post } from '@/types/post'
import type { User } from '@/types/user'

interface PostWithAuthor extends Post {
  author?: { displayName: string; avatarUrl: string | null }
  commentCount?: number
}

export default function FeedScreen() {
  const [posts, setPosts] = useState<PostWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { user } = useAuthStore()

  async function fetchPosts() {
    try {
      console.log('[Feed] Fetching posts...')
      const postsRef = collection(db, FIRESTORE_COLLECTIONS.POSTS)
      const q = query(postsRef, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)

      const postsWithAuthors: PostWithAuthor[] = []

      for (const docSnap of snapshot.docs) {
        const postData = docSnap.data()
        console.log('[Feed] Post:', docSnap.id, postData)

        let author: { displayName: string; avatarUrl: string | null } | undefined
        if (postData.userId) {
          const userDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, postData.userId))
          if (userDoc.exists()) {
            const userData = userDoc.data() as User
            author = { displayName: userData.displayName, avatarUrl: userData.avatarUrl }
          }
        }

        const commentsSnap = await getDocs(collection(db, FIRESTORE_COLLECTIONS.POSTS, docSnap.id, 'comments'))
        const commentCount = commentsSnap.size

        postsWithAuthors.push({
          id: docSnap.id,
          ...postData,
          author,
          commentCount,
        } as PostWithAuthor)
      }

      setPosts(postsWithAuthors)
      console.log('[Feed] Loaded', postsWithAuthors.length, 'posts')
    } catch (err) {
      console.error('[Feed] Error fetching posts:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchPosts()
    }, [])
  )

  async function onRefresh() {
    setRefreshing(true)
    await fetchPosts()
  }

  const router = useRouter()

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TrailConnect</Text>
        <Link href="/post/create" asChild>
          <Button title="+ New Post" variant="outline" size="sm" />
        </Link>
      </View>

      {loading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Loading posts...</Text>
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏔️</Text>
          <Text style={styles.emptyText}>No posts yet</Text>
          <Text style={styles.emptySubtext}>Be the first to share your adventure!</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/post/create')}>
            <Text style={styles.emptyButtonText}>Create Post</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              currentUserId={user?.id}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginTop: SPACING.lg,
  },
  emptyButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.white,
  },
})