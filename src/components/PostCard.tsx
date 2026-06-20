import React, { useState, useEffect } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getDocs, getDoc, collection, query, limit, orderBy, doc as docRef } from 'firebase/firestore'
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '@/utils/theme'
import { formatDate, formatDistance, formatElevation, formatHikeDuration } from '@/utils/formatting'
import { toggleLike } from '@/services/postService'
import { db } from '@/services/firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import Avatar from './Avatar'
import type { Post } from '@/types/post'

interface Comment {
  id: string
  userId: string
  text: string
  createdAt: any
  authorName?: string
}

interface PostCardProps {
  post: Post & { author?: { displayName: string; avatarUrl: string | null }; commentCount?: number }
  currentUserId?: string
}

export default function PostCard({ post, currentUserId }: PostCardProps) {
  const router = useRouter()
  const [isLiked, setIsLiked] = useState(currentUserId ? post.likes.includes(currentUserId) : false)
  const [likeCount, setLikeCount] = useState(post.likes.length)
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [hikeData, setHikeData] = useState<{ name: string; distance: number; elevationGain: number; duration: number } | null>(null)
  const [hikeLoading, setHikeLoading] = useState(false)

  useEffect(() => {
    if (post.commentCount && post.commentCount > 0) {
      fetchTopComments()
    }
    if (post.hikeId) {
      fetchHikePreview()
    }
  }, [post.id])

  async function fetchHikePreview() {
    setHikeLoading(true)
    try {
      const snap = await getDoc(docRef(db, FIRESTORE_COLLECTIONS.HIKES, post.hikeId!))
      if (snap.exists()) {
        const d = snap.data()
        setHikeData({
          name: d.name || 'Unnamed Hike',
          distance: d.distance || 0,
          elevationGain: d.elevationGain || 0,
          duration: d.duration || 0,
        })
      }
    } catch {} finally {
      setHikeLoading(false)
    }
  }

  async function fetchTopComments() {
    try {
      const commentsRef = collection(db, FIRESTORE_COLLECTIONS.POSTS, post.id, 'comments')
      const q = query(commentsRef, orderBy('createdAt', 'desc'), limit(3))
      const snapshot = await getDocs(q)
      const fetched: Comment[] = []
      for (const d of snapshot.docs) {
        const data = d.data()
        let authorName = 'Unknown'
        if (data.userId) {
          const userDoc = await getDoc(docRef(db, FIRESTORE_COLLECTIONS.USERS, data.userId))
          if (userDoc.exists()) {
            authorName = userDoc.data().displayName || 'Unknown'
          }
        }
        fetched.push({ id: d.id, ...data, authorName } as Comment)
      }
      setComments(fetched.reverse())
    } catch (err) {
      console.error('[PostCard] Error fetching comments:', err)
    }
  }

  async function handleLike() {
    if (!currentUserId || loading) return
    setLoading(true)
    try {
      await toggleLike(post.id, currentUserId, isLiked)
      setIsLiked(!isLiked)
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)
    } catch (err) {
      console.error('[PostCard] Error liking:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push(`/profile/view?id=${post.userId}`)}>
          <Avatar uri={post.author?.avatarUrl} name={post.author?.displayName} size="sm" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.authorName} onPress={() => router.push(`/profile/view?id=${post.userId}`)}>{post.author?.displayName || 'Unknown'}</Text>
          <Text style={styles.timestamp}>{formatDate(post.timestamp)}</Text>
        </View>
      </View>

      <Text style={styles.description}>{post.description}</Text>

      {post.hikeId && hikeLoading && (
        <View style={styles.hikePreview}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      )}

      {post.hikeId && hikeData && (
        <TouchableOpacity style={styles.hikePreview} onPress={() => router.push({ pathname: '/hike/[id]', params: { id: post.hikeId! } })}>
          <View style={styles.hikePreviewHeader}>
            <Ionicons name="walk-outline" size={16} color={COLORS.primary} />
            <Text style={styles.hikePreviewTitle} numberOfLines={1}>{hikeData.name}</Text>
          </View>
          <View style={styles.hikePreviewStats}>
            <Text style={styles.hikePreviewStat}>{formatDistance(hikeData.distance)}</Text>
            <Text style={styles.hikePreviewStat}>+{formatElevation(hikeData.elevationGain)}</Text>
            <Text style={styles.hikePreviewStat}>{formatHikeDuration(hikeData.duration / 60)}</Text>
          </View>
          <Text style={styles.hikePreviewAction}>View hike details →</Text>
        </TouchableOpacity>
      )}

      {post.images.length > 0 && (
        <TouchableOpacity onPress={() => router.push(`/post/${post.id}`)}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: post.images[0] }} style={styles.image} />
          </View>
        </TouchableOpacity>
      )}

      {post.location && (
        <Text style={styles.location}>📍 {post.location.name || `${post.location.lat.toFixed(4)}, ${post.location.lng.toFixed(4)}`}</Text>
      )}

      {comments.length > 0 && (
        <View style={styles.commentsSection}>
          {comments.map(comment => (
            <View key={comment.id} style={styles.commentRow}>
              <Text style={styles.commentText}>
                <Text style={styles.commentAuthor}>{comment.authorName || 'Unknown'}</Text>
                {` ${comment.text}`}
              </Text>
            </View>
          ))}
          {post.commentCount && post.commentCount > 3 && (
            <TouchableOpacity onPress={() => router.push(`/post/${post.id}`)}>
              <Text style={styles.viewAllComments}>
                View all {post.commentCount} comments
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike} disabled={loading}>
          <Text style={[styles.actionText, isLiked && styles.actionActive]}>
            {isLiked ? '♥' : '♡'} {likeCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push(`/post/${post.id}`)}>
          <Text style={styles.actionText}>💬 {post.commentCount ?? 0}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  headerText: {
    marginLeft: SPACING.sm,
  },
  authorName: {
    ...TYPOGRAPHY.bodyBold,
  },
  timestamp: {
    ...TYPOGRAPHY.small,
    color: COLORS.textLight,
  },
  description: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.sm,
  },
  imageContainer: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  image: {
    width: '100%',
    height: 200,
  },
  location: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  hikePreview: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  hikePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  hikePreviewTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text,
    flex: 1,
  },
  hikePreviewStats: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  hikePreviewStat: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  hikePreviewAction: {
    ...TYPOGRAPHY.small,
    color: COLORS.primary,
  },
  commentsSection: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  commentRow: {
    marginBottom: 4,
  },
  commentText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
  },
  commentAuthor: {
    fontWeight: '600',
  },
  viewAllComments: {
    ...TYPOGRAPHY.small,
    color: COLORS.primary,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  actionButton: {
    marginRight: SPACING.lg,
    padding: SPACING.xs,
  },
  actionText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  actionActive: {
    color: COLORS.error,
  },
})