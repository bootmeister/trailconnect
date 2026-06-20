import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Image, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { doc, getDoc, collection, getDocs, addDoc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'
import { db } from '@/services/firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import { formatDate } from '@/utils/formatting'
import { toggleLike } from '@/services/postService'
import Avatar from '@/components/Avatar'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types/user'
import type { Comment } from '@/types/post'

interface PostData {
  id: string
  userId: string
  images: string[]
  description: string
  location?: { lat: number; lng: number; name?: string }
  timestamp: any
  likes: string[]
  createdAt: any
}

interface CommentData {
  id: string
  userId: string
  text: string
  createdAt: any
}

interface CommentWithAuthor extends CommentData {
  author?: { displayName: string; avatarUrl: string | null }
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const [post, setPost] = useState<PostData | null>(null)
  const [author, setAuthor] = useState<{ displayName: string; avatarUrl: string | null } | null>(null)
  const [comments, setComments] = useState<CommentWithAuthor[]>([])
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchPost()
  }, [id])

  async function fetchPost() {
    try {
      const postDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.POSTS, id))
      if (!postDoc.exists()) return

      const data = postDoc.data() as PostData
      setPost({ ...data, id: postDoc.id })
      setIsLiked(user ? data.likes.includes(user.id) : false)
      setLikeCount(data.likes.length)

      const userDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, data.userId))
      if (userDoc.exists()) {
        const userData = userDoc.data() as User
        setAuthor({ displayName: userData.displayName, avatarUrl: userData.avatarUrl })
      }

      const commentsSnap = await getDocs(collection(db, FIRESTORE_COLLECTIONS.POSTS, id, 'comments'))
      const commentsData: CommentWithAuthor[] = []
      for (const commentDoc of commentsSnap.docs) {
        const comment = commentDoc.data() as CommentData
        const commentUser = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, comment.userId))
        commentsData.push({
          id: commentDoc.id,
          ...comment,
          author: commentUser.exists()
            ? { displayName: (commentUser.data() as User).displayName, avatarUrl: (commentUser.data() as User).avatarUrl }
            : undefined,
        })
      }
      setComments(commentsData)
    } catch (err) {
      console.error('[PostDetail] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleLike() {
    if (!user || !post) return
    try {
      await toggleLike(post.id, user.id, isLiked)
      setIsLiked(!isLiked)
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)
    } catch (err) {
      console.error('[PostDetail] Error liking:', err)
    }
  }

  async function handleComment() {
    if (!user || !post || !commentText.trim()) return
    setSubmitting(true)
    try {
      const commentsRef = collection(db, FIRESTORE_COLLECTIONS.POSTS, post.id, 'comments')
      await addDoc(commentsRef, {
        userId: user.id,
        text: commentText.trim(),
        createdAt: serverTimestamp(),
      })
      setCommentText('')
      fetchPost()
    } catch (err) {
      console.error('[PostDetail] Error commenting:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    )
  }

  if (!post) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Post not found</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.authorRow}>
          <Avatar uri={author?.avatarUrl} name={author?.displayName} size="md" />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{author?.displayName || 'Unknown'}</Text>
            <Text style={styles.timestamp}>{formatDate(post.timestamp)}</Text>
          </View>
        </View>

        <Text style={styles.description}>{post.description}</Text>

        {post.images.length > 0 && (
          <View style={styles.imagesContainer}>
            {post.images.map((img, idx) => (
              <Image key={idx} source={{ uri: img }} style={styles.image} />
            ))}
          </View>
        )}

        {post.location && (
          <Text style={styles.location}>📍 {post.location.name || `${post.location.lat.toFixed(4)}, ${post.location.lng.toFixed(4)}`}</Text>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Text style={[styles.actionText, isLiked && styles.actionActive]}>
              {isLiked ? '♥' : '♡'} {likeCount}
            </Text>
          </TouchableOpacity>
          <Text style={styles.commentCount}>💬 {comments.length}</Text>
        </View>

        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>Comments</Text>
          {comments.length === 0 ? (
            <Text style={styles.noComments}>No comments yet</Text>
          ) : (
            comments.map(comment => (
              <View key={comment.id} style={styles.commentItem}>
                <Avatar uri={comment.author?.avatarUrl} name={comment.author?.displayName} size="sm" />
                <View style={styles.commentContent}>
                  <Text style={styles.commentAuthor}>{comment.author?.displayName || 'Unknown'}</Text>
                  <Text style={styles.commentText}>{comment.text}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.commentInput}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          value={commentText}
          onChangeText={setCommentText}
          placeholderTextColor={COLORS.textLight}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleComment} disabled={submitting || !commentText.trim()}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loading: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  header: {
    padding: SPACING.md,
    paddingTop: SPACING.xl,
  },
  backButton: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  authorInfo: {
    marginLeft: SPACING.md,
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
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  imagesContainer: {
    paddingHorizontal: SPACING.md,
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  location: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  actionButton: {
    padding: SPACING.sm,
  },
  actionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  actionActive: {
    color: COLORS.error,
  },
  commentCount: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginLeft: SPACING.lg,
  },
  commentsSection: {
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    marginTop: SPACING.md,
  },
  commentsTitle: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: SPACING.md,
  },
  noComments: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  commentContent: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  commentAuthor: {
    ...TYPOGRAPHY.captionBold,
  },
  commentText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
  },
  commentInput: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...TYPOGRAPHY.body,
  },
  sendButton: {
    marginLeft: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
  },
  sendText: {
    color: COLORS.white,
    ...TYPOGRAPHY.captionBold,
  },
})