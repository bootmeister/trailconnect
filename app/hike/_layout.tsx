import React from 'react'
import { Stack } from 'expo-router'

export default function HikeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="new" />
      <Stack.Screen name="active" />
      <Stack.Screen name="publish" />
    </Stack>
  )
}
