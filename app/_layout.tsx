import React from 'react'
import { Stack, Redirect, useSegments } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/services/notifications'
import { useNetwork, useInitOffline } from '@/hooks/useOffline'
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native'
import { COLORS } from '@/utils/theme'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function RootLayout() {
  const { isAuthenticated, isLoading, user } = useAuth()
  const segments = useSegments()

  useNetwork()
  useInitOffline()
  useNotifications(user?.id)

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading TrailConnect...</Text>
      </View>
    )
  }

  const inAuthGroup = segments[0] === '(auth)'

  if (!isAuthenticated && !inAuthGroup) {
    return <Redirect href="/(auth)/login" />
  }

  if (isAuthenticated && inAuthGroup) {
    return <Redirect href="/(tabs)" />
  }

  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="hike" />
        <Stack.Screen name="hikes" />
        <Stack.Screen name="post" />
        <Stack.Screen name="trail/[id]" />
        <Stack.Screen name="trail/add-waypoint/[id]" />
        <Stack.Screen name="trail-map/[id]" />
        <Stack.Screen name="import-gpx" />
        <Stack.Screen name="passport" />
        <Stack.Screen name="downloaded-trails" />
      </Stack>
    </ErrorBoundary>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
})
