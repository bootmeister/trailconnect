import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { FIRESTORE_COLLECTIONS } from '@/utils/constants'
import { COLORS, SPACING, TYPOGRAPHY } from '@/utils/theme'

export default function TrailPassport() {
  const router = useRouter()
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { useAuthStore } = await import('@/store/authStore')
        const user = useAuthStore.getState().user
        if (!user) return
        const hikesRef = collection(db, FIRESTORE_COLLECTIONS.HIKES)
        const q = query(hikesRef, where('userId', '==', user.id))
        const snap = await getDocs(q)
        setCount(snap.size)
      } catch {}
    }
    load()
  }, [])

  return (
    <TouchableOpacity style={styles.cover} onPress={() => router.push('/passport')} activeOpacity={0.85}>
      <View style={styles.coverInner}>
        <View style={styles.emblem}>
          <Ionicons name="compass-outline" size={20} color="#D4AF37" />
        </View>
        <Text style={styles.coverTitle}>PASSPORT</Text>
        <View style={styles.coverLine} />
        <Text style={styles.coverSub}>TrailConnect</Text>
        {count !== null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count} stamp{count !== 1 ? 's' : ''}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#D4AF37" style={{ opacity: 0.6 }} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  cover: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B3A2D',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: 8,
    padding: SPACING.md,
  },
  coverInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emblem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 3,
    color: '#D4AF37',
  },
  coverLine: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(212, 175, 55, 0.3)',
  },
  coverSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },
  badge: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  badgeText: {
    fontSize: 11,
    color: '#D4AF37',
    fontWeight: '600',
  },
})
