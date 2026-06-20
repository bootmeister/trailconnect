import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import * as Location from 'expo-location'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/utils/theme'
import Button from '@/components/Button'
import Input from '@/components/Input'

function formatDate(now: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`
}

const LNT_PRINCIPLES = [
  { icon: 'map-outline', title: 'Plan Ahead & Prepare', text: 'Know regulations, check weather, and pack appropriately.' },
  { icon: 'footsteps-outline', title: 'Travel & Camp on Durable Surfaces', text: 'Stay on trails and camp on designated sites.' },
  { icon: 'trash-outline', title: 'Dispose of Waste Properly', text: 'Pack it in, pack it out. Leave no trash behind.' },
  { icon: 'leaf-outline', title: 'Leave What You Find', text: 'Preserve the past — don\'t pick flowers or move rocks.' },
  { icon: 'flame-outline', title: 'Minimize Campfire Impacts', text: 'Use a camp stove instead of building a fire.' },
  { icon: 'paw-outline', title: 'Respect Wildlife', text: 'Observe from a distance and never feed animals.' },
  { icon: 'people-outline', title: 'Be Considerate of Others', text: 'Yield to others on the trail and keep noise down.' },
]

export default function NewHikeScreen() {
  const [name, setName] = useState('')
  const [defaultName, setDefaultName] = useState('')
  const [showLnt, setShowLnt] = useState(false)
  const [pendingName, setPendingName] = useState('')
  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      const fallback = `Hike - ${formatDate(new Date())}`
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          setDefaultName(fallback)
          return
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
        const geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        })
        const place = geocode?.[0]
        const street = place?.street || place?.name
        const area = [street, place?.district, place?.city].filter(Boolean).join(', ')
        setDefaultName(area ? `Hike, ${area} - ${formatDate(new Date())}` : fallback)
      } catch {
        setDefaultName(fallback)
      }
    })()
  }, [])

  function handleStartHike() {
    const hikeName = name.trim() || defaultName
    setPendingName(hikeName)
    setShowLnt(true)
  }

  function handleProceed() {
    setShowLnt(false)
    router.push({ pathname: '/hike/active', params: { name: pendingName } })
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Start New Hike</Text>
      </View>

      <View style={styles.content}>
        <Input
          label="Hike Name"
          value={name}
          onChangeText={setName}
          placeholder={defaultName || 'Loading location...'}
        />

        <View style={styles.info}>
          <Text style={styles.infoTitle}>During your hike:</Text>
          <View style={styles.infoRow}>
            <Ionicons name="map-outline" size={18} color={COLORS.primary} />
            <Text style={styles.infoText}>Your route will be recorded with GPS</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="analytics-outline" size={18} color={COLORS.primary} />
            <Text style={styles.infoText}>Stats: distance, elevation, pace, duration</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="pause-outline" size={18} color={COLORS.primary} />
            <Text style={styles.infoText}>You can pause and resume anytime</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Button title="Start Hike" onPress={handleStartHike} size="lg" />
      </View>

      <Modal visible={showLnt} transparent animationType="slide" onRequestClose={() => setShowLnt(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="leaf" size={28} color={COLORS.success} />
              <Text style={styles.modalTitle}>Leave No Trace</Text>
              <Text style={styles.modalSubtitle}>7 principles for responsible hiking</Text>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {LNT_PRINCIPLES.map((p, i) => (
                <View key={i} style={styles.principleRow}>
                  <View style={styles.principleIcon}>
                    <Ionicons name={p.icon as any} size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.principleText}>
                    <Text style={styles.principleTitle}>{p.title}</Text>
                    <Text style={styles.principleDesc}>{p.text}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalFooter}>
              <Button title="I Understand, Let's Go!" onPress={handleProceed} size="lg" />
              <Button title="Not Now" variant="ghost" onPress={() => setShowLnt(false)} style={{ marginTop: SPACING.sm }} />
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: SPACING.xxl,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    marginRight: SPACING.md,
    padding: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.heading,
    color: COLORS.primary,
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    flex: 1,
  },
  info: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.lg,
  },
  infoTitle: {
    ...TYPOGRAPHY.bodyBold,
    marginBottom: SPACING.md,
    color: COLORS.text,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    flex: 1,
  },
  actions: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: COLORS.overlay,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xxl,
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    ...TYPOGRAPHY.subheading,
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  modalSubtitle: {
    ...TYPOGRAPHY.small,
    color: COLORS.textLight,
    marginTop: 2,
  },
  modalBody: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  principleRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  principleIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  principleText: {
    flex: 1,
  },
  principleTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  principleDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalFooter: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
  },
})
